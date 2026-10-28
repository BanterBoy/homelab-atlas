package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/netip"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	maxNmapTargets = 256
	maxNmapTerms   = 16
	maxNmapPorts   = 1000
	nmapTimeout    = 120 * time.Second
)

var errNmapOutputLarge = errors.New("Nmap output is larger than 2 MB")

type nmapRun func(context.Context, string, []string, io.Writer) error

type nmapScanner struct {
	path    string
	allowed []netip.Prefix
	run     nmapRun
	timeout time.Duration
	mu      sync.Mutex
	running bool
}

type nmapScanInput struct {
	Scope          string `json:"scope"`
	Targets        string `json:"targets"`
	Ports          string `json:"ports"`
	DetectServices bool   `json:"detectServices"`
}

func newNmapScanner(raw string) (*nmapScanner, error) {
	allowed, err := parseAllowedNmapCIDRs(raw)
	if err != nil {
		return nil, err
	}
	path, _ := exec.LookPath("nmap")
	return &nmapScanner{path: path, allowed: allowed, run: runNmapProcess}, nil
}

func parseAllowedNmapCIDRs(raw string) ([]netip.Prefix, error) {
	if strings.TrimSpace(raw) == "" {
		raw = "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
	}
	parts := strings.Split(raw, ",")
	if len(parts) > 64 {
		return nil, errors.New("ATLAS_NMAP_ALLOWED_CIDRS contains too many prefixes")
	}
	result := make([]netip.Prefix, 0, len(parts))
	seen := make(map[netip.Prefix]bool)
	for _, part := range parts {
		prefix, err := netip.ParsePrefix(strings.TrimSpace(part))
		if err != nil || !prefix.Addr().Is4() {
			return nil, errors.New("ATLAS_NMAP_ALLOWED_CIDRS must contain comma-separated IPv4 prefixes")
		}
		prefix = prefix.Masked()
		if !seen[prefix] {
			seen[prefix] = true
			result = append(result, prefix)
		}
	}
	if len(result) == 0 {
		return nil, errors.New("ATLAS_NMAP_ALLOWED_CIDRS must not be empty")
	}
	sort.Slice(result, func(i, j int) bool { return result[i].String() < result[j].String() })
	return result, nil
}

func (scanner *nmapScanner) status() any {
	ranges := make([]string, len(scanner.allowed))
	for index, prefix := range scanner.allowed {
		ranges[index] = prefix.String()
	}
	return struct {
		Available      bool     `json:"available"`
		AllowedCIDRs   []string `json:"allowedCidrs"`
		MaxHosts       int      `json:"maxHosts"`
		TimeoutSeconds int      `json:"timeoutSeconds"`
	}{scanner.path != "", ranges, maxNmapTargets, int(nmapTimeout / time.Second)}
}

func (scanner *nmapScanner) acquire() bool {
	scanner.mu.Lock()
	defer scanner.mu.Unlock()
	if scanner.running {
		return false
	}
	scanner.running = true
	return true
}

func (scanner *nmapScanner) release() {
	scanner.mu.Lock()
	scanner.running = false
	scanner.mu.Unlock()
}

func splitTargetTerms(raw string) ([]string, error) {
	if strings.TrimSpace(raw) == "" || strings.HasPrefix(strings.TrimSpace(raw), "-") || strings.Contains(raw, ",,") {
		return nil, errors.New("enter IPv4 addresses or CIDRs")
	}
	terms := strings.FieldsFunc(raw, func(r rune) bool { return r == ',' || r == ' ' || r == '\t' || r == '\r' || r == '\n' })
	if len(terms) == 0 || len(terms) > maxNmapTerms {
		return nil, fmt.Errorf("targets must contain 1 to %d terms", maxNmapTerms)
	}
	return terms, nil
}

func (scanner *nmapScanner) targets(raw string) ([]string, error) {
	terms, err := splitTargetTerms(raw)
	if err != nil {
		return nil, err
	}
	addresses := make(map[netip.Addr]bool)
	for _, term := range terms {
		var prefix netip.Prefix
		if strings.Contains(term, "/") {
			prefix, err = netip.ParsePrefix(term)
			if err != nil || !prefix.Addr().Is4() || prefix != prefix.Masked() {
				return nil, errors.New("targets must be canonical numeric IPv4 addresses or CIDRs")
			}
			if prefix.Bits() < 24 {
				return nil, fmt.Errorf("target expansion exceeds %d addresses", maxNmapTargets)
			}
		} else {
			address, parseErr := netip.ParseAddr(term)
			if parseErr != nil || !address.Is4() {
				return nil, errors.New("targets must be numeric IPv4 addresses or CIDRs")
			}
			prefix = netip.PrefixFrom(address, 32)
		}
		for address := prefix.Addr(); prefix.Contains(address); address = address.Next() {
			if address.IsUnspecified() || address.IsMulticast() || address.IsLinkLocalUnicast() || address == netip.MustParseAddr("255.255.255.255") {
				return nil, errors.New("targets contain an unsupported special-purpose address")
			}
			allowed := false
			for _, candidate := range scanner.allowed {
				if candidate.Contains(address) {
					allowed = true
					break
				}
			}
			if !allowed {
				return nil, errors.New("targets are outside the configured allowed ranges")
			}
			addresses[address] = true
			if len(addresses) > maxNmapTargets {
				return nil, fmt.Errorf("target expansion exceeds %d addresses", maxNmapTargets)
			}
		}
	}
	result := make([]netip.Addr, 0, len(addresses))
	for address := range addresses {
		result = append(result, address)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Less(result[j]) })
	canonical := make([]string, len(result))
	for index, address := range result {
		canonical[index] = address.String()
	}
	return canonical, nil
}

