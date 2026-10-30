package main

import (
	"bytes"
	"compress/gzip"
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
	"net/netip"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

const securityPolicy = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"

// ingressSecurityPolicy lets Home Assistant embed Atlas in its own same-origin ingress iframe.
const ingressSecurityPolicy = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'"

const maxProjectBytes = 16 << 20

var hostnamePattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$`)

type atlasServer struct {
	assets       map[string]staticAsset
	assetPrefix  string
	sources      []discoverySource
	allowedHosts map[string]bool
	apiToken     string
	httpClient   *http.Client
	nmap         *nmapScanner
	ingressPeers map[string]bool
	dataDir      string
}

type staticAsset struct {
	contentType string
	raw         staticRepresentation
	compressed  staticRepresentation
}

type staticRepresentation struct {
	data []byte
	etag string
}

func newAtlasServer(public fs.FS) (*atlasServer, error) {
	assets, assetPrefix, err := loadStaticAssets(public)
	if err != nil {
		return nil, err
	}
	sources, err := loadDiscoverySources()
	if err != nil {
		return nil, err
	}
	nmapScanner, err := newNmapScanner(os.Getenv("ATLAS_NMAP_ALLOWED_CIDRS"))
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
	ingress, err := ingressPeerSet(os.Getenv("ATLAS_INGRESS_PROXY"))
	if err != nil {
		return nil, err
	}
	dataDir := os.Getenv("ATLAS_DATA_DIR")
	if dataDir != "" {
		if info, err := os.Stat(dataDir); err != nil || !info.IsDir() {
			return nil, errors.New("ATLAS_DATA_DIR must name an existing directory")
		}
	}
	if remote && token == "" && ingress == nil {
		return nil, errors.New("ATLAS_API_TOKEN is required when ATLAS_ALLOWED_HOSTS includes a non-loopback host")
	}
	transport := &http.Transport{
		Proxy:                 nil,
		TLSHandshakeTimeout:   5 * time.Second,
		ResponseHeaderTimeout: 8 * time.Second,
	}
	return &atlasServer{
		assets: assets, assetPrefix: assetPrefix, sources: sources, allowedHosts: allowed, apiToken: token, nmap: nmapScanner,
		ingressPeers: ingress, dataDir: dataDir,
		httpClient: &http.Client{
			Transport:     transport,
			Timeout:       12 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse },
		},
	}, nil
}

func loadStaticAssets(public fs.FS) (map[string]staticAsset, string, error) {
	fingerprint, err := staticAssetFingerprint(public)
	if err != nil {
		return nil, "", fmt.Errorf("could not fingerprint embedded assets: %w", err)
	}
	assetPrefix := "/assets/" + fingerprint + "/"
	assets := make(map[string]staticAsset)
	var writer *gzip.Writer
	err = fs.WalkDir(public, ".", func(name string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}
		data, err := fs.ReadFile(public, name)
		if err != nil {
			return err
		}
		if name == "index.html" {
			for _, replacement := range [][2]string{
				{`href="styles.css"`, `href="` + strings.TrimPrefix(assetPrefix, "/") + `styles.css"`},
				{`src="app.js"`, `src="` + strings.TrimPrefix(assetPrefix, "/") + `app.js"`},
			} {
				if bytes.Count(data, []byte(replacement[0])) != 1 {
					return fmt.Errorf("index.html must contain exactly one %s", replacement[0])
				}
				data = bytes.Replace(data, []byte(replacement[0]), []byte(replacement[1]), 1)
			}
		}
		contentType := mime.TypeByExtension(path.Ext(name))
		if contentType == "" {
			contentType = http.DetectContentType(data)
		}
		asset := staticAsset{contentType: contentType, raw: makeRepresentation(data)}
		if compressible(contentType) {
			var buffer bytes.Buffer
			if writer == nil {
				writer = gzip.NewWriter(&buffer)
			} else {
				writer.Reset(&buffer)
			}
			if _, err := writer.Write(data); err != nil {
				return err
			}
			if err := writer.Close(); err != nil {
				return err
			}
			if buffer.Len() < len(data) {
				asset.compressed = makeRepresentation(buffer.Bytes())
			}
		}
		assets[name] = asset
		return nil
	})
	if err != nil {
		return nil, "", fmt.Errorf("could not prepare embedded assets: %w", err)
	}
	return assets, assetPrefix, nil
}

func staticAssetFingerprint(public fs.FS) (string, error) {
	var names []string
	if err := fs.WalkDir(public, ".", func(name string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !entry.IsDir() && (path.Ext(name) == ".js" || path.Ext(name) == ".css") {
			names = append(names, name)
		}
		return nil
	}); err != nil {
		return "", err
	}
	sort.Strings(names)
	digest := sha256.New()
	for _, name := range names {
		data, err := fs.ReadFile(public, name)
		if err != nil {
			return "", err
		}
		fmt.Fprintf(digest, "%d:%s:%d:", len(name), name, len(data))
		if _, err := digest.Write(data); err != nil {
			return "", err
		}
	}
	return fmt.Sprintf("%x", digest.Sum(nil))[:16], nil
}

func makeRepresentation(data []byte) staticRepresentation {
	digest := sha256.Sum256(data)
	return staticRepresentation{data: data, etag: fmt.Sprintf(`"%x"`, digest)}
}

func compressible(contentType string) bool {
	mediaType, _, _ := mime.ParseMediaType(contentType)
	return strings.HasPrefix(mediaType, "text/") || mediaType == "application/javascript" || mediaType == "application/json" || mediaType == "image/svg+xml"
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

// ingressPeerSet parses the proxy addresses allowed to reach Atlas when it runs behind Home Assistant ingress.
func ingressPeerSet(raw string) (map[string]bool, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	result := make(map[string]bool)
	for _, value := range strings.Split(raw, ",") {
		parsed, err := netip.ParseAddr(strings.TrimSpace(value))
		if err != nil {
			return nil, errors.New("ATLAS_INGRESS_PROXY must be a comma-separated list of IP addresses")
		}
		result[parsed.Unmap().String()] = true
	}
	return result, nil
}

func (server *atlasServer) fromIngress(request *http.Request) bool {
	host, _, err := net.SplitHostPort(request.RemoteAddr)
	if err != nil {
		return false
	}
	parsed, err := netip.ParseAddr(host)
	return err == nil && server.ingressPeers[parsed.Unmap().String()]
}

func (server *atlasServer) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	setSecurityHeaders(writer.Header())
	if server.ingressPeers != nil {
		writer.Header().Set("Content-Security-Policy", ingressSecurityPolicy)
		if !server.fromIngress(request) && !(request.URL.Path == "/healthz" && isLoopbackRemote(request)) {
			http.Error(writer, "open Homelab Atlas from the Home Assistant sidebar", http.StatusForbidden)
			return
		}
	}
	switch {
	case request.URL.Path == "/healthz":
		serveHealth(writer, request)
	case request.URL.Path == "/api/project" && server.dataDir != "":
		server.serveProject(writer, request)
	case request.URL.Path == "/api/discovery/sources":
		server.serveSources(writer, request)
	case request.URL.Path == "/api/discovery/scan":
		server.serveScan(writer, request)
	case request.URL.Path == "/api/discovery/nmap":
		server.serveNmapImport(writer, request)
	case request.URL.Path == "/api/discovery/nmap/status":
		server.serveNmapStatus(writer, request)
	case request.URL.Path == "/api/discovery/nmap/scan":
		server.serveNmapScan(writer, request)
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
	if strings.HasPrefix(cleaned, "/assets/") {
		if server.assetPrefix == "" || !strings.HasPrefix(cleaned, server.assetPrefix) {
			http.NotFound(writer, request)
			return
		}
		name = strings.TrimPrefix(cleaned, server.assetPrefix)
	}
	if name == "" {
		name = "index.html"
	}
	asset, ok := server.assets[name]
	if !ok {
		http.NotFound(writer, request)
		return
	}
	representation := asset.raw
	if len(asset.compressed.data) > 0 && acceptsGzip(request.Header.Get("Accept-Encoding")) {
		representation = asset.compressed
		writer.Header().Set("Content-Encoding", "gzip")
	}
	writer.Header().Set("Cache-Control", "no-cache")
	writer.Header().Set("Content-Type", asset.contentType)
	writer.Header().Set("Content-Length", strconv.Itoa(len(representation.data)))
	writer.Header().Set("ETag", representation.etag)
	writer.Header().Set("Vary", "Accept-Encoding")
	http.ServeContent(writer, request, name, time.Time{}, bytes.NewReader(representation.data))
}

func acceptsGzip(header string) bool {
	wildcard := false
	for _, item := range strings.Split(header, ",") {
		parts := strings.Split(item, ";")
		encoding := strings.ToLower(strings.TrimSpace(parts[0]))
		quality := 1.0
		for _, parameter := range parts[1:] {
			key, value, found := strings.Cut(strings.TrimSpace(parameter), "=")
			if !found || !strings.EqualFold(key, "q") {
				continue
			}
			parsed, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
			if err != nil || parsed < 0 || parsed > 1 {
				quality = 0
			} else {
				quality = parsed
			}
		}
		if encoding == "gzip" {
			return quality > 0
		}
		if encoding == "*" {
			wildcard = quality > 0
		}
	}
	return wildcard
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
	requestHost := request.Host
	if server.ingressPeers != nil {
		// Home Assistant authenticates the user and proxies every request, so the browser-facing
		// host is reported by the proxy instead of matching a fixed allowlist.
		if forwarded := request.Header.Get("X-Forwarded-Host"); forwarded != "" {
			requestHost = forwarded
		}
	} else if !server.allowedRequestHost(requestHost) {
		http.Error(writer, "request host is not allowed", http.StatusForbidden)
		return false
	}
	if origin := request.Header.Get("Origin"); origin != "" {
		parsed, err := url.Parse(origin)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || !strings.EqualFold(parsed.Host, requestHost) || parsed.User != nil || parsed.Path != "" || parsed.RawQuery != "" || parsed.Fragment != "" {
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

func (server *atlasServer) allowedRequestHost(host string) bool {
	if parsed, _, err := net.SplitHostPort(host); err == nil {
		host = parsed
	} else if strings.HasPrefix(host, "[") && strings.HasSuffix(host, "]") {
		host = strings.TrimSuffix(strings.TrimPrefix(host, "["), "]")
	}
	return server.allowedHosts[strings.ToLower(host)]
}

func isLoopbackRemote(request *http.Request) bool {
	host, _, err := net.SplitHostPort(request.RemoteAddr)
	if err != nil {
		return false
	}
	parsed, err := netip.ParseAddr(host)
	return err == nil && parsed.IsLoopback()
}

// serveProject stores one project JSON document on disk so diagrams survive browser changes.
func (server *atlasServer) serveProject(writer http.ResponseWriter, request *http.Request) {
	if !server.authorizeAPI(writer, request) {
		return
	}
	file := filepath.Join(server.dataDir, "project.json")
	switch request.Method {
	case http.MethodGet:
		data, err := os.ReadFile(file)
		if errors.Is(err, fs.ErrNotExist) {
			writer.WriteHeader(http.StatusNoContent)
			return
		}
		if err != nil {
			log.Printf("project read failed: %v", err)
			http.Error(writer, "project could not be read", http.StatusInternalServerError)
			return
		}
		writeBody(writer, request, http.StatusOK, "application/json; charset=utf-8", data)
	case http.MethodPut:
		if media := strings.TrimSpace(strings.Split(request.Header.Get("Content-Type"), ";")[0]); media != "application/json" {
			http.Error(writer, "Content-Type must be application/json", http.StatusUnsupportedMediaType)
			return
		}
		data, err := io.ReadAll(io.LimitReader(request.Body, maxProjectBytes+1))
		if err != nil {
			http.Error(writer, "could not read project", http.StatusBadRequest)
			return
		}
		if len(data) > maxProjectBytes {
			http.Error(writer, "project is larger than 16 MB", http.StatusRequestEntityTooLarge)
			return
		}
		if !json.Valid(data) || len(bytes.TrimSpace(data)) == 0 || bytes.TrimSpace(data)[0] != '{' {
			http.Error(writer, "project must be a JSON object", http.StatusBadRequest)
			return
		}
		temporary, err := os.CreateTemp(server.dataDir, ".project-*.json")
		if err != nil {
			log.Printf("project write failed: %v", err)
			http.Error(writer, "project could not be saved", http.StatusInternalServerError)
			return
		}
		_, writeErr := temporary.Write(data)
		closeErr := temporary.Close()
		if writeErr != nil || closeErr != nil || os.Rename(temporary.Name(), file) != nil {
			_ = os.Remove(temporary.Name())
			log.Printf("project write failed: %v %v", writeErr, closeErr)
			http.Error(writer, "project could not be saved", http.StatusInternalServerError)
			return
		}
		writer.WriteHeader(http.StatusNoContent)
	default:
		methodNotAllowed(writer, "GET, PUT")
	}
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

func (server *atlasServer) serveNmapImport(writer http.ResponseWriter, request *http.Request) {
	if !server.authorizeAPI(writer, request) {
		return
	}
	if request.Method != http.MethodPost {
		methodNotAllowed(writer, http.MethodPost)
		return
	}
	media, _, err := mime.ParseMediaType(request.Header.Get("Content-Type"))
	if err != nil || (media != "application/xml" && media != "text/xml") {
		http.Error(writer, "Content-Type must be application/xml or text/xml", http.StatusUnsupportedMediaType)
		return
	}
	values, ok := request.URL.Query()["scope"]
	if !ok || len(values) != 1 {
		http.Error(writer, "a valid network scope is required", http.StatusBadRequest)
		return
	}
	data, err := io.ReadAll(io.LimitReader(request.Body, maxNmapBytes+1))
	if err != nil {
		http.Error(writer, "could not read Nmap XML", http.StatusBadRequest)
		return
	}
	if len(data) > maxNmapBytes {
		http.Error(writer, "Nmap XML is larger than 2 MB", http.StatusRequestEntityTooLarge)
		return
	}
	bundle, err := parseNmapXML(data, values[0])
	if err != nil {
		http.Error(writer, err.Error(), http.StatusBadRequest)
		return
	}
	writeNmapBundle(writer, request, bundle)
}

func (server *atlasServer) serveNmapStatus(writer http.ResponseWriter, request *http.Request) {
	if !server.authorizeAPI(writer, request) {
		return
	}
	if request.Method != http.MethodGet {
		methodNotAllowed(writer, http.MethodGet)
		return
	}
	writeJSON(writer, request, http.StatusOK, server.nmap.status())
}

func (server *atlasServer) serveNmapScan(writer http.ResponseWriter, request *http.Request) {
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
	input, err := decodeNmapScanInput(request)
	if err != nil {
		http.Error(writer, err.Error(), http.StatusBadRequest)
		return
	}
	_ = http.NewResponseController(writer).SetWriteDeadline(time.Now().Add(nmapTimeout + 5*time.Second))
	bundle, err := server.nmap.scan(request.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, errNmapBusy):
			http.Error(writer, err.Error(), http.StatusConflict)
		case errors.Is(err, context.Canceled):
			return
		case errors.Is(err, errNmapOutputLarge):
			http.Error(writer, err.Error(), http.StatusRequestEntityTooLarge)
		case strings.Contains(err.Error(), "not installed"):
			http.Error(writer, err.Error(), http.StatusServiceUnavailable)
		case strings.Contains(err.Error(), "scan failed") || strings.Contains(err.Error(), "timed out"):
			http.Error(writer, err.Error(), http.StatusBadGateway)
		default:
			http.Error(writer, err.Error(), http.StatusBadRequest)
		}
		return
	}
	writeNmapBundle(writer, request, bundle)
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
