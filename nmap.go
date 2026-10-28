package main

// XML field projections adapted from github.com/Ullaakut/nmap xml.go at
// 95091f90b599d00827e6d42c609cbe4c3afeb0ac (MIT). Atlas's validation,
// normalization, identity, limits, and output types are original.

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net"
	"net/netip"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

const maxNmapBytes = 2_000_000

type nmapBundle struct {
	Format       string         `json:"format"`
	Version      int            `json:"version"`
	Scope        string         `json:"scope"`
	ScannedAt    string         `json:"scannedAt"`
	Snapshots    []nmapSnapshot `json:"snapshots"`
	SkippedHosts int            `json:"skippedHosts"`
	SkippedPorts int            `json:"skippedPorts"`
}

type nmapSnapshot struct {
	Format    string        `json:"format"`
	Version   int           `json:"version"`
	Source    nmapSource    `json:"source"`
	ScannedAt string        `json:"scannedAt"`
	Host      nmapHostInfo  `json:"host"`
	Findings  []nmapFinding `json:"findings"`
}

type nmapSource struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
type nmapHostInfo struct {
	Addresses []string `json:"addresses"`
	Hostnames []string `json:"hostnames"`
	MAC       string   `json:"mac"`
	Vendor    string   `json:"vendor"`
}
type nmapFinding struct {
	Key      string `json:"key"`
	Name     string `json:"name"`
	Kind     string `json:"kind"`
	Protocol string `json:"protocol,omitempty"`
	Port     int    `json:"port,omitempty"`
	Service  string `json:"service,omitempty"`
	Product  string `json:"product,omitempty"`
	Version  string `json:"version,omitempty"`
	Tunnel   string `json:"tunnel,omitempty"`
}

type nmapXML struct {
	XMLName  xml.Name  `xml:"nmaprun"`
	Scanner  string    `xml:"scanner,attr"`
	Hosts    []xmlHost `xml:"host"`
	Runstats []struct {
		Finished []xmlFinished `xml:"finished"`
	} `xml:"runstats"`
}
type xmlFinished struct {
	Time string `xml:"time,attr"`
	Exit string `xml:"exit,attr"`
}
type xmlHost struct {
	Status struct {
		State string `xml:"state,attr"`
	} `xml:"status"`
	Addresses []struct {
		Addr     string `xml:"addr,attr"`
		AddrType string `xml:"addrtype,attr"`
		Vendor   string `xml:"vendor,attr"`
	} `xml:"address"`
	Hostnames []struct {
		Name string `xml:"name,attr"`
	} `xml:"hostnames>hostname"`
	Ports []struct {
		Protocol string `xml:"protocol,attr"`
		PortID   string `xml:"portid,attr"`
		State    struct {
			State string `xml:"state,attr"`
		} `xml:"state"`
		Service struct {
			Name    string `xml:"name,attr"`
			Product string `xml:"product,attr"`
			Version string `xml:"version,attr"`
			Tunnel  string `xml:"tunnel,attr"`
		} `xml:"service"`
	} `xml:"ports>port"`
}

func normalizedScope(scope string) (string, string, error) {
	display := strings.Join(strings.Fields(scope), " ")
	if display == "" || len([]byte(display)) > 120 || !utf8.ValidString(display) {
		return "", "", errors.New("scope must be 1 to 120 UTF-8 bytes")
	}
	for _, r := range display {
		if unicode.IsControl(r) {
			return "", "", errors.New("scope must not contain control characters")
		}
	}
	return display, strings.ToLower(display), nil
}

func nmapDigest(parts ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(parts, "\x00")))
	return hex.EncodeToString(sum[:])
}

func preflightNmapXML(data []byte) error {
	decoder := xml.NewDecoder(bytes.NewReader(data))
	depth, roots, finished := 0, 0, false
	for {
		token, err := decoder.RawToken()
		if err == io.EOF {
			break
		}
		if err != nil {
			return errors.New("malformed Nmap XML")
		}
		switch value := token.(type) {
		case xml.StartElement:
			if depth == 0 {
				roots++
				if roots != 1 || value.Name.Local != "nmaprun" {
					return errors.New("XML must contain one nmaprun root")
				}
			}
			depth++
			if depth > 64 {
				return errors.New("Nmap XML nesting exceeds 64 levels")
			}
		case xml.EndElement:
			depth--
			if depth == 0 {
				finished = true
			}
		case xml.CharData:
			if finished && strings.TrimSpace(string(value)) != "" {
				return errors.New("unexpected data after nmaprun")
			}
		case xml.Directive:
			directive := strings.TrimSpace(string(value))
			if depth != 0 || directive != "DOCTYPE nmaprun" {
				return errors.New("only the standard <!DOCTYPE nmaprun> declaration is allowed")
			}
		}
	}
	if roots != 1 || depth != 0 {
		return errors.New("XML must contain one complete nmaprun root")
	}
	return nil
}

