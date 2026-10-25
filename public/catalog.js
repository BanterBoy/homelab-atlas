import { ICON_DATA } from './icon-data.js';

const entries = [
  ['truenas','TrueNAS','Storage','#0095d5'],['unraid','Unraid','Storage','#f15a2c'],['proxmox','Proxmox','Platform','#e57000'],['docker','Docker','Platform','#2496ed'],['podman','Podman','Platform','#892ca0'],['raspberry-pi','Raspberry Pi','Platform','#c51a4a'],['ubuntu','Ubuntu','Operating system','#e95420'],['debian','Debian','Operating system','#a81d33'],['fedora','Fedora','Operating system','#51a2da'],['linux','Linux','Operating system','#f2c744'],['ubiquiti','Ubiquiti','Network','#2b7cff'],['amd','AMD','Hardware','#ed1c24'],['intel','Intel','Hardware','#0071c5'],
  ['jellyfin','Jellyfin','Media','#aa5cc3'],['plex','Plex','Media','#e5a00d'],['sonarr','Sonarr','Media','#35c5f4'],['radarr','Radarr','Media','#ffc230'],['prowlarr','Prowlarr','Media','#e5a94c'],['bazarr','Bazarr','Media','#8bc34a'],['seerr','Seerr','Media','#7c3aed'],['qbittorrent','qBittorrent','Downloads','#2f67ba'],['sabnzbd','SABnzbd','Downloads','#f2b134'],['tdarr','Tdarr','Media','#38bdf8'],['immich','Immich','Media','#4250af'],['nextcloud','Nextcloud','Cloud','#0082c9'],['syncthing','Syncthing','Cloud','#0891d1'],
  ['home-assistant','Home Assistant','Home automation','#18bcf2'],['music-assistant','Music Assistant','Home automation','#ef476f'],['mosquitto','Mosquitto','Home automation','#660066'],['node-red','Node-RED','Automation','#8f0000'],['n8n','n8n','Automation','#ff6d5a'],
  ['matter-light','Matter','Home automation','#ffffff'],['teslamate','TeslaMate','Home automation','#363636'],
  ['grafana','Grafana','Observability','#f46800'],['prometheus','Prometheus','Observability','#e6522c'],['uptime-kuma','Uptime Kuma','Observability','#5cdd8b'],['netdata','Netdata','Observability','#00ab44'],['portainer','Portainer','Management','#13bef9'],['dockge','Dockge','Management','#74c0fc'],['homepage','Homepage','Dashboard','#6b8afd'],['homarr','Homarr','Dashboard','#fa5252'],
  ['goaccess-light','GoAccess','Observability','#65d8fd'],
  ['adguard-home','AdGuard Home','Network','#68bc71'],['pi-hole','Pi-hole','Network','#96060c'],['nginx-proxy-manager','Nginx Proxy Manager','Network','#2a9d8f'],['nginx','nginx','Network','#009639'],['traefik','Traefik','Network','#24a1c1'],['caddy','Caddy','Network','#22d3ee'],['cloudflare','Cloudflare','Network','#f38020'],['tailscale','Tailscale','Network','#94a3b8'],['wireguard','WireGuard','Network','#88171a'],
  ['adguard-home-sync','AdGuard Home Sync','Network','#68bc71'],
  ['postgresql','PostgreSQL','Database','#4169e1'],['redis','Redis','Database','#dc382d'],['mariadb','MariaDB','Database','#c0765a'],['mysql','MySQL','Database','#4479a1'],['mongodb','MongoDB','Database','#47a248'],['minio','MinIO','Storage','#c72c48'],
  ['valkey','Valkey','Database','#123678'],
  ['vaultwarden','Vaultwarden','Security','#175ddc'],['authentik','Authentik','Security','#fd4b2d'],['authelia','Authelia','Security','#3f95d2'],['gitea','Gitea','Development','#609926'],['gitlab','GitLab','Development','#fc6d26'],
  ['python','Python','Development','#306998'],['chromium','Chromium','Productivity','#4285f4'],
  ['paperless-ngx','Paperless-ngx','Productivity','#1f8f5f'],['mealie','Mealie','Productivity','#e66b38'],['freshrss','FreshRSS','Productivity','#2f9e44'],['miniflux','Miniflux','Productivity','#364fc7'],['audiobookshelf','Audiobookshelf','Media','#b85c38'],['calibre-web','Calibre Web','Media','#4dabf7'],['kavita','Kavita','Media','#7c4dff'],['komga','Komga','Media','#7048e8'],['stirling-pdf','Stirling PDF','Productivity','#e03131'],['searxng','SearXNG','Productivity','#3050ff'],['xwiki','XWiki','Productivity','#4c6ef5'],['docmost','Docmost','Productivity','#6d5dfc'],
  ['open-webui','Open WebUI','AI','#111827'],['ollama','Ollama','AI','#94a3b8'],['qwen','Qwen','AI','#615ced'],['restic','Restic','Backup','#56b4c2'],['duplicati','Duplicati','Backup','#1b5e9e'],['kopia','Kopia','Backup','#818cf8'],
  ['hermes-agent','Hermes Agent','AI','#8294a8'],['litellm-light','LiteLLM','AI','#ffffff'],['llama-cpp','llama.cpp','AI','#ff8236'],['byparr','Byparr','Media','#cc7a3d'],
  ['server','Server','Device','#155e75'],['router','Router','Device','#0f766e'],['switch','Switch','Device','#0369a1'],['wifi','Wi-Fi','Device','#7c3aed'],['internet','Internet','Device','#0e7490'],['generic','Custom service','Other','#64748b'],
  ['utility-clock','Clock','Other','#8294a8'],['utility-code','Code','Other','#8294a8'],['utility-shield','Shield','Other','#8294a8'],['utility-wave','Audio waveform','Other','#8294a8'],['utility-speaker','Speaker','Other','#8294a8'],['utility-mic','Microphone','Other','#8294a8'],['utility-sun','Sun','Other','#8294a8'],['utility-api','API','Other','#8294a8'],['utility-book','Book','Other','#8294a8']
];

