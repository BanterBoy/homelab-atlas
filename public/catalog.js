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
  ['at-t','AT&T','ISP · US','#009fdb',['att','atandt','AT&T Fiber','United States']],
  ['verizon','Verizon','ISP · US','#e60000',['fios','United States']],
  ['kpn','KPN','ISP · Europe','#00a95c',['Netherlands','Dutch']],
  ['orange','Orange','ISP · Europe','#ff7900',['France','Spain','Poland']],
  ['telekom','Deutsche Telekom','ISP · Europe','#e20074',['Germany','Magenta','Telekom']],
  ['vodafone','Vodafone','ISP · Europe','#e60000',['Germany','UK','United Kingdom','Spain','Portugal','Ireland']],
  ['t-mobile','T-Mobile','ISP · US','#e20074',['tmobile','T-Mobile Home Internet','5G','United States']],
  ['xfinity','Xfinity','ISP · US','#6c00e8',['Comcast','United States']],
  ['free-isp','Free','ISP · Europe','#cc0000',['Iliad','Freebox','France']],
  ['bt','BT','ISP · Europe','#6400AA',['British Telecom','United Kingdom','UK']],
  ['movistar','Movistar','ISP · Europe','#019DF4',['Spain','Telefonica']],
  ['o2','O2','ISP · Europe','#0050FF',['United Kingdom','UK','Germany','Telefonica']],
  ['sky','Sky','ISP · Europe','#0072C9',['United Kingdom','UK','Italy','Ireland']],
  ['sunrise','Sunrise','ISP · Europe','#DA291C',['Switzerland']],
  ['telenor','Telenor','ISP · Europe','#00C8FF',['Norway','Sweden','Nordic']],
  ['ziggo','Ziggo','ISP · Europe','#F48C00',['Netherlands','Dutch']],
  ['frontier','Frontier','ISP · US','#ff0037',['Frontier Fiber','United States']],
  ['google-fiber','Google Fiber','ISP · US','#1a73e8',['GFiber','United States']],
  ['bouygues-telecom','Bouygues Telecom','ISP · Europe','#009dcc',['Bbox','France']],
  ['tim','TIM','ISP · Europe','#004691',['Telecom Italia','Italy']],
  ['swisscom','Swisscom','ISP · Europe','#001155',['Switzerland']],
  ['spectrum','Spectrum','ISP · US','#0073d1',['Charter','Charter Spectrum','United States']],
  ['cox','Cox','ISP · US','#0072ce',['Cox Communications','United States']],
  ['starlink','Starlink','ISP · US','#111111',['SpaceX','Satellite','US','Europe','Global']],
  ['virgin-media','Virgin Media','ISP · Europe','#ED1A37',['United Kingdom','UK','Ireland','Virgin']],
  ['1and1','1&1','ISP · Europe','#003D8F',['1and1','1und1','Germany']],
  ['telia','Telia','ISP · Europe','#990ae3',['Sweden','Finland','Norway','Nordic','Lithuania','Estonia']],
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
export const customLogoEntries = customLogos => (customLogos || []).map(logo => ({ ...logo, category: 'Uploaded', aliases: [] }));
export const logoById = (id, customLogos = []) => customLogoEntries(customLogos).find(x => x.id === id) || LOGOS.find(x => x.id === id) || LOGOS.find(x => x.id === 'generic');
const LIGHT_PLATES = new Set(['hermes-agent', 'intel', 'ollama', 'open-webui', 'portainer', 'valkey', 'vaultwarden', 'kpn', 'xfinity', 'free-isp', 'bt', 'o2', 'sky', 'bouygues-telecom', 'spectrum', 'starlink', 'virgin-media', '1and1']);
const DARK_PLATES = new Set(['amd', 'docmost', 'goaccess-light', 'litellm-light', 'matter-light', 'miniflux', 'tailscale', 'frontier', 'tim']);

export function logoDataUri(id, customLogos = []) {
  return customLogos.find(logo => logo.id === id)?.dataUrl || ICON_DATA[id] || (id === 'restic' ? ICON_DATA.backup : ICON_DATA.generic);
}

export function logoPlate(id, theme = 'navy', customLogos = []) {
  const background = customLogos.find(logo => logo.id === id)?.background;
  if (background) return background === 'light' ? '#f8fafc' : background === 'dark' ? '#111827' : null;
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
