package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func nmapDocument(hosts, finished string) []byte {
	return []byte(`<?xml version="1.0"?><!DOCTYPE nmaprun><nmaprun scanner="nmap">` + hosts + `<runstats><finished time="` + finished + `" exit="success"/></runstats></nmaprun>`)
}

func TestNmapMultiHostNormalizationAndStableIdentity(t *testing.T) {
	hostA := `<host><status state="up"/><address addr="192.0.2.10" addrtype="ipv4"/><address addr="AA-BB-CC-DD-EE-FF" addrtype="mac" vendor="Acme &amp; Co"/><hostnames><hostname name="café.example"/></hostnames><ports><port protocol="tcp" portid="443"><state state="open"/><service name="https" product="Caddy" version="2.8" tunnel="ssl"/></port><port protocol="tcp" portid="80"><state state="filtered"/></port></ports><hostscript><script output="secret"><table><elem>credential</elem></table></script></hostscript></host>`
	hostB := `<host><status state="up"/><address addr="2001:0db8::1" addrtype="ipv6"/><ports><port protocol="udp" portid="53"><state state="open"/><service name="domain"/></port></ports></host>`
	bundle, err := parseNmapXML(nmapDocument(hostA+hostB, "1700000000"), " Home   Network ")
	if err != nil {
		t.Fatal(err)
	}
	if bundle.Scope != "Home Network" || len(bundle.Snapshots) != 2 || bundle.SkippedPorts != 1 {
		t.Fatalf("unexpected bundle: %+v", bundle)
	}
	encoded, _ := json.Marshal(bundle)
	if strings.Contains(string(encoded), "secret") || strings.Contains(string(encoded), "credential") {
		t.Fatal("script output retained")
	}
	var macHost *nmapSnapshot
	for index := range bundle.Snapshots {
		if bundle.Snapshots[index].Host.MAC != "" {
			macHost = &bundle.Snapshots[index]
		}
	}
	if macHost == nil || macHost.Host.MAC != "AA:BB:CC:DD:EE:FF" || macHost.Host.Vendor != "Acme & Co" || len(macHost.Findings) != 2 {
		t.Fatalf("unexpected MAC host: %+v", macHost)
	}
	changed := strings.Replace(hostA, "192.0.2.10", "192.0.2.11", 1)
	again, err := parseNmapXML(nmapDocument(hostB+changed, "1700000100"), "home network")
	if err != nil {
		t.Fatal(err)
	}
	for index := range again.Snapshots {
		if again.Snapshots[index].Host.MAC != "" && again.Snapshots[index].Source.ID != macHost.Source.ID {
			t.Fatal("MAC identity changed with IP, order, case, or timestamp")
		}
	}
	different, _ := parseNmapXML(nmapDocument(hostA, "1700000000"), "Guest")
	if different.Snapshots[0].Source.ID == macHost.Source.ID {
		t.Fatal("different scopes collided")
	}
}

func TestNmapPingOnlyAndExclusions(t *testing.T) {
	hosts := `<host><status state="up"/><address addr="192.0.2.1" addrtype="ipv4"/></host><host><status state="down"/><address addr="192.0.2.2" addrtype="ipv4"/><ports><port protocol="tcp" portid="22"><state state="open"/></port></ports></host><host><status state="up"/><ports><port protocol="tcp" portid="22"><state state="open"/></port></ports></host>`
	bundle, err := parseNmapXML(nmapDocument(hosts, "1"), "Lab")
	if err != nil {
		t.Fatal(err)
	}
	if len(bundle.Snapshots) != 1 || len(bundle.Snapshots[0].Findings) != 1 || bundle.Snapshots[0].Findings[0].Kind != "host" || bundle.SkippedHosts != 2 || bundle.SkippedPorts != 2 {
		t.Fatalf("unexpected result: %+v", bundle)
	}
}

func TestNmapRejectsUnsafeMalformedAndInvalidValues(t *testing.T) {
	validHost := `<host><status state="up"/><address addr="192.0.2.1" addrtype="ipv4"/></host>`
	cases := map[string][]byte{
		"malformed":       []byte(`<nmaprun scanner="nmap">`),
		"wrong root":      []byte(`<scan/>`),
		"wrong scanner":   []byte(`<nmaprun scanner="masscan"><runstats><finished time="1"/></runstats></nmaprun>`),
		"incomplete":      []byte(`<nmaprun scanner="nmap">` + validHost + `</nmaprun>`),
		"failed":          []byte(`<nmaprun scanner="nmap"><runstats><finished time="1" exit="error"/></runstats></nmaprun>`),
		"multiple roots":  append(nmapDocument(validHost, "1"), []byte(`<nmaprun/>`)...),
		"internal entity": []byte(`<!DOCTYPE nmaprun [<!ENTITY x "secret">]><nmaprun scanner="nmap"><runstats><finished time="1"/></runstats></nmaprun>`),
		"external DTD":    []byte(`<!DOCTYPE nmaprun SYSTEM "https://example.invalid/x"><nmaprun scanner="nmap"><runstats><finished time="1"/></runstats></nmaprun>`),
		"invalid IP":      nmapDocument(`<host><status state="up"/><address addr="999.1.1.1" addrtype="ipv4"/></host>`, "1"),
		"invalid port":    nmapDocument(`<host><status state="up"/><address addr="192.0.2.1" addrtype="ipv4"/><ports><port protocol="tcp" portid="70000"><state state="open"/></port></ports></host>`, "1"),
	}
	for name, data := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := parseNmapXML(data, "Lab"); err == nil {
				t.Fatal("accepted invalid XML")
			}
		})
	}
	stylesheet := append([]byte(`<?xml-stylesheet href="https://example.invalid/x"?>`), nmapDocument(validHost, "1")...)
	if _, err := parseNmapXML(stylesheet, "Lab"); err != nil {
		t.Fatalf("stylesheet should be ignored: %v", err)
	}
}

func TestNmapLimitsDuplicatesAndDepth(t *testing.T) {
	if _, err := parseNmapXML(make([]byte, maxNmapBytes+1), "Lab"); err == nil {
		t.Fatal("accepted oversized input")
	}
	deep := strings.Repeat("<x>", 64) + strings.Repeat("</x>", 64)
	if _, err := parseNmapXML(nmapDocument(deep, "1"), "Lab"); err == nil {
		t.Fatal("accepted excessive depth")
	}
	duplicate := `<host><status state="up"/><address addr="192.0.2.1" addrtype="ipv4"/><ports><port protocol="tcp" portid="80"><state state="open"/></port><port protocol="tcp" portid="80"><state state="open"/></port></ports></host>`
	if _, err := parseNmapXML(nmapDocument(duplicate, "1"), "Lab"); err == nil {
		t.Fatal("accepted duplicate port")
	}
	duplicateHost := `<host><status state="up"/><address addr="192.0.2.1" addrtype="ipv4"/></host>`
	if _, err := parseNmapXML(nmapDocument(duplicateHost+duplicateHost, "1"), "Lab"); err == nil {
		t.Fatal("accepted duplicate host")
	}
	if _, err := parseNmapXML([]byte(`<nmaprun scanner="nmap"><runstats><finished time="1"/></runstats><runstats><finished time="1"/></runstats></nmaprun>`), "Lab"); err == nil {
		t.Fatal("accepted duplicate runstats")
	}
	if _, _, err := normalizedScope("\x00bad"); err == nil {
		t.Fatal("accepted control in scope")
	}
}
