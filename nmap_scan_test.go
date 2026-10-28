package main

import (
	"context"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

func testNmapScanner(t *testing.T, run nmapRun) *nmapScanner {
	t.Helper()
	allowed, err := parseAllowedNmapCIDRs("192.168.1.0/24,127.0.0.0/8")
	if err != nil {
		t.Fatal(err)
	}
	return &nmapScanner{path: "/test/nmap", allowed: allowed, run: run}
}

func TestNmapAllowedTargetsAndCanonicalPorts(t *testing.T) {
	scanner := testNmapScanner(t, nil)
	targets, err := scanner.targets("192.168.1.2, 192.168.1.0/30 192.168.1.2")
	if err != nil || !slices.Equal(targets, []string{"192.168.1.0", "192.168.1.1", "192.168.1.2", "192.168.1.3"}) {
		t.Fatalf("targets=%v err=%v", targets, err)
	}
	ports, err := canonicalNmapPorts("443,80-82,81")
	if err != nil || ports != "80,81,82,443" {
		t.Fatalf("ports=%q err=%v", ports, err)
	}
	if ports, err = canonicalNmapPorts(""); err != nil || ports != "" {
		t.Fatalf("blank ports=%q err=%v", ports, err)
	}
	if defaults, err := parseAllowedNmapCIDRs(""); err != nil || len(defaults) != 3 || defaults[0].String() != "10.0.0.0/8" {
		t.Fatalf("defaults=%v err=%v", defaults, err)
	}
}

func TestNmapTargetAndPortRejections(t *testing.T) {
	scanner := testNmapScanner(t, nil)
	badTargets := []string{"", "host.local", "https://192.168.1.2", "-Pn", "::1", "192.168.1.1/24", "192.168.0.0/23", "169.254.1.1", "224.0.0.1", "0.0.0.0", "10.0.0.1"}
	for _, value := range badTargets {
		if _, err := scanner.targets(value); err == nil {
			t.Errorf("target %q accepted", value)
		}
	}
	badPorts := []string{"0", "65536", "22 - 23", "-p80", "1-1001", "80,,81", "90-80", "080"}
	for _, value := range badPorts {
		if _, err := canonicalNmapPorts(value); err == nil {
			t.Errorf("ports %q accepted", value)
		}
	}
	if _, err := parseAllowedNmapCIDRs("10.0.0.0/8,::1/128"); err == nil {
		t.Fatal("IPv6 allowlist accepted")
	}
}

func TestNmapExactArgumentsAndNormalizedBundle(t *testing.T) {
	var gotPath string
	var gotArgs []string
	run := func(_ context.Context, path string, args []string, output io.Writer) error {
		gotPath, gotArgs = path, slices.Clone(args)
		_, err := output.Write(nmapDocument(`<host><status state="up"/><address addr="192.168.1.2" addrtype="ipv4"/><ports><port protocol="tcp" portid="443"><state state="open"/></port></ports></host>`, "1700000000"))
		return err
	}
	scanner := testNmapScanner(t, run)
	bundle, err := scanner.scan(context.Background(), nmapScanInput{Scope: "Lab", Targets: "192.168.1.2", Ports: "443,80", DetectServices: true})
	want := []string{"--unprivileged", "-sT", "-n", "-T3", "--max-retries", "1", "--max-parallelism", "32", "--host-timeout", "15s", "-p", "80,443", "-sV", "--version-light", "-oX", "-", "192.168.1.2"}
	if err != nil || gotPath != "/test/nmap" || !slices.Equal(gotArgs, want) || len(bundle.Snapshots) != 1 {
		t.Fatalf("path=%q args=%v bundle=%+v err=%v", gotPath, gotArgs, bundle, err)
	}
	_, _ = scanner.scan(context.Background(), nmapScanInput{Scope: "Lab", Targets: "192.168.1.2"})
	if !slices.Contains(gotArgs, "--top-ports") || slices.Contains(gotArgs, "-p") {
		t.Fatalf("default args=%v", gotArgs)
	}
}

func TestNmapUnavailableBusyCancelAndOutputLimit(t *testing.T) {
	unavailable := testNmapScanner(t, nil)
	unavailable.path = ""
	if _, err := unavailable.scan(context.Background(), nmapScanInput{Scope: "Lab", Targets: "192.168.1.2"}); err == nil || !strings.Contains(err.Error(), "not installed") {
		t.Fatalf("unavailable err=%v", err)
	}

	started := make(chan struct{})
	release := make(chan struct{})
	run := func(ctx context.Context, _ string, _ []string, _ io.Writer) error {
		close(started)
		select {
		case <-release:
			return errors.New("failed")
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	scanner := testNmapScanner(t, run)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { _, err := scanner.scan(ctx, nmapScanInput{Scope: "Lab", Targets: "192.168.1.2"}); done <- err }()
	<-started
	if _, err := scanner.scan(context.Background(), nmapScanInput{Scope: "Lab", Targets: "192.168.1.3"}); !errors.Is(err, errNmapBusy) {
		t.Fatalf("busy err=%v", err)
	}
	cancel()
	if err := <-done; !errors.Is(err, context.Canceled) {
		t.Fatalf("cancel err=%v", err)
	}
	if !scanner.acquire() {
		t.Fatal("scan slot not released")
	}
	scanner.release()

	overflow := testNmapScanner(t, func(_ context.Context, _ string, _ []string, output io.Writer) error {
		_, err := output.Write(make([]byte, maxNmapBytes+1))
		return err
	})
	if _, err := overflow.scan(context.Background(), nmapScanInput{Scope: "Lab", Targets: "192.168.1.2"}); !errors.Is(err, errNmapOutputLarge) {
		t.Fatalf("overflow err=%v", err)
	}
}

func TestNmapLiveAPIContract(t *testing.T) {
	server := testAtlasServer(t)
	server.nmap.path = "/test/nmap"
	server.nmap.run = func(_ context.Context, _ string, _ []string, output io.Writer) error {
		_, err := output.Write(nmapDocument(`<host><status state="up"/><address addr="192.168.1.2" addrtype="ipv4"/></host>`, "1700000000"))
		return err
	}
	headers := map[string]string{"X-Atlas-Request": "1", "Content-Type": "application/json"}
	status := request(server, http.MethodGet, "/api/discovery/nmap/status", nil, map[string]string{"X-Atlas-Request": "1"})
	if status.Code != http.StatusOK || !strings.Contains(status.Body.String(), `"maxHosts":256`) || strings.Contains(status.Body.String(), "/test/nmap") {
		t.Fatalf("status=%d %s", status.Code, status.Body.String())
	}
	response := request(server, http.MethodPost, "/api/discovery/nmap/scan", []byte(`{"scope":"Lab","targets":"192.168.1.2","ports":"","detectServices":false}`), headers)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"homelab-atlas.nmap-import"`) {
		t.Fatalf("scan=%d %s", response.Code, response.Body.String())
	}
	for _, item := range []struct {
		body string
		code int
	}{
		{`{"scope":"Lab","targets":"host","ports":"","detectServices":false}`, http.StatusBadRequest},
		{`{"scope":"Lab","targets":"192.168.1.2","ports":"","detectServices":false,"extra":1}`, http.StatusBadRequest},
		{`{"scope":"Lab","targets":"192.168.1.2","ports":"","detectServices":false} {}`, http.StatusBadRequest},
	} {
		if got := request(server, http.MethodPost, "/api/discovery/nmap/scan", []byte(item.body), headers); got.Code != item.code {
			t.Errorf("body=%q status=%d want=%d", item.body, got.Code, item.code)
		}
	}
	if got := request(server, http.MethodPost, "/api/discovery/nmap/scan", []byte(`{}`), map[string]string{"X-Atlas-Request": "1", "Content-Type": "text/plain"}); got.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("media status=%d", got.Code)
	}
	if got := request(server, http.MethodGet, "/api/discovery/nmap/scan", nil, map[string]string{"X-Atlas-Request": "1"}); got.Code != http.StatusMethodNotAllowed {
		t.Fatalf("method status=%d", got.Code)
	}
}

func TestNmapCancellationRunnerReturnsPromptly(t *testing.T) {
	var once sync.Once
	scanner := testNmapScanner(t, func(ctx context.Context, _ string, _ []string, _ io.Writer) error {
		once.Do(func() {})
		<-ctx.Done()
		return ctx.Err()
	})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	start := time.Now()
	_, err := scanner.scan(ctx, nmapScanInput{Scope: "Lab", Targets: "192.168.1.2"})
	if !errors.Is(err, context.Canceled) || time.Since(start) > time.Second {
		t.Fatalf("cancel err=%v duration=%s", err, time.Since(start))
	}
}

func TestNmapTimeoutCancelsRunnerAndReleasesSlot(t *testing.T) {
	scanner := testNmapScanner(t, func(ctx context.Context, _ string, _ []string, _ io.Writer) error {
		<-ctx.Done()
		return ctx.Err()
	})
	scanner.timeout = 10 * time.Millisecond
	_, err := scanner.scan(context.Background(), nmapScanInput{Scope: "Lab", Targets: "192.168.1.2"})
	if err == nil || !strings.Contains(err.Error(), "timed out") {
		t.Fatalf("timeout err=%v", err)
	}
	if !scanner.acquire() {
		t.Fatal("timed-out scan did not release slot")
	}
	scanner.release()
}

func nmapProcessScript(t *testing.T, body string) string {
	t.Helper()
	root := ".agent/nmap-live-qa"
	if err := os.MkdirAll(root, 0o755); err != nil {
		t.Fatal(err)
	}
	directory, err := os.MkdirTemp(root, "process-test-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(directory) })
	path := filepath.Join(directory, "nmap-helper")
	if err := os.WriteFile(path, []byte("#!/bin/sh\n"+body+"\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestNmapRealProcessOverflowIs413AndReleasesSlot(t *testing.T) {
	server := testAtlasServer(t)
	server.nmap.path = nmapProcessScript(t, "exec head -c 2097153 /dev/zero")
	server.nmap.run = runNmapProcess
	headers := map[string]string{"X-Atlas-Request": "1", "Content-Type": "application/json"}
	body := []byte(`{"scope":"Lab","targets":"192.168.1.2","ports":"","detectServices":false}`)
	response := request(server, http.MethodPost, "/api/discovery/nmap/scan", body, headers)
	if response.Code != http.StatusRequestEntityTooLarge || !strings.Contains(response.Body.String(), "larger than 2 MB") {
		t.Fatalf("overflow status=%d body=%q", response.Code, response.Body.String())
	}
	if !server.nmap.acquire() {
		t.Fatal("overflow did not release scan slot")
	}
	server.nmap.release()
}

func TestNmapRealProcessCancelAndTimeoutReleaseSlot(t *testing.T) {
	for _, test := range []struct {
		name    string
		timeout time.Duration
		cancel  bool
	}{
		{name: "cancel", cancel: true},
		{name: "timeout", timeout: 30 * time.Millisecond},
	} {
		t.Run(test.name, func(t *testing.T) {
			scanner := testNmapScanner(t, runNmapProcess)
			scanner.path = nmapProcessScript(t, "exec sleep 30")
			scanner.timeout = test.timeout
			ctx, cancel := context.WithCancel(context.Background())
			if test.cancel {
				time.AfterFunc(30*time.Millisecond, cancel)
			} else {
				defer cancel()
			}
			start := time.Now()
			_, err := scanner.scan(ctx, nmapScanInput{Scope: "Lab", Targets: "192.168.1.2"})
			if test.cancel && !errors.Is(err, context.Canceled) {
				t.Fatalf("cancel err=%v", err)
			}
			if !test.cancel && (err == nil || !strings.Contains(err.Error(), "timed out")) {
				t.Fatalf("timeout err=%v", err)
			}
			if time.Since(start) > 2*time.Second {
				t.Fatalf("process termination took %s", time.Since(start))
			}
			if !scanner.acquire() {
				t.Fatal("terminated process did not release scan slot")
			}
			scanner.release()
		})
	}
}
