#!/bin/sh
set -eu
OPTIONS=/data/options.json

option() {
	jq -r --arg key "$1" '.[$key] // ""' "$OPTIONS"
}

if [ -f "$OPTIONS" ]; then
	cidrs="$(option nmap_allowed_cidrs)"
	if [ -n "$cidrs" ]; then
		export ATLAS_NMAP_ALLOWED_CIDRS="$cidrs"
	fi

	collector_url="$(option collector_url)"
	if [ -n "$collector_url" ]; then
		ATLAS_COLLECTOR_TOKEN="$(option collector_token)"
		export ATLAS_COLLECTOR_TOKEN
		export ATLAS_DISCOVERY_SOURCES=/tmp/discovery-sources.json
		jq -n --arg url "$collector_url" \
			'[{id: "localdocker", name: "Docker", url: $url, tokenEnv: "ATLAS_COLLECTOR_TOKEN"}]' \
			> "$ATLAS_DISCOVERY_SOURCES"
	fi
fi

echo "Starting Homelab Atlas (open it from the Home Assistant sidebar)"
exec atlas
