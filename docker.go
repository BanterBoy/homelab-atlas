package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

var dockerVersionPattern = regexp.MustCompile(`^1\.[0-9]{1,3}$`)

const maxDockerCredentialLength = 4096

type dockerPort struct {
	PrivatePort int    `json:"PrivatePort"`
	PublicPort  int    `json:"PublicPort"`
	Type        string `json:"Type"`
}

type dockerContainer struct {
	Names  []string          `json:"Names"`
	Image  string            `json:"Image"`
	State  string            `json:"State"`
	Ports  []dockerPort      `json:"Ports"`
	Labels map[string]string `json:"Labels"`
}

type dockerClient struct {
	base        *url.URL
	client      *http.Client
	apiKey      string
	hawserToken string
}

func newDockerClient(rawHost, apiKey, hawserToken string) (*dockerClient, error) {
	if apiKey != "" && hawserToken != "" {
		return nil, errors.New("configure only one Docker authentication token")
	}
	for _, credential := range []string{apiKey, hawserToken} {
		if len(credential) > maxDockerCredentialLength || strings.ContainsAny(credential, "\r\n") {
			return nil, errors.New("Docker authentication token is invalid")
		}
	}
	if rawHost == "" {
		rawHost = "unix:///var/run/docker.sock"
	}
	parsed, err := url.Parse(rawHost)
	if err != nil {
		return nil, errors.New("invalid Docker host")
	}
	transport := &http.Transport{Proxy: nil, TLSHandshakeTimeout: 5 * time.Second, ResponseHeaderTimeout: 8 * time.Second}
	var base *url.URL
	switch parsed.Scheme {
	case "unix":
		if hawserToken != "" {
			return nil, errors.New("Hawser authentication requires an HTTP(S) Docker host")
		}
		if parsed.Host != "" || parsed.Path == "" || !path.IsAbs(parsed.Path) || parsed.RawQuery != "" || parsed.Fragment != "" {
			return nil, errors.New("invalid Docker unix socket")
		}
		socket := parsed.Path
		transport.DialContext = func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", socket)
		}
		base = &url.URL{Scheme: "http", Host: "docker"}
	case "https", "http":
		if parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
			return nil, errors.New("invalid Docker URL")
		}
		if parsed.Scheme == "http" && !isLoopbackHost(parsed.Hostname()) {
			return nil, errors.New("unencrypted Docker HTTP is limited to localhost")
		}
		base = parsed
	default:
		return nil, errors.New("Docker host must use unix or HTTPS")
	}
	client := &http.Client{
		Transport: transport,
		Timeout:   12 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	return &dockerClient{base: base, client: client, apiKey: apiKey, hawserToken: hawserToken}, nil
}

func isLoopbackHost(host string) bool {
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func (client *dockerClient) endpoint(suffix string) string {
	address := *client.base
	requestPath, query, _ := strings.Cut(suffix, "?")
	address.Path = strings.TrimRight(client.base.Path, "/") + requestPath
	address.RawPath = ""
	address.RawQuery = query
	return address.String()
}

func (client *dockerClient) getJSON(ctx context.Context, suffix string, destination any) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, client.endpoint(suffix), nil)
	if err != nil {
		return errors.New("could not create Docker request")
	}
	if client.apiKey != "" {
		request.Header.Set("X-API-Key", client.apiKey)
	} else if client.hawserToken != "" {
		request.Header.Set("X-Hawser-Token", client.hawserToken)
	}
	response, err := client.client.Do(request)
	if err != nil {
		return errors.New("Docker request failed")
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return errors.New("Docker returned an error")
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, maxDockerResponse+1))
	if err != nil || len(data) > maxDockerResponse {
		return errors.New("Docker response was invalid or too large")
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	if err := decoder.Decode(destination); err != nil {
		return errors.New("Docker returned invalid JSON")
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		return errors.New("Docker response was invalid or too large")
	}
	return nil
}

func collectDocker(ctx context.Context) (discoverySnapshot, error) {
	client, err := newDockerClient(os.Getenv("ATLAS_DOCKER_HOST"), os.Getenv("ATLAS_DOCKER_API_KEY"), os.Getenv("ATLAS_HAWSER_TOKEN"))
	if err != nil {
		return discoverySnapshot{}, err
	}
	return client.collect(ctx)
}

