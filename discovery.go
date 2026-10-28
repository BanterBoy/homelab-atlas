package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	pathpkg "path"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	discoveryFormat   = "homelab-atlas.docker-discovery"
	discoveryVersion  = 1
	maxSnapshotBytes  = 2_000_000
	maxDockerResponse = 8 << 20
	maxContainers     = 1000
	maxSources        = 16
)

var idPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`)
var environmentPattern = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

type snapshotSource struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type finding struct {
	Key            string   `json:"key"`
	Name           string   `json:"name"`
	Image          string   `json:"image"`
	Count          int      `json:"count"`
	Running        int      `json:"running"`
	Stopped        int      `json:"stopped"`
	Ports          []string `json:"ports"`
	ComposeProject string   `json:"composeProject"`
	ComposeService string   `json:"composeService"`
	ContainerNames []string `json:"containerNames"`
}

type discoverySnapshot struct {
	Format    string         `json:"format"`
	Version   int            `json:"version"`
	Source    snapshotSource `json:"source"`
	ScannedAt string         `json:"scannedAt"`
	Findings  []finding      `json:"findings"`
}

type discoverySource struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	TokenEnv string `json:"tokenEnv"`
	token    string
}

func validText(value string, limit int) bool {
	return utf8.ValidString(value) && len([]byte(value)) <= limit
}

func decodeStrict(data []byte, destination any) error {
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("extra JSON data")
	}
	return nil
}

func validateSnapshot(snapshot *discoverySnapshot, expectedSource string) error {
	if snapshot.Format != discoveryFormat || snapshot.Version != discoveryVersion {
		return errors.New("unsupported discovery snapshot")
	}
	if !idPattern.MatchString(snapshot.Source.ID) || !validText(snapshot.Source.Name, 120) || snapshot.Source.Name == "" {
		return errors.New("invalid discovery source")
	}
	if expectedSource != "" && snapshot.Source.ID != expectedSource {
		return errors.New("discovery source mismatch")
	}
	if _, err := time.Parse(time.RFC3339Nano, snapshot.ScannedAt); err != nil {
		return errors.New("invalid discovery scan time")
	}
	if len(snapshot.Findings) > maxContainers {
		return errors.New("too many discovery findings")
	}
	keys := make(map[string]bool, len(snapshot.Findings))
	total := 0
	for i := range snapshot.Findings {
		item := &snapshot.Findings[i]
		if !validFindingKey(item.Key) || keys[item.Key] {
			return errors.New("invalid or duplicate discovery key")
		}
		keys[item.Key] = true
		if item.Name == "" || !validText(item.Name, 120) || !validText(item.Image, 256) ||
			!validText(item.ComposeProject, 120) || !validText(item.ComposeService, 120) {
			return errors.New("invalid discovery finding text")
		}
		if item.Count < 1 || item.Running < 0 || item.Stopped < 0 || item.Count != item.Running+item.Stopped {
			return errors.New("invalid discovery counts")
		}
		if len(item.Ports) > 20 || len(item.ContainerNames) < 1 || len(item.ContainerNames) > maxContainers || len(item.ContainerNames) != item.Count {
			return errors.New("invalid discovery details")
		}
		for _, value := range item.Ports {
			if value == "" || !validText(value, 80) {
				return errors.New("invalid discovery port")
			}
		}
		for _, value := range item.ContainerNames {
			if value == "" || !validText(value, 120) {
				return errors.New("invalid discovery container name")
			}
		}
		total += item.Count
		if total > maxContainers {
			return errors.New("too many discovered containers")
		}
	}
	return nil
}

func validFindingKey(key string) bool {
	for _, prefix := range []string{"compose:", "container:"} {
		if strings.HasPrefix(key, prefix) && len(key) == len(prefix)+64 {
			for _, character := range key[len(prefix):] {
				if !strings.ContainsRune("0123456789abcdef", character) {
					return false
				}
			}
			return true
		}
	}
	return false
}

func encodeSnapshot(snapshot discoverySnapshot) ([]byte, error) {
	if err := validateSnapshot(&snapshot, ""); err != nil {
		return nil, err
	}
	data, err := json.Marshal(snapshot)
	if err != nil {
		return nil, errors.New("could not encode discovery snapshot")
	}
	if len(data) > maxSnapshotBytes {
		return nil, fmt.Errorf("discovery snapshot exceeds the 2 MB limit")
	}
	return data, nil
}

func decodeSnapshot(data []byte, expectedSource string) (discoverySnapshot, error) {
	if len(data) > maxSnapshotBytes {
		return discoverySnapshot{}, errors.New("discovery snapshot exceeds the 2 MB limit")
	}
	var snapshot discoverySnapshot
	if err := decodeStrict(data, &snapshot); err != nil {
		return discoverySnapshot{}, errors.New("invalid discovery snapshot JSON")
	}
	if err := validateSnapshot(&snapshot, expectedSource); err != nil {
		return discoverySnapshot{}, err
	}
	return snapshot, nil
}

func loadDiscoverySources() ([]discoverySource, error) {
	path, configured := os.LookupEnv("ATLAS_DISCOVERY_SOURCES")
	if configured && strings.TrimSpace(path) == "" {
		return nil, errors.New("ATLAS_DISCOVERY_SOURCES must name a JSON file")
	}
	if !configured {
		token := os.Getenv("ATLAS_COLLECTOR_TOKEN")
		if token == "" {
			return []discoverySource{}, nil
		}
		if len(token) < 32 {
			return nil, errors.New("ATLAS_COLLECTOR_TOKEN must be at least 32 characters")
		}
		return []discoverySource{{ID: "localdocker", Name: "Docker", URL: "http://collector:8081/inventory", token: token}}, nil
	}
	file, err := os.Open(path)
	if err != nil {
		return nil, errors.New("could not open ATLAS_DISCOVERY_SOURCES")
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, 64*1024+1))
	if err != nil || len(data) > 64*1024 {
		return nil, errors.New("ATLAS_DISCOVERY_SOURCES must be at most 64 KiB")
	}
	var sources []discoverySource
	if err := decodeStrict(data, &sources); err != nil || sources == nil || len(sources) > maxSources {
		return nil, errors.New("invalid ATLAS_DISCOVERY_SOURCES JSON")
	}
	seen := make(map[string]bool, len(sources))
	for index := range sources {
		source := &sources[index]
		if !idPattern.MatchString(source.ID) || seen[source.ID] || source.Name == "" || !validText(source.Name, 120) {
			return nil, errors.New("invalid or duplicate discovery source")
		}
		seen[source.ID] = true
		parsed, err := url.Parse(source.URL)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || pathpkg.Clean(parsed.Path) != parsed.Path || !strings.HasSuffix(parsed.EscapedPath(), "/inventory") {
			return nil, errors.New("discovery source URL must be a fixed http(s) /inventory endpoint")
		}
		if !environmentPattern.MatchString(source.TokenEnv) {
			return nil, errors.New("discovery source tokenEnv is required")
		}
		source.token = os.Getenv(source.TokenEnv)
		if len(source.token) < 32 {
			return nil, fmt.Errorf("discovery token environment %s must contain at least 32 characters", source.TokenEnv)
		}
	}
	return sources, nil
}
