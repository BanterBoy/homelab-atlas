package main

import (
	"bytes"
	"compress/gzip"
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strconv"
	"strings"
	"testing"
	"testing/fstest"
	"time"
)

func testAtlasServer(t *testing.T) *atlasServer {
	t.Helper()
	public, err := fs.Sub(embeddedFiles, "public")
	if err != nil {
		t.Fatal(err)
	}
	assets, assetPrefix, err := loadStaticAssets(public)
	if err != nil {
		t.Fatal(err)
	}
	return &atlasServer{
		assets: assets, assetPrefix: assetPrefix, allowedHosts: map[string]bool{"localhost": true, "127.0.0.1": true},
		nmap:       &nmapScanner{allowed: []netip.Prefix{netip.MustParsePrefix("10.0.0.0/8"), netip.MustParsePrefix("192.168.0.0/16")}, run: runNmapProcess},
		httpClient: &http.Client{Timeout: time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }},
	}
}

func TestStaticCompressionCachingAndHead(t *testing.T) {
	server := testAtlasServer(t)
	for _, item := range []struct {
		name   string
		asset  string
		target string
	}{
		{"app.js/root", "app.js", "/app.js"},
		{"app.js/versioned", "app.js", server.assetPrefix + "app.js"},
		{"styles.css/root", "styles.css", "/styles.css"},
		{"styles.css/versioned", "styles.css", server.assetPrefix + "styles.css"},
	} {
		t.Run(item.name, func(t *testing.T) {
			source, err := fs.ReadFile(embeddedFiles, "public/"+item.asset)
			if err != nil {
				t.Fatal(err)
			}
			gzipped := request(server, http.MethodGet, item.target, nil, map[string]string{"Accept-Encoding": "gzip"})
			if gzipped.Code != http.StatusOK || gzipped.Header().Get("Content-Encoding") != "gzip" || gzipped.Header().Get("Vary") != "Accept-Encoding" || gzipped.Header().Get("Cache-Control") != "no-cache" {
				t.Fatalf("gzip response: status=%d headers=%v", gzipped.Code, gzipped.Header())
			}
			if gzipped.Body.Len() >= len(source) {
				t.Fatalf("gzip did not reduce %s: raw=%d gzip=%d", item.asset, len(source), gzipped.Body.Len())
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

			identity := request(server, http.MethodGet, item.target, nil, map[string]string{"Accept-Encoding": "gzip;q=0, identity"})
			if identity.Header().Get("Content-Encoding") != "" || !bytes.Equal(identity.Body.Bytes(), source) {
				t.Fatal("q=0 did not select the identity representation")
			}
			if identity.Header().Get("ETag") == gzipped.Header().Get("ETag") {
				t.Fatal("gzip and identity ETags match")
			}

			conditional := request(server, http.MethodGet, item.target, nil, map[string]string{
				"Accept-Encoding": "gzip", "If-None-Match": gzipped.Header().Get("ETag"),
			})
			if conditional.Code != http.StatusNotModified || conditional.Body.Len() != 0 || conditional.Header().Get("Content-Length") != "" {
				t.Fatalf("conditional response: status=%d body=%d headers=%v", conditional.Code, conditional.Body.Len(), conditional.Header())
			}
			head := request(server, http.MethodHead, item.target, nil, map[string]string{"Accept-Encoding": "gzip"})
			if head.Code != http.StatusOK || head.Body.Len() != 0 || head.Header().Get("Content-Encoding") != "gzip" || head.Header().Get("ETag") != gzipped.Header().Get("ETag") || head.Header().Get("Content-Length") != strconv.Itoa(gzipped.Body.Len()) {
				t.Fatalf("HEAD response: status=%d body=%d headers=%v", head.Code, head.Body.Len(), head.Header())
			}
		})
	}
}

func TestVersionedStaticAssets(t *testing.T) {
	server := testAtlasServer(t)
	fingerprint := strings.TrimSuffix(strings.TrimPrefix(server.assetPrefix, "/assets/"), "/")
	if len(fingerprint) != 16 {
		t.Fatalf("asset prefix %q does not contain a 16-character fingerprint", server.assetPrefix)
	}
	if _, err := strconv.ParseUint(fingerprint, 16, 64); err != nil {
		t.Fatalf("asset fingerprint %q is not hexadecimal", fingerprint)
	}

	index := request(server, http.MethodGet, "/", nil, nil)
	body := index.Body.String()
	relativePrefix := strings.TrimPrefix(server.assetPrefix, "/")
	if index.Code != http.StatusOK || strings.Count(body, relativePrefix) != 2 ||
		!strings.Contains(body, `href="`+relativePrefix+`styles.css"`) ||
		!strings.Contains(body, `src="`+relativePrefix+`app.js"`) ||
		strings.Contains(body, `href="styles.css"`) || strings.Contains(body, `src="app.js"`) || strings.Contains(body, `="/`) {
		t.Fatalf("index does not reference one versioned asset prefix: status=%d prefix=%q", index.Code, server.assetPrefix)
	}

	for _, item := range []struct {
		name        string
		contentType string
	}{
		{"app.js", "text/javascript"},
		{"styles.css", "text/css"},
		{"model.js", "text/javascript"},
	} {
		source, err := fs.ReadFile(embeddedFiles, "public/"+item.name)
		if err != nil {
			t.Fatal(err)
		}
		response := request(server, http.MethodGet, server.assetPrefix+item.name, nil, nil)
		if response.Code != http.StatusOK || !strings.HasPrefix(response.Header().Get("Content-Type"), item.contentType) || !bytes.Equal(response.Body.Bytes(), source) {
			t.Errorf("versioned %s: status=%d type=%q bytesMatch=%t", item.name, response.Code, response.Header().Get("Content-Type"), bytes.Equal(response.Body.Bytes(), source))
		}
	}

	for _, target := range []string{
		"/assets/0000000000000000/app.js",
		server.assetPrefix + "../app.js",
		server.assetPrefix + "%2e%2e/app.js",
	} {
		if response := request(server, http.MethodGet, target, nil, nil); response.Code != http.StatusNotFound {
			t.Errorf("unsafe asset path %q returned %d", target, response.Code)
		}
	}
}

func TestStaticAssetFingerprint(t *testing.T) {
	public := fstest.MapFS{
		"app.js":     {Data: []byte("import './model.js';")},
		"model.js":   {Data: []byte("export default 1;")},
		"styles.css": {Data: []byte("body {}")},
		"index.html": {Data: []byte("ignored")},
	}
	original, err := staticAssetFingerprint(public)
	if err != nil {
		t.Fatal(err)
	}
	repeated, err := staticAssetFingerprint(public)
	if err != nil || repeated != original {
		t.Fatalf("fingerprint is not deterministic: first=%q second=%q err=%v", original, repeated, err)
	}

	app := public["app.js"]
	public["app.js"] = &fstest.MapFile{Data: []byte("import './changed.js';")}
	changedJS, err := staticAssetFingerprint(public)
	if err != nil || changedJS == original {
		t.Fatalf("JavaScript change did not change fingerprint: got=%q err=%v", changedJS, err)
	}
	public["app.js"] = app

	styles := public["styles.css"]
	public["styles.css"] = &fstest.MapFile{Data: []byte("body { color: red; }")}
	changedCSS, err := staticAssetFingerprint(public)
	if err != nil || changedCSS == original {
		t.Fatalf("CSS change did not change fingerprint: got=%q err=%v", changedCSS, err)
	}
	public["styles.css"] = styles

	public["index.html"] = &fstest.MapFile{Data: []byte("changed but not an asset")}
	changedHTML, err := staticAssetFingerprint(public)
	if err != nil || changedHTML != original {
		t.Fatalf("non-JS/CSS change affected fingerprint: got=%q want=%q err=%v", changedHTML, original, err)
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

func TestNmapImportAPIContract(t *testing.T) {
	server := testAtlasServer(t)
	body := nmapDocument(`<host><status state="up"/><address addr="192.0.2.10" addrtype="ipv4"/></host>`, "1700000000")
	headers := map[string]string{"X-Atlas-Request": "1", "Content-Type": "application/xml"}
	response := request(server, http.MethodPost, "/api/discovery/nmap?scope=Home%20network", body, headers)
	if response.Code != http.StatusOK || response.Header().Get("Cache-Control") != "no-store" || !strings.Contains(response.Body.String(), `"homelab-atlas.nmap-import"`) {
		t.Fatalf("Nmap response: status=%d headers=%v body=%s", response.Code, response.Header(), response.Body.String())
	}
	for _, item := range []struct {
		name, method, target, contentType string
		want                              int
	}{
		{"method", http.MethodGet, "/api/discovery/nmap?scope=Lab", "application/xml", http.StatusMethodNotAllowed},
		{"mime", http.MethodPost, "/api/discovery/nmap?scope=Lab", "application/json", http.StatusUnsupportedMediaType},
		{"scope", http.MethodPost, "/api/discovery/nmap", "application/xml", http.StatusBadRequest},
	} {
		itemHeaders := map[string]string{"X-Atlas-Request": "1", "Content-Type": item.contentType}
		if got := request(server, item.method, item.target, body, itemHeaders); got.Code != item.want {
			t.Errorf("%s status=%d want=%d", item.name, got.Code, item.want)
		}
	}
	large := bytes.Repeat([]byte("x"), maxNmapBytes+1)
	if got := request(server, http.MethodPost, "/api/discovery/nmap?scope=Lab", large, headers); got.Code != http.StatusRequestEntityTooLarge || strings.Contains(got.Body.String(), string(body)) {
		t.Fatalf("oversized response: %d %q", got.Code, got.Body.String())
	}

	server.apiToken = strings.Repeat("a", 32)
	guardedHeaders := map[string]string{"X-Atlas-Request": "1", "Content-Type": "application/xml", "Authorization": "Bearer " + server.apiToken, "Origin": "http://localhost"}
	for name, mutate := range map[string]func(*http.Request){
		"missing X-Atlas-Request": func(req *http.Request) { req.Header.Del("X-Atlas-Request") },
		"bad host":                func(req *http.Request) { req.Host = "attacker.example" },
		"bad origin":              func(req *http.Request) { req.Header.Set("Origin", "https://attacker.example") },
		"bad token":               func(req *http.Request) { req.Header.Set("Authorization", "Bearer wrong") },
	} {
		req := httptest.NewRequest(http.MethodPost, "/api/discovery/nmap?scope=Lab", bytes.NewReader(body))
		req.Host = "localhost"
		for key, value := range guardedHeaders {
			req.Header.Set(key, value)
		}
		mutate(req)
		record := httptest.NewRecorder()
		server.ServeHTTP(record, req)
		if record.Code != http.StatusForbidden && record.Code != http.StatusUnauthorized {
			t.Errorf("%s: status=%d", name, record.Code)
		}
	}
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

func TestIngressModeRestrictsPeersAndAllowsFraming(t *testing.T) {
	server := testAtlasServer(t)
	server.ingressPeers = map[string]bool{"172.30.32.2": true}
	send := func(remote, target string, headers map[string]string) *httptest.ResponseRecorder {
		record := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, target, nil)
		req.Host = "homeassistant.local:8123"
		req.RemoteAddr = remote
		for key, value := range headers {
			req.Header.Set(key, value)
		}
		server.ServeHTTP(record, req)
		return record
	}
	if got := send("172.30.32.2:40000", "/", nil); got.Code != http.StatusOK || !strings.Contains(got.Header().Get("Content-Security-Policy"), "frame-ancestors 'self'") {
		t.Fatalf("ingress index: status=%d csp=%q", got.Code, got.Header().Get("Content-Security-Policy"))
	}
	if got := send("172.30.33.5:40000", "/", nil); got.Code != http.StatusForbidden {
		t.Fatalf("non-ingress peer status=%d", got.Code)
	}
	if got := send("127.0.0.1:40000", "/healthz", nil); got.Code != http.StatusOK {
		t.Fatalf("loopback healthcheck status=%d", got.Code)
	}
	api := map[string]string{"X-Atlas-Request": "1", "X-Forwarded-Host": "ha.example.net", "Origin": "https://ha.example.net"}
	if got := send("172.30.32.2:40000", "/api/discovery/sources", api); got.Code != http.StatusOK {
		t.Fatalf("ingress API status=%d body=%q", got.Code, got.Body.String())
	}
	api["Origin"] = "https://evil.example"
	if got := send("172.30.32.2:40000", "/api/discovery/sources", api); got.Code != http.StatusForbidden {
		t.Fatalf("mismatched origin status=%d", got.Code)
	}
	if _, err := ingressPeerSet("not-an-ip"); err == nil {
		t.Fatal("invalid ingress peer was accepted")
	}
}

func TestProjectStorage(t *testing.T) {
	server := testAtlasServer(t)
	headers := map[string]string{"X-Atlas-Request": "1", "Content-Type": "application/json"}
	if got := request(server, http.MethodGet, "/api/project", nil, headers); got.Code != http.StatusNotFound {
		t.Fatalf("project API without data dir: status=%d", got.Code)
	}
	server.dataDir = t.TempDir()
	if got := request(server, http.MethodGet, "/api/project", nil, headers); got.Code != http.StatusNoContent {
		t.Fatalf("empty project: status=%d", got.Code)
	}
	for _, body := range []string{"", "[]", "{", `"text"`} {
		if got := request(server, http.MethodPut, "/api/project", []byte(body), headers); got.Code != http.StatusBadRequest {
			t.Errorf("invalid project %q: status=%d", body, got.Code)
		}
	}
	if got := request(server, http.MethodPut, "/api/project", []byte(`{"title":"Lab"}`), map[string]string{"Content-Type": "application/json"}); got.Code != http.StatusForbidden {
		t.Fatalf("missing request header: status=%d", got.Code)
	}
	if got := request(server, http.MethodPut, "/api/project", []byte(`{"title":"Lab"}`), headers); got.Code != http.StatusNoContent {
		t.Fatalf("save project: status=%d body=%q", got.Code, got.Body.String())
	}
	got := request(server, http.MethodGet, "/api/project", nil, headers)
	if got.Code != http.StatusOK || got.Body.String() != `{"title":"Lab"}` {
		t.Fatalf("load project: status=%d body=%q", got.Code, got.Body.String())
	}
	if got := request(server, http.MethodDelete, "/api/project", nil, headers); got.Code != http.StatusMethodNotAllowed {
		t.Fatalf("delete project: status=%d", got.Code)
	}
}