func (client *dockerClient) collect(ctx context.Context) (discoverySnapshot, error) {
	defer client.client.CloseIdleConnections()
	var version struct {
		APIVersion string `json:"ApiVersion"`
	}
	if err := client.getJSON(ctx, "/version", &version); err != nil {
		return discoverySnapshot{}, err
	}
	if !dockerVersionPattern.MatchString(version.APIVersion) {
		return discoverySnapshot{}, errors.New("Docker returned an invalid API version")
	}
	var containers []dockerContainer
	if err := client.getJSON(ctx, "/v"+version.APIVersion+"/containers/json?all=1", &containers); err != nil {
		return discoverySnapshot{}, err
	}
	if len(containers) > maxContainers {
		return discoverySnapshot{}, fmt.Errorf("Docker returned more than %d containers", maxContainers)
	}
	identity, name, err := collectorIdentity()
	if err != nil {
		return discoverySnapshot{}, err
	}
	snapshot := discoverySnapshot{
		Format: discoveryFormat, Version: discoveryVersion,
		Source:    snapshotSource{ID: identity, Name: name},
		ScannedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Findings:  groupContainers(containers),
	}
	if _, err := encodeSnapshot(snapshot); err != nil {
		return discoverySnapshot{}, err
	}
	return snapshot, nil
}

func collectorIdentity() (string, string, error) {
	id := os.Getenv("ATLAS_HOST_ID")
	if id == "" {
		id = "localdocker"
	}
	name := os.Getenv("ATLAS_HOST_NAME")
	if name == "" {
		name = "Docker"
	}
	if !idPattern.MatchString(id) {
		return "", "", errors.New("ATLAS_HOST_ID must be a safe ID of at most 64 characters")
	}
	if name == "" || !validText(name, 120) {
		return "", "", errors.New("ATLAS_HOST_NAME must be at most 120 UTF-8 bytes")
	}
	return id, name, nil
}

type findingAccumulator struct {
	finding
	ports map[string]bool
}

func groupContainers(containers []dockerContainer) []finding {
	groups := make(map[string]*findingAccumulator)
	for _, container := range containers {
		project := container.Labels["com.docker.compose.project"]
		service := container.Labels["com.docker.compose.service"]
		containerName := primaryContainerName(container.Names)
		kind := "container"
		identity := []string{"container", containerName}
		displayName := containerName
		if project != "" && service != "" {
			kind = "compose"
			identity = []string{"compose", project, service}
			displayName = service
		}
		encoded, _ := json.Marshal(identity)
		digest := sha256.Sum256(encoded)
		key := kind + ":" + hex.EncodeToString(digest[:])
		group := groups[key]
		if group == nil {
			group = &findingAccumulator{finding: finding{
				Key: key, Name: truncateUTF8(displayName, 120), Image: truncateUTF8(container.Image, 256),
				ComposeProject: truncateUTF8(project, 120), ComposeService: truncateUTF8(service, 120),
				Ports: []string{}, ContainerNames: []string{},
			}, ports: make(map[string]bool)}
			groups[key] = group
		}
		if image := truncateUTF8(container.Image, 256); image < group.Image {
			group.Image = image
		}
		group.Count++
		if strings.EqualFold(container.State, "running") {
			group.Running++
		} else {
			group.Stopped++
		}
		group.ContainerNames = append(group.ContainerNames, truncateUTF8(containerName, 120))
		for _, port := range container.Ports {
			protocol := strings.ToLower(port.Type)
			if (protocol != "tcp" && protocol != "udp" && protocol != "sctp") || port.PrivatePort < 1 || port.PrivatePort > 65535 || port.PublicPort < 0 || port.PublicPort > 65535 {
				continue
			}
			value := strconv.Itoa(port.PrivatePort) + "/" + protocol
			if port.PublicPort > 0 {
				value = strconv.Itoa(port.PublicPort) + ":" + value
			}
			if len(value) <= 80 {
				group.ports[value] = true
			}
		}
	}
	keys := make([]string, 0, len(groups))
	for key := range groups {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	findings := make([]finding, 0, len(keys))
	for _, key := range keys {
		group := groups[key]
		sort.Strings(group.ContainerNames)
		ports := make([]string, 0, len(group.ports))
		for value := range group.ports {
			ports = append(ports, value)
		}
		sort.Strings(ports)
		if len(ports) > 20 {
			ports = ports[:20]
		}
		group.Ports = ports
		findings = append(findings, group.finding)
	}
	return findings
}

func primaryContainerName(names []string) string {
	normalized := make([]string, 0, len(names))
	for _, name := range names {
		name = strings.TrimLeft(strings.TrimSpace(name), "/")
		if name != "" {
			normalized = append(normalized, name)
		}
	}
	if len(normalized) == 0 {
		return "unnamed-container"
	}
	sort.Strings(normalized)
	return normalized[0]
}

func truncateUTF8(value string, maximum int) string {
	if !utf8.ValidString(value) {
		value = strings.ToValidUTF8(value, "�")
	}
	if len(value) <= maximum {
		return value
	}
	for maximum > 0 && !utf8.RuneStart(value[maximum]) {
		maximum--
	}
	return value[:maximum]
}
