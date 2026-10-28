package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func testSnapshot() discoverySnapshot {
	return discoverySnapshot{
		Format: discoveryFormat, Version: discoveryVersion,
		Source:    snapshotSource{ID: "localdocker", Name: "Docker"},
		ScannedAt: time.Date(2026, 10, 27, 12, 0, 0, 0, time.UTC).Format(time.RFC3339Nano),
		Findings: []finding{{
			Key: "compose:" + strings.Repeat("a", 64), Name: "web", Image: "example/web:1",
			Count: 2, Running: 1, Stopped: 1, Ports: []string{"8080:80/tcp"},
			ComposeProject: "demo", ComposeService: "web", ContainerNames: []string{"demo-web-1", "demo-web-2"},
		}},
	}
}

func TestSnapshotRoundTripAndValidation(t *testing.T) {
	snapshot := testSnapshot()
	data, err := encodeSnapshot(snapshot)
	if err != nil {
		t.Fatal(err)
	}
	decoded, err := decodeSnapshot(data, "localdocker")
	if err != nil {
		t.Fatal(err)
	}
	if decoded.Findings[0].Count != 2 {
		t.Fatalf("unexpected snapshot: %#v", decoded)
	}

	bad := snapshot
	bad.Findings = append([]finding(nil), snapshot.Findings...)
	bad.Findings[0].Running = 2
	if _, err := encodeSnapshot(bad); err == nil {
		t.Fatal("invalid counts were accepted")
	}
	bad = snapshot
	bad.Findings = append(bad.Findings, snapshot.Findings[0])
	if _, err := encodeSnapshot(bad); err == nil {
		t.Fatal("duplicate keys were accepted")
	}
	if _, err := decodeSnapshot(append(data[:len(data)-1], []byte(`,"extra":true}`)...), "localdocker"); err == nil {
		t.Fatal("unknown fields were accepted")
	}
	if _, err := decodeSnapshot(data, "another-host"); err == nil {
		t.Fatal("source mismatch was accepted")
	}
}

func TestSnapshotLimits(t *testing.T) {
	snapshot := testSnapshot()
	snapshot.Findings[0].Name = strings.Repeat("é", 61)
	if _, err := encodeSnapshot(snapshot); err == nil {
		t.Fatal("UTF-8 byte limit was not enforced")
	}
	if _, err := decodeSnapshot(make([]byte, maxSnapshotBytes+1), ""); err == nil || !strings.Contains(err.Error(), "2 MB") {
		t.Fatalf("unexpected oversized error: %v", err)
	}
}

func TestLoadDiscoverySources(t *testing.T) {
	t.Setenv("ATLAS_COLLECTOR_TOKEN", "")
	os.Unsetenv("ATLAS_DISCOVERY_SOURCES")
	sources, err := loadDiscoverySources()
	if err != nil || len(sources) != 0 {
		t.Fatalf("default sources: %#v, %v", sources, err)
	}

	token := strings.Repeat("t", 32)
	t.Setenv("ATLAS_COLLECTOR_TOKEN", token)
	sources, err = loadDiscoverySources()
	if err != nil || len(sources) != 1 || sources[0].token != token {
		t.Fatalf("local source: %#v, %v", sources, err)
	}

	file := filepath.Join(t.TempDir(), "sources.json")
	if err := os.WriteFile(file, []byte(`[{"id":"remote","name":"Remote","url":"https://collector.example/api/inventory","tokenEnv":"REMOTE_TOKEN"}]`), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("ATLAS_DISCOVERY_SOURCES", file)
	t.Setenv("REMOTE_TOKEN", strings.Repeat("r", 32))
	sources, err = loadDiscoverySources()
	if err != nil || len(sources) != 1 || sources[0].ID != "remote" {
		t.Fatalf("configured source: %#v, %v", sources, err)
	}
	if sources[0].token == "" {
		t.Fatal("configured token was not resolved")
	}
}