export const LOGOS = entries.map(([id,label,category,color,aliases = []]) => ({id,label,category,color,aliases}));
export const LOGO_IDS = new Set(LOGOS.map(x => x.id));
export const logoById = id => LOGOS.find(x => x.id === id) || LOGOS.find(x => x.id === 'generic');
const LIGHT_PLATES = new Set(['hermes-agent', 'intel', 'ollama', 'open-webui', 'portainer', 'valkey', 'vaultwarden']);
const DARK_PLATES = new Set(['amd', 'docmost', 'goaccess-light', 'litellm-light', 'matter-light', 'miniflux', 'tailscale']);

export function logoDataUri(id) {
  return ICON_DATA[id] || (id === 'restic' ? ICON_DATA.backup : ICON_DATA.generic);
}

export function logoPlate(id, theme = 'navy') {
  if (theme === 'light') return DARK_PLATES.has(id) ? '#111827' : null;
  return LIGHT_PLATES.has(id) ? '#f8fafc' : null;
}

const normalizeLogoSearch = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export function searchLogos(logos, query) {
  const needle = normalizeLogoSearch(query);
  return logos.filter(logo => normalizeLogoSearch([logo.id, logo.label, logo.category, ...(logo.aliases || [])].join(' ')).includes(needle));
}

export function networkLogoId(network) {
  if (network.icon) return network.icon;
  const kind = network.kind.toLowerCase();
  if (kind.includes('ubiquiti') || kind.includes('unifi')) return 'ubiquiti';
  if (kind.includes('internet')) return 'internet';
  if (kind.includes('router')) return 'router';
  if (kind.includes('switch')) return 'switch';
  if (kind.includes('wi-fi') || kind.includes('wifi')) return 'wifi';
  return 'generic';
}
