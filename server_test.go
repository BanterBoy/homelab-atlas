package main

import (
	"bytes"
	"io/fs"
	"net/http"
	"net/http/httptest"
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
	return &atlasServer{
		public: public, allowedHosts: map[string]bool{"localhost": true, "127.0.0.1": true},
		httpClient: &http.Client{Timeout: time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }},
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
	baseHeaders := map[string]string{"X-Atlas-Request": "1", "Authorization": "Bearer " + server.apiToken}

	record := request(server, http.MethodGet, "/api/discovery/sources", nil, baseHeaders)
	if record.Code != http.StatusOK || strings.Contains(record.Body.String(), source.URL) || strings.Contains(record.Body.String(), source.token) {
		t.Fatalf("unsafe source response: %d %s", record.Code, record.Body.String())
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
