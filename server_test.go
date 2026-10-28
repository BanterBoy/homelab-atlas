package main

import (
	"bytes"
	"compress/gzip"
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

func testAtlasServer(t *testing.T) *atlasServer {
	t.Helper()
	public, err := fs.Sub(embeddedFiles, "public")
	if err != nil {
		t.Fatal(err)
	}
	assets, err := loadStaticAssets(public)
	if err != nil {
		t.Fatal(err)
	}
	return &atlasServer{
		assets: assets, allowedHosts: map[string]bool{"localhost": true, "127.0.0.1": true},
		httpClient: &http.Client{Timeout: time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }},
	}
}

func TestStaticCompressionCachingAndHead(t *testing.T) {
	server := testAtlasServer(t)
	source, err := fs.ReadFile(embeddedFiles, "public/app.js")
	if err != nil {
		t.Fatal(err)
	}
	gzipped := request(server, http.MethodGet, "/app.js", nil, map[string]string{"Accept-Encoding": "gzip"})
	if gzipped.Code != http.StatusOK || gzipped.Header().Get("Content-Encoding") != "gzip" || gzipped.Header().Get("Vary") != "Accept-Encoding" || gzipped.Header().Get("Cache-Control") != "no-cache" {
		t.Fatalf("gzip response: status=%d headers=%v", gzipped.Code, gzipped.Header())
	}
	if gzipped.Body.Len() >= len(source) {
		t.Fatalf("gzip did not reduce app.js: raw=%d gzip=%d", len(source), gzipped.Body.Len())
	}
	reader, err := gzip.NewReader(bytes.NewReader(gzipped.Body.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	decoded, err := io.ReadAll(reader)
	if closeErr := reader.Close(); err == nil {
		err = closeErr
	}
	if err != nil || !bytes.Equal(decoded, source) {
		t.Fatalf("gzip did not decode to source: err=%v", err)
	}

	identity := request(server, http.MethodGet, "/app.js", nil, map[string]string{"Accept-Encoding": "gzip;q=0, identity"})
	if identity.Header().Get("Content-Encoding") != "" || !bytes.Equal(identity.Body.Bytes(), source) {
		t.Fatal("q=0 did not select the identity representation")
	}
	if identity.Header().Get("ETag") == gzipped.Header().Get("ETag") {
		t.Fatal("gzip and identity ETags match")
	}

	conditional := request(server, http.MethodGet, "/app.js", nil, map[string]string{
		"Accept-Encoding": "gzip", "If-None-Match": gzipped.Header().Get("ETag"),
	})
	if conditional.Code != http.StatusNotModified || conditional.Body.Len() != 0 || conditional.Header().Get("Content-Length") != "" {
		t.Fatalf("conditional response: status=%d body=%d headers=%v", conditional.Code, conditional.Body.Len(), conditional.Header())
	}
	head := request(server, http.MethodHead, "/app.js", nil, map[string]string{"Accept-Encoding": "gzip"})
	if head.Code != http.StatusOK || head.Body.Len() != 0 || head.Header().Get("Content-Encoding") != "gzip" || head.Header().Get("ETag") != gzipped.Header().Get("ETag") || head.Header().Get("Content-Length") != strconv.Itoa(gzipped.Body.Len()) {
		t.Fatalf("HEAD response: status=%d body=%d headers=%v", head.Code, head.Body.Len(), head.Header())
	}
}

func request(server http.Handler, method, target string, body []byte, headers map[string]string) *httptest.ResponseRecorder {
	record := httptest.NewRecorder()
	req := httptest.NewRequest(method, target, bytes.NewReader(body))
	req.Host = "localhost"
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	server.ServeHTTP(record, req)
	return record
}

func TestStaticServerHealthAssetsAndRestrictions(t *testing.T) {
	server := testAtlasServer(t)
	for _, item := range []struct {
		path        string
		status      int
		contentType string
	}{
		{"/", http.StatusOK, "text/html"},
		{"/model.js", http.StatusOK, "text/javascript"},
		{"/logos/docker.svg", http.StatusOK, "image/svg+xml"},
		{"/healthz", http.StatusOK, "text/plain"},
		{"/licenses/", http.StatusNotFound, "text/plain"},
		{"/../main.go", http.StatusNotFound, "text/plain"},
		{"/.git/config", http.StatusNotFound, "text/plain"},
	} {
		record := request(server, http.MethodGet, item.path, nil, nil)
		if record.Code != item.status || !strings.HasPrefix(record.Header().Get("Content-Type"), item.contentType) {
			t.Errorf("%s: status=%d type=%q", item.path, record.Code, record.Header().Get("Content-Type"))
		}
		if record.Header().Get("Content-Security-Policy") != securityPolicy || record.Header().Get("X-Content-Type-Options") != "nosniff" {
			t.Errorf("%s: missing security headers", item.path)
		}
	}
	record := request(server, http.MethodPost, "/", nil, nil)
	if record.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST static status %d", record.Code)
	}
	record = request(server, http.MethodHead, "/app.js", nil, nil)
	if record.Code != http.StatusOK || record.Body.Len() != 0 {
		t.Fatalf("HEAD asset status=%d body=%d", record.Code, record.Body.Len())
	}
}

func TestDiscoveryAPIHostOriginTokenAndStrictBody(t *testing.T) {
	server := testAtlasServer(t)
	server.apiToken = strings.Repeat("a", 32)
	source := discoverySource{ID: "lab", Name: "Lab", URL: "http://collector.invalid/inventory", token: strings.Repeat("c", 32)}
	server.sources = []discoverySource{source}
	baseHeaders := map[string]string{"X-Atlas-Request": "1", "Authorization": "Bearer " + server.apiToken, "Accept-Encoding": "gzip"}

	record := request(server, http.MethodGet, "/api/discovery/sources", nil, baseHeaders)
	if record.Code != http.StatusOK || strings.Contains(record.Body.String(), source.URL) || strings.Contains(record.Body.String(), source.token) {
		t.Fatalf("unsafe source response: %d %s", record.Code, record.Body.String())
	}
	if record.Header().Get("Cache-Control") != "no-store" || record.Header().Get("Content-Encoding") != "" {
		t.Fatalf("API caching/compression headers: %v", record.Header())
	}

	for name, mutate := range map[string]func(*http.Request){
		"missing header": func(req *http.Request) { req.Header.Del("X-Atlas-Request") },
		"bad host":       func(req *http.Request) { req.Host = "attacker.example" },
		"bad origin":     func(req *http.Request) { req.Header.Set("Origin", "https://attacker.example") },
		"bad token":      func(req *http.Request) { req.Header.Set("Authorization", "Bearer wrong") },
	} {
		req := httptest.NewRequest(http.MethodGet, "/api/discovery/sources", nil)
		req.Host = "localhost"
		for key, value := range baseHeaders {
			req.Header.Set(key, value)
		}
		mutate(req)
		record := httptest.NewRecorder()
		server.ServeHTTP(record, req)
		if record.Code != http.StatusForbidden && record.Code != http.StatusUnauthorized {
			t.Errorf("%s: status %d", name, record.Code)
		}
	}

}

func TestDiscoveryScanAndErrorRedaction(t *testing.T) {
	snapshot := testSnapshot()
	snapshot.Source.ID = "lab"
	fail := false
	server := testAtlasServer(t)
	server.httpClient = &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if fail {
			return testHTTPResponse(http.StatusInternalServerError, []byte("secret backend body")), nil
		}
		if request.Header.Get("Authorization") != "Bearer "+strings.Repeat("c", 32) {
			t.Fatal("collector authorization missing")
		}
		return testHTTPResponse(http.StatusOK, mustJSON(t, snapshot)), nil
	})}
	server.sources = []discoverySource{{ID: "lab", Name: "Lab", URL: "https://collector.example/inventory", token: strings.Repeat("c", 32)}}
	headers := map[string]string{"X-Atlas-Request": "1", "Content-Type": "application/json", "Origin": "http://localhost"}
	record := request(server, http.MethodPost, "/api/discovery/scan", []byte(`{"sourceId":"lab"}`), headers)
	if record.Code != http.StatusOK || !strings.Contains(record.Body.String(), discoveryFormat) {
		t.Fatalf("scan failed: %d %s", record.Code, record.Body.String())
	}
	record = request(server, http.MethodPost, "/api/discovery/scan", []byte(`{"sourceId":"lab","url":"http://attacker"}`), headers)
	if record.Code != http.StatusBadRequest {
		t.Fatalf("arbitrary URL accepted: %d", record.Code)
	}

	fail = true
	record = request(server, http.MethodPost, "/api/discovery/scan", []byte(`{"sourceId":"lab"}`), headers)
	if record.Code != http.StatusBadGateway || strings.Contains(record.Body.String(), "secret") {
		t.Fatalf("backend error leaked: %d %s", record.Code, record.Body.String())
	}
}

func TestCollectorEndpointsAndAuthentication(t *testing.T) {
	handler := collectorHandler(strings.Repeat("t", 32))
	if record := request(handler, http.MethodGet, "/healthz", nil, nil); record.Code != http.StatusOK {
		t.Fatalf("health status %d", record.Code)
	}
	if record := request(handler, http.MethodGet, "/inventory", nil, nil); record.Code != http.StatusUnauthorized {
		t.Fatalf("inventory status %d", record.Code)
	}
	if record := request(handler, http.MethodPost, "/inventory", nil, map[string]string{"Authorization": "Bearer " + strings.Repeat("t", 32)}); record.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST inventory status %d", record.Code)
	}
	if record := request(handler, http.MethodGet, "/containers/json", nil, nil); record.Code != http.StatusNotFound {
		t.Fatalf("proxy-like route status %d", record.Code)
	}
}

func TestConfiguredRemoteHostsRequireAPIToken(t *testing.T) {
	if _, remote, err := allowedHostSet("localhost,atlas.internal"); err != nil || !remote {
		t.Fatalf("remote host not detected: remote=%v err=%v", remote, err)
	}
	if _, _, err := allowedHostSet("localhost:8080"); err == nil {
		t.Fatal("port in allowed host was accepted")
	}
}