func canonicalNmapPorts(raw string) (string, error) {
	if strings.TrimSpace(raw) == "" {
		return "", nil
	}
	if strings.TrimSpace(raw) != raw || strings.ContainsAny(raw, " \t\r\n") || strings.HasPrefix(raw, "-") || strings.Contains(raw, ",,") {
		return "", errors.New("ports must be comma-separated numbers or ranges")
	}
	ports := make(map[int]bool)
	for _, term := range strings.Split(raw, ",") {
		bounds := strings.Split(term, "-")
		if len(bounds) > 2 || bounds[0] == "" || (len(bounds) == 2 && bounds[1] == "") {
			return "", errors.New("ports must be comma-separated numbers or ranges")
		}
		first, err := strconv.Atoi(bounds[0])
		if err != nil || first < 1 || first > 65535 || strconv.Itoa(first) != bounds[0] {
			return "", errors.New("ports must be between 1 and 65535")
		}
		last := first
		if len(bounds) == 2 {
			last, err = strconv.Atoi(bounds[1])
			if err != nil || last < first || last > 65535 || strconv.Itoa(last) != bounds[1] {
				return "", errors.New("port ranges must be ascending and between 1 and 65535")
			}
		}
		if last-first+1 > maxNmapPorts {
			return "", fmt.Errorf("ports exceed the %d-port limit", maxNmapPorts)
		}
		for port := first; port <= last; port++ {
			ports[port] = true
			if len(ports) > maxNmapPorts {
				return "", fmt.Errorf("ports exceed the %d-port limit", maxNmapPorts)
			}
		}
	}
	values := make([]int, 0, len(ports))
	for port := range ports {
		values = append(values, port)
	}
	sort.Ints(values)
	result := make([]string, len(values))
	for index, port := range values {
		result[index] = strconv.Itoa(port)
	}
	return strings.Join(result, ","), nil
}

type cancelingLimitWriter struct {
	buffer bytes.Buffer
	limit  int
	cancel context.CancelFunc
}

func (writer *cancelingLimitWriter) Write(data []byte) (int, error) {
	if writer.buffer.Len()+len(data) > writer.limit {
		writer.cancel()
		return 0, errNmapOutputLarge
	}
	return writer.buffer.Write(data)
}

func runNmapProcess(ctx context.Context, path string, args []string, output io.Writer) error {
	command := exec.CommandContext(ctx, path, args...)
	command.Stdout = output
	command.Stderr = io.Discard
	command.WaitDelay = 2 * time.Second
	return command.Run()
}

func (scanner *nmapScanner) scan(ctx context.Context, input nmapScanInput) (nmapBundle, error) {
	targets, err := scanner.targets(input.Targets)
	if err != nil {
		return nmapBundle{}, err
	}
	ports, err := canonicalNmapPorts(input.Ports)
	if err != nil {
		return nmapBundle{}, err
	}
	if _, _, err := normalizedScope(input.Scope); err != nil {
		return nmapBundle{}, err
	}
	if scanner.path == "" {
		return nmapBundle{}, errors.New("Nmap is not installed on this Atlas server")
	}
	if !scanner.acquire() {
		return nmapBundle{}, errNmapBusy
	}
	defer scanner.release()

	deadline := scanner.timeout
	if deadline == 0 {
		deadline = nmapTimeout
	}
	ctx, cancel := context.WithTimeout(ctx, deadline)
	defer cancel()
	args := []string{"--unprivileged", "-sT", "-n", "-T3", "--max-retries", "1", "--max-parallelism", "32", "--host-timeout", "15s"}
	if ports == "" {
		args = append(args, "--top-ports", "100")
	} else {
		args = append(args, "-p", ports)
	}
	if input.DetectServices {
		args = append(args, "-sV", "--version-light")
	}
	args = append(args, "-oX", "-")
	args = append(args, targets...)
	output := &cancelingLimitWriter{limit: maxNmapBytes, cancel: cancel}
	if err := scanner.run(ctx, scanner.path, args, output); err != nil {
		if errors.Is(err, errNmapOutputLarge) || output.buffer.Len() > maxNmapBytes {
			return nmapBundle{}, errNmapOutputLarge
		}
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return nmapBundle{}, errors.New("Nmap scan timed out after 120 seconds")
		}
		if errors.Is(ctx.Err(), context.Canceled) {
			return nmapBundle{}, context.Canceled
		}
		return nmapBundle{}, errors.New("Nmap scan failed")
	}
	return parseNmapXML(output.buffer.Bytes(), input.Scope)
}

var errNmapBusy = errors.New("another Nmap scan is already running")

func decodeNmapScanInput(request *http.Request) (nmapScanInput, error) {
	data, err := io.ReadAll(io.LimitReader(request.Body, 4097))
	if err != nil || len(data) > 4096 {
		return nmapScanInput{}, errors.New("invalid request")
	}
	var input nmapScanInput
	if err := decodeStrict(data, &input); err != nil {
		return nmapScanInput{}, errors.New("invalid request")
	}
	return input, nil
}

func writeNmapBundle(writer http.ResponseWriter, request *http.Request, bundle nmapBundle) {
	encoded, err := json.Marshal(bundle)
	if err != nil || len(encoded)+1 > maxNmapBytes {
		http.Error(writer, "normalized Nmap results are too large", http.StatusRequestEntityTooLarge)
		return
	}
	writeBody(writer, request, http.StatusOK, "application/json; charset=utf-8", append(encoded, '\n'))
}