func parseNmapXML(data []byte, scope string) (nmapBundle, error) {
	displayScope, scopeID, err := normalizedScope(scope)
	if err != nil {
		return nmapBundle{}, err
	}
	if len(data) > maxNmapBytes {
		return nmapBundle{}, errors.New("Nmap XML is larger than 2 MB")
	}
	if err := preflightNmapXML(data); err != nil {
		return nmapBundle{}, err
	}
	var run nmapXML
	decoder := xml.NewDecoder(bytes.NewReader(data))
	decoder.Strict = true
	if err := decoder.Decode(&run); err != nil {
		return nmapBundle{}, errors.New("malformed Nmap XML")
	}
	if run.Scanner != "nmap" {
		return nmapBundle{}, errors.New("XML was not produced by Nmap")
	}
	if len(run.Runstats) != 1 || len(run.Runstats[0].Finished) != 1 || run.Runstats[0].Finished[0].Time == "" {
		return nmapBundle{}, errors.New("Nmap scan is incomplete")
	}
	finished := run.Runstats[0].Finished[0]
	if finished.Exit != "" && finished.Exit != "success" {
		return nmapBundle{}, errors.New("Nmap scan did not finish successfully")
	}
	seconds, err := strconv.ParseInt(finished.Time, 10, 64)
	if err != nil || seconds < 0 {
		return nmapBundle{}, errors.New("Nmap finish time is invalid")
	}
	scannedAt := time.Unix(seconds, 0).UTC().Format(time.RFC3339)
	bundle := nmapBundle{Format: "homelab-atlas.nmap-import", Version: 1, Scope: displayScope, ScannedAt: scannedAt, Snapshots: []nmapSnapshot{}}
	if len(run.Hosts) > 256 {
		return nmapBundle{}, errors.New("Nmap XML contains more than 256 hosts")
	}
	identities := map[string]bool{}
	totalFindings := 0
	for _, host := range run.Hosts {
		if host.Status.State != "up" {
			bundle.SkippedHosts++
			bundle.SkippedPorts += len(host.Ports)
			continue
		}
		snapshot, skipped, identity, err := normalizeNmapHost(host, scopeID, scannedAt)
		bundle.SkippedPorts += skipped
		if err != nil {
			return nmapBundle{}, err
		}
		if identity == "" {
			bundle.SkippedHosts++
			continue
		}
		if identities[identity] {
			return nmapBundle{}, errors.New("Nmap XML contains a duplicate host identity")
		}
		identities[identity] = true
		totalFindings += len(snapshot.Findings)
		if totalFindings > 1000 {
			return nmapBundle{}, errors.New("Nmap import would return more than 1000 findings")
		}
		bundle.Snapshots = append(bundle.Snapshots, snapshot)
	}
	sort.Slice(bundle.Snapshots, func(i, j int) bool { return bundle.Snapshots[i].Source.ID < bundle.Snapshots[j].Source.ID })
	return bundle, nil
}

func boundedNmapText(value string, limit int, label string) (string, error) {
	value = strings.TrimSpace(value)
	if !utf8.ValidString(value) || len([]byte(value)) > limit {
		return "", fmt.Errorf("Nmap %s is invalid or too long", label)
	}
	for _, r := range value {
		if unicode.IsControl(r) {
			return "", fmt.Errorf("Nmap %s contains control characters", label)
		}
	}
	return value, nil
}

