package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"path"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const securityPolicy = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"

var hostnamePattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$`)

type atlasServer struct {
	public       fs.FS
	sources      []discoverySource
	allowedHosts map[string]bool
	apiToken     string
	httpClient   *http.Client
}

func newAtlasServer(public fs.FS) (*atlasServer, error) {
	sources, err := loadDiscoverySources()
	if err != nil {
		return nil, err
	}
	allowed, remote, err := allowedHostSet(os.Getenv("ATLAS_ALLOWED_HOSTS"))
	if err != nil {
		return nil, err
	}
	token := os.Getenv("ATLAS_API_TOKEN")
	if token != "" && len(token) < 32 {
		return nil, errors.New("ATLAS_API_TOKEN must be at least 32 characters")
	}
	if remote && token == "" {
		return nil, errors.New("ATLAS_API_TOKEN is required when ATLAS_ALLOWED_HOSTS includes a non-loopback host")
	}
	transport := &http.Transport{
		Proxy:                 nil,
		TLSHandshakeTimeout:   5 * time.Second,
		ResponseHeaderTimeout: 8 * time.Second,
	}
	return &atlasServer{
		public: public, sources: sources, allowedHosts: allowed, apiToken: token,
		httpClient: &http.Client{
			Transport:     transport,
			Timeout:       12 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse },
		},
	}, nil
}

func allowedHostSet(raw string) (map[string]bool, bool, error) {
	if strings.TrimSpace(raw) == "" {
		raw = "localhost,127.0.0.1,::1"
	}
	result := make(map[string]bool)
	remote := false
	for _, value := range strings.Split(raw, ",") {
		host := strings.ToLower(strings.TrimSpace(value))
		if host == "" || strings.ContainsAny(host, "/?#@") {
			return nil, false, errors.New("ATLAS_ALLOWED_HOSTS contains an invalid hostname")
		}
		if strings.HasPrefix(host, "[") && strings.HasSuffix(host, "]") {
			host = strings.TrimSuffix(strings.TrimPrefix(host, "["), "]")
		}
		if strings.Contains(host, ":") && net.ParseIP(host) == nil {
			return nil, false, errors.New("ATLAS_ALLOWED_HOSTS entries must not include ports")
		}
		if net.ParseIP(host) == nil && !hostnamePattern.MatchString(host) {
			return nil, false, errors.New("ATLAS_ALLOWED_HOSTS contains an invalid hostname")
		}
		result[host] = true
		remote = remote || !isLoopbackHost(host)
	}
	return result, remote, nil
}

func (server *atlasServer) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	setSecurityHeaders(writer.Header())
	switch {
	case request.URL.Path == "/healthz":
		serveHealth(writer, request)
	case request.URL.Path == "/api/discovery/sources":
		server.serveSources(writer, request)
	case request.URL.Path == "/api/discovery/scan":
		server.serveScan(writer, request)
	default:
		server.serveStatic(writer, request)
	}
}

func setSecurityHeaders(header http.Header) {
	header.Set("Content-Security-Policy", securityPolicy)
	header.Set("X-Content-Type-Options", "nosniff")
	header.Set("Referrer-Policy", "no-referrer")
	header.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
	header.Set("Cross-Origin-Resource-Policy", "same-origin")
}

func serveHealth(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet && request.Method != http.MethodHead {
		methodNotAllowed(writer, "GET, HEAD")
		return
	}
	writeBody(writer, request, http.StatusOK, "text/plain; charset=utf-8", []byte("ok\n"))
}

func (server *atlasServer) serveStatic(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet && request.Method != http.MethodHead {
		methodNotAllowed(writer, "GET, HEAD")
		return
	}
	if request.URL.RawPath != "" || strings.Contains(request.URL.EscapedPath(), "%2e") || strings.Contains(request.URL.EscapedPath(), "%2E") {
		http.NotFound(writer, request)
		return
	}
	cleaned := path.Clean(request.URL.Path)
	if cleaned != request.URL.Path && !(request.URL.Path == "/" && cleaned == "/") || strings.Contains(cleaned, "\\") {
		http.NotFound(writer, request)
		return
	}
	name := strings.TrimPrefix(cleaned, "/")
	if name == "" {
		name = "index.html"
	}
	info, err := fs.Stat(server.public, name)
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(writer, request)
		return
	}
	data, err := fs.ReadFile(server.public, name)
	if err != nil {
		http.NotFound(writer, request)
		return
	}
	contentType := mime.TypeByExtension(path.Ext(name))
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	writer.Header().Set("Content-Type", contentType)
	http.ServeContent(writer, request, name, info.ModTime(), bytes.NewReader(data))
}

func (server *atlasServer) authorizeAPI(writer http.ResponseWriter, request *http.Request) bool {
	writer.Header().Set("Cache-Control", "no-store")
	if request.Method == http.MethodOptions {
		http.Error(writer, "cross-origin requests are not allowed", http.StatusForbidden)
		return false
	}
	if request.Header.Get("X-Atlas-Request") != "1" {
		http.Error(writer, "missing request header", http.StatusForbidden)
		return false
	}
	host := request.Host
	if parsed, _, err := net.SplitHostPort(host); err == nil {
		host = parsed
	} else if strings.HasPrefix(host, "[") && strings.HasSuffix(host, "]") {
		host = strings.TrimSuffix(strings.TrimPrefix(host, "["), "]")
	}
	if !server.allowedHosts[strings.ToLower(host)] {
		http.Error(writer, "request host is not allowed", http.StatusForbidden)
		return false
	}
	if origin := request.Header.Get("Origin"); origin != "" {
		parsed, err := url.Parse(origin)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || !strings.EqualFold(parsed.Host, request.Host) || parsed.User != nil || parsed.Path != "" || parsed.RawQuery != "" || parsed.Fragment != "" {
			http.Error(writer, "request origin does not match", http.StatusForbidden)
			return false
		}
	}
	if server.apiToken != "" && !constantTokenMatch(request.Header.Get("Authorization"), server.apiToken) {
		writer.Header().Set("WWW-Authenticate", `Bearer realm="Homelab Atlas"`)
		http.Error(writer, "authentication required", http.StatusUnauthorized)
		return false
	}
	return true
}

func constantTokenMatch(header, token string) bool {
	provided := sha256.Sum256([]byte(header))
	wanted := sha256.Sum256([]byte("Bearer " + token))
	return subtle.ConstantTimeCompare(provided[:], wanted[:]) == 1
}

func (server *atlasServer) serveSources(writer http.ResponseWriter, request *http.Request) {
	if !server.authorizeAPI(writer, request) {
		return
	}
	if request.Method != http.MethodGet {
		methodNotAllowed(writer, http.MethodGet)
		return
	}
	type publicSource struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	items := make([]publicSource, len(server.sources))
	for index, source := range server.sources {
		items[index] = publicSource{ID: source.ID, Name: source.Name}
	}
	writeJSON(writer, request, http.StatusOK, items)
}

func (server *atlasServer) serveScan(writer http.ResponseWriter, request *http.Request) {
	if !server.authorizeAPI(writer, request) {
		return
	}
	if request.Method != http.MethodPost {
		methodNotAllowed(writer, http.MethodPost)
		return
	}
	if media := strings.TrimSpace(strings.Split(request.Header.Get("Content-Type"), ";")[0]); media != "application/json" {
		http.Error(writer, "Content-Type must be application/json", http.StatusUnsupportedMediaType)
		return
	}
	data, err := io.ReadAll(io.LimitReader(request.Body, 4097))
	if err != nil || len(data) > 4096 {
		http.Error(writer, "invalid request", http.StatusBadRequest)
		return
	}
	var input struct {
		SourceID string `json:"sourceId"`
	}
	if err := decodeStrict(data, &input); err != nil || !idPattern.MatchString(input.SourceID) {
		http.Error(writer, "invalid request", http.StatusBadRequest)
		return
	}
	var source *discoverySource
	for index := range server.sources {
		if server.sources[index].ID == input.SourceID {
			source = &server.sources[index]
			break
		}
	}
	if source == nil {
		http.Error(writer, "unknown discovery source", http.StatusNotFound)
		return
	}
	snapshot, err := server.fetchSnapshot(request.Context(), *source)
	if err != nil {
		log.Printf("discovery source %s failed: %v", source.ID, err)
		http.Error(writer, "discovery source is unavailable", http.StatusBadGateway)
		return
	}
	writeJSON(writer, request, http.StatusOK, snapshot)
}

func (server *atlasServer) fetchSnapshot(ctx context.Context, source discoverySource) (discoverySnapshot, error) {
	ctx, cancel := context.WithTimeout(ctx, 12*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, source.URL, nil)
	if err != nil {
		return discoverySnapshot{}, errors.New("invalid configured request")
	}
	request.Header.Set("Authorization", "Bearer "+source.token)
	response, err := server.httpClient.Do(request)
	if err != nil {
		return discoverySnapshot{}, errors.New("collector request failed")
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return discoverySnapshot{}, errors.New("collector returned an error")
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, maxSnapshotBytes+1))
	if err != nil || len(data) > maxSnapshotBytes {
		return discoverySnapshot{}, errors.New("collector response was too large")
	}
	return decodeSnapshot(data, source.ID)
}

func methodNotAllowed(writer http.ResponseWriter, allow string) {
	writer.Header().Set("Allow", allow)
	http.Error(writer, "method not allowed", http.StatusMethodNotAllowed)
}

func writeJSON(writer http.ResponseWriter, request *http.Request, status int, value any) {
	data, err := json.Marshal(value)
	if err != nil {
		http.Error(writer, "response encoding failed", http.StatusInternalServerError)
		return
	}
	data = append(data, '\n')
	writeBody(writer, request, status, "application/json; charset=utf-8", data)
}

func writeBody(writer http.ResponseWriter, request *http.Request, status int, contentType string, data []byte) {
	writer.Header().Set("Content-Type", contentType)
	writer.Header().Set("Content-Length", strconv.Itoa(len(data)))
	writer.WriteHeader(status)
	if request.Method != http.MethodHead {
		_, _ = writer.Write(data)
	}
}

func serve(address string, public fs.FS) error {
	handler, err := newAtlasServer(public)
	if err != nil {
		return err
	}
	server := &http.Server{
		Addr:              address,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	log.Printf("Homelab Atlas: http://%s", address)
	return server.ListenAndServe()
}

func collectorHandler(token string) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("X-Content-Type-Options", "nosniff")
		switch request.URL.Path {
		case "/healthz":
			serveHealth(writer, request)
		case "/inventory":
			writer.Header().Set("Cache-Control", "no-store")
			if request.Method != http.MethodGet {
				methodNotAllowed(writer, http.MethodGet)
				return
			}
			if !constantTokenMatch(request.Header.Get("Authorization"), token) {
				writer.Header().Set("WWW-Authenticate", `Bearer realm="Homelab Atlas collector"`)
				http.Error(writer, "authentication required", http.StatusUnauthorized)
				return
			}
			ctx, cancel := context.WithTimeout(request.Context(), 12*time.Second)
			defer cancel()
			snapshot, err := collectDocker(ctx)
			if err != nil {
				log.Printf("Docker collection failed: %v", err)
				http.Error(writer, "inventory collection failed", http.StatusBadGateway)
				return
			}
			writeJSON(writer, request, http.StatusOK, snapshot)
		default:
			http.NotFound(writer, request)
		}
	})
}

func serveCollector(address string) error {
	token := os.Getenv("ATLAS_COLLECTOR_TOKEN")
	if len(token) < 32 {
		return errors.New("ATLAS_COLLECTOR_TOKEN must be configured with at least 32 characters")
	}
	server := &http.Server{
		Addr: address, Handler: collectorHandler(token), ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout: 15 * time.Second, WriteTimeout: 20 * time.Second, IdleTimeout: 60 * time.Second,
	}
	log.Printf("Homelab Atlas collector listening on %s", address)
	return server.ListenAndServe()
}

func listenAddress(host, port string) (string, error) {
	value, err := strconv.Atoi(port)
	if err != nil || value < 0 || value > 65535 {
		return "", fmt.Errorf("PORT must be a number from 0 through 65535")
	}
	return net.JoinHostPort(host, strconv.Itoa(value)), nil
}
