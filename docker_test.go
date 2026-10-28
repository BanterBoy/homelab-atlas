package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (function roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return function(request)
}

func testHTTPResponse(status int, body []byte) *http.Response {
	return &http.Response{StatusCode: status, Header: make(http.Header), Body: io.NopCloser(bytes.NewReader(body))}
}

func testDockerClient(transport roundTripFunc) *dockerClient {
	base, _ := url.Parse("http://docker/api/endpoints/3/docker")
	return &dockerClient{base: base, apiKey: "portainer-key", client: &http.Client{
		Transport: transport, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse },
	}}
}

func TestDockerCollectionUsesVersionedReadOnlyEndpoints(t *testing.T) {
	var paths []string
	containers := mustJSON(t, []dockerContainer{
		{Names: []string{"/demo-web-2"}, Image: "registry.example/demo/web:1", State: "exited", Ports: []dockerPort{{PrivatePort: 80, PublicPort: 8080, Type: "tcp"}}, Labels: map[string]string{"com.docker.compose.project": "demo", "com.docker.compose.service": "web"}},
		{Names: []string{"/demo-web-1"}, Image: "registry.example/demo/web:1", State: "running", Ports: []dockerPort{{PrivatePort: 80, PublicPort: 8080, Type: "tcp"}}, Labels: map[string]string{"com.docker.compose.project": "demo", "com.docker.compose.service": "web"}},
		{Names: []string{"/redis"}, Image: "redis:7", State: "running"},
	})
	client := testDockerClient(func(request *http.Request) (*http.Response, error) {
		paths = append(paths, request.URL.RequestURI())
		if request.Method != http.MethodGet {
			t.Fatalf("unexpected method %s", request.Method)
		}
		if request.Header.Get("X-API-Key") != "portainer-key" {
			t.Fatal("missing API key")
		}
		switch request.URL.Path {
		case "/api/endpoints/3/docker/version":
			return testHTTPResponse(http.StatusOK, []byte(`{"ApiVersion":"1.47"}`)), nil
		case "/api/endpoints/3/docker/v1.47/containers/json":
			return testHTTPResponse(http.StatusOK, containers), nil
		default:
			return testHTTPResponse(http.StatusNotFound, nil), nil
		}
	})

	t.Setenv("ATLAS_HOST_ID", "lab")
	t.Setenv("ATLAS_HOST_NAME", "Lab Docker")
	snapshot, err := client.collect(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if strings.Join(paths, ",") != "/api/endpoints/3/docker/version,/api/endpoints/3/docker/v1.47/containers/json?all=1" {
		t.Fatalf("unexpected paths: %v", paths)
	}
	if len(snapshot.Findings) != 2 {
		t.Fatalf("unexpected findings: %#v", snapshot.Findings)
	}
	var web finding
	for _, item := range snapshot.Findings {
		if item.ComposeService == "web" {
			web = item
		}
	}
	if web.Count != 2 || web.Running != 1 || web.Stopped != 1 || len(web.Ports) != 1 || web.Key[:8] != "compose:" {
		t.Fatalf("replicas were not grouped: %#v", web)
	}
	if strings.Contains(string(mustJSON(t, snapshot)), "portainer-key") {
		t.Fatal("credential leaked into snapshot")
	}
}

func TestDockerIdentitySurvivesContainerRecreation(t *testing.T) {
	first := groupContainers([]dockerContainer{{Names: []string{"/app"}, Image: "app:1", State: "running"}})
	second := groupContainers([]dockerContainer{{Names: []string{"/app"}, Image: "app:2", State: "running"}})
	if first[0].Key != second[0].Key {
		t.Fatalf("identity changed: %s != %s", first[0].Key, second[0].Key)
	}
	composeA := groupContainers([]dockerContainer{{Names: []string{"/one"}, State: "running", Labels: map[string]string{"com.docker.compose.project": "demo", "com.docker.compose.service": "api"}}})
	composeB := groupContainers([]dockerContainer{{Names: []string{"/replacement"}, State: "running", Labels: map[string]string{"com.docker.compose.project": "demo", "com.docker.compose.service": "api"}}})
	if composeA[0].Key != composeB[0].Key {
		t.Fatal("compose identity changed with the container name")
	}
}

func TestDockerRejectsRedirectsBadVersionsAndLargeInventories(t *testing.T) {
	client := testDockerClient(func(request *http.Request) (*http.Response, error) {
		response := testHTTPResponse(http.StatusFound, []byte("secret backend body"))
		response.Header.Set("Location", "/secret")
		return response, nil
	})
	var version any
	if err := client.getJSON(context.Background(), "/version", &version); err == nil || strings.Contains(err.Error(), "/secret") {
		t.Fatalf("redirect error was unsafe: %v", err)
	}

	badVersion := testDockerClient(func(request *http.Request) (*http.Response, error) {
		return testHTTPResponse(http.StatusOK, []byte(`{"ApiVersion":"../../secret"}`)), nil
	})
	if _, err := badVersion.collect(context.Background()); err == nil || strings.Contains(err.Error(), "secret") {
		t.Fatalf("unsafe API version error: %v", err)
	}

	containers := make([]dockerContainer, maxContainers+1)
	largeInventory := testDockerClient(func(request *http.Request) (*http.Response, error) {
		if strings.HasSuffix(request.URL.Path, "/version") {
			return testHTTPResponse(http.StatusOK, []byte(`{"ApiVersion":"1.47"}`)), nil
		}
		return testHTTPResponse(http.StatusOK, mustJSON(t, containers)), nil
	})
	if _, err := largeInventory.collect(context.Background()); err == nil {
		t.Fatal("more than 1000 containers were silently clipped")
	}

	oversized := testDockerClient(func(request *http.Request) (*http.Response, error) {
		return testHTTPResponse(http.StatusOK, bytes.Repeat([]byte(" "), maxDockerResponse+1)), nil
	})
	if err := oversized.getJSON(context.Background(), "/version", &version); err == nil {
		t.Fatal("oversized Docker response was accepted")
	}
}

func TestDockerTimeoutAndHTTPSRules(t *testing.T) {
	if _, err := newDockerClient("http://example.com/docker", ""); err == nil {
		t.Fatal("remote plaintext Docker URL was accepted")
	}
	client := testDockerClient(func(request *http.Request) (*http.Response, error) {
		<-request.Context().Done()
		return nil, request.Context().Err()
	})
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	var value any
	if err := client.getJSON(ctx, "/version", &value); err == nil {
		t.Fatal("canceled request succeeded")
	}
}

func mustJSON(t *testing.T, value any) []byte {
	t.Helper()
	data, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return data
}