func normalizeNmapHost(host xmlHost, scopeID, scannedAt string) (nmapSnapshot, int, string, error) {
	info := nmapHostInfo{Addresses: []string{}, Hostnames: []string{}}
	var ipv4, ipv6 []string
	seenAddresses := map[string]bool{}
	for _, address := range host.Addresses {
		switch address.AddrType {
		case "ipv4", "ipv6":
			parsed, err := netip.ParseAddr(address.Addr)
			if err != nil || (address.AddrType == "ipv4") != parsed.Is4() {
				return nmapSnapshot{}, 0, "", errors.New("Nmap host contains an invalid IP address")
			}
			canonical := parsed.String()
			if seenAddresses[canonical] {
				continue
			}
			seenAddresses[canonical] = true
			if address.AddrType == "ipv4" {
				ipv4 = append(ipv4, canonical)
			} else {
				ipv6 = append(ipv6, canonical)
			}
		case "mac":
			parsed, err := net.ParseMAC(address.Addr)
			if err != nil || len(parsed) != 6 {
				return nmapSnapshot{}, 0, "", errors.New("Nmap host contains an invalid MAC address")
			}
			mac := strings.ToUpper(parsed.String())
			if info.MAC != "" && info.MAC != mac {
				return nmapSnapshot{}, 0, "", errors.New("Nmap host contains multiple MAC addresses")
			}
			info.MAC = mac
			info.Vendor, err = boundedNmapText(address.Vendor, 120, "vendor")
			if err != nil {
				return nmapSnapshot{}, 0, "", err
			}
		}
	}
	sort.Strings(ipv4)
	sort.Strings(ipv6)
	info.Addresses = append(ipv4, ipv6...)
	if len(info.Addresses) == 0 {
		return nmapSnapshot{}, len(host.Ports), "", nil
	}
	if len(info.Addresses) > 16 {
		return nmapSnapshot{}, 0, "", errors.New("Nmap host has too many addresses")
	}
	seenNames := map[string]bool{}
	for _, hostname := range host.Hostnames {
		name, err := boundedNmapText(hostname.Name, 120, "hostname")
		if err != nil {
			return nmapSnapshot{}, 0, "", err
		}
		if name != "" && !seenNames[name] {
			seenNames[name] = true
			info.Hostnames = append(info.Hostnames, name)
		}
	}
	if len(info.Hostnames) > 16 {
		return nmapSnapshot{}, 0, "", errors.New("Nmap host has too many hostnames")
	}
	sort.Slice(info.Hostnames, func(i, j int) bool { return strings.ToLower(info.Hostnames[i]) < strings.ToLower(info.Hostnames[j]) })
	identity := "ip:" + info.Addresses[0]
	if info.MAC != "" {
		identity = "mac:" + info.MAC
	}
	name := info.Addresses[0]
	if len(info.Hostnames) > 0 {
		name = info.Hostnames[0]
	}
	sourceID := nmapDigest(scopeID, identity)
	snapshot := nmapSnapshot{Format: "homelab-atlas.nmap-discovery", Version: 1, Source: nmapSource{ID: sourceID, Name: name}, ScannedAt: scannedAt, Host: info}
	snapshot.Findings = []nmapFinding{{Key: "nmap-host:" + nmapDigest(identity), Name: name, Kind: "host"}}
	ports := map[string]bool{}
	skipped := 0
	for _, port := range host.Ports {
		if port.State.State != "open" || (port.Protocol != "tcp" && port.Protocol != "udp") {
			skipped++
			continue
		}
		number, err := strconv.Atoi(port.PortID)
		if err != nil || number < 1 || number > 65535 {
			return nmapSnapshot{}, 0, "", errors.New("Nmap host contains an invalid open port")
		}
		portIdentity := fmt.Sprintf("%s/%d", port.Protocol, number)
		if ports[portIdentity] {
			return nmapSnapshot{}, 0, "", errors.New("Nmap host contains a duplicate protocol/port")
		}
		ports[portIdentity] = true
		values := []*string{&port.Service.Name, &port.Service.Product, &port.Service.Version, &port.Service.Tunnel}
		labels := []string{"service", "product", "version", "tunnel"}
		for index := range values {
			value, e := boundedNmapText(*values[index], 120, labels[index])
			if e != nil {
				return nmapSnapshot{}, 0, "", e
			}
			*values[index] = value
		}
		base := port.Service.Product
		if base == "" {
			base = port.Service.Name
		}
		if base == "" {
			base = strings.ToUpper(port.Protocol)
		}
		endpointName := fmt.Sprintf("%s · %s/%d", base, port.Protocol, number)
		if len([]byte(endpointName)) > 120 {
			return nmapSnapshot{}, 0, "", errors.New("Nmap endpoint display name is too long")
		}
		snapshot.Findings = append(snapshot.Findings, nmapFinding{Key: "nmap:" + nmapDigest(identity, port.Protocol, strconv.Itoa(number)), Name: endpointName, Kind: "service", Protocol: port.Protocol, Port: number, Service: port.Service.Name, Product: port.Service.Product, Version: port.Service.Version, Tunnel: port.Service.Tunnel})
	}
	sort.Slice(snapshot.Findings[1:], func(i, j int) bool {
		a, b := snapshot.Findings[i+1], snapshot.Findings[j+1]
		if a.Protocol != b.Protocol {
			return a.Protocol < b.Protocol
		}
		return a.Port < b.Port
	})
	return snapshot, skipped, identity, nil
}
