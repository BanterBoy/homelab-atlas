import { LOGO_IDS, logoDataUri, logoPlate } from './catalog.js';

export const SCHEMA_VERSION = 1;
export const THEMES = ['navy', 'light', 'midnight'];
export const DENSITIES = ['comfortable', 'compact'];
export const LIMITS = {
  bytes: 1_000_000,
  devices: 80,
  services: 800,
  groups: 160,
  networks: 30,
  connections: 160,
  text: 120,
  hardware: 12,
};

const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const FONT = "ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const palettes = {
  navy: { bg: '#0b1117', panel: '#101923', card: '#121c26', tile: '#0d151e', line: '#263747', text: '#eff3f8', muted: '#a2b3c6', teal: '#55d6c9' },
  light: { bg: '#edf1f4', panel: '#f7f9fa', card: '#ffffff', tile: '#f2f5f7', line: '#bac6cf', text: '#17212b', muted: '#607282', teal: '#087f79' },
  midnight: { bg: '#0c0b12', panel: '#14131c', card: '#191823', tile: '#111019', line: '#343143', text: '#f2f0f7', muted: '#aaa5b8', teal: '#63d7ca' },
};

export function uid(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}-${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
export const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[character]);

function services(prefix, items) {
  return items.map(([logo, name, count = 1], index) => ({ id: `svc-${prefix}-${index}`, logo, name, count }));
}

export function sampleProject() {
  return {
    schemaVersion: 1,
    revision: 1,
    title: 'Home Lab',
    subtitle: 'Private infrastructure · Local services · Built to last',
    theme: 'navy',
    columns: 3,
    density: 'comfortable',
    networks: [
      { id: 'net-internet', name: 'Internet', kind: 'Internet', accent: '#48bfe3' },
      { id: 'net-router', name: 'Core Router', kind: 'Router', accent: '#55d6c9' },
      { id: 'net-switch', name: 'UniFi Switch', kind: 'Ubiquiti Switch', accent: '#7dd3fc' },
    ],
    vlans: [
      { id: 'vlan-management', name: '01 Management', color: '#55d6c9' },
      { id: 'vlan-main', name: '10 Main', color: '#8db4d6' },
      { id: 'vlan-servers', name: '20 Servers', color: '#7aa2c6' },
      { id: 'vlan-iot', name: '30 IoT', color: '#f0a36a' },
      { id: 'vlan-lab', name: '40 Lab', color: '#a78bfa' },
      { id: 'vlan-guest', name: '50 Guest', color: '#91a4b7' },
    ],
    devices: [
      {
        id: 'dev-storage', name: 'Atlas', role: 'TrueNAS / storage', icon: 'truenas', accent: '#55d6c9', network: '20 Servers',
        hardware: ['i5-13500 · 32 GB RAM', '5 × 26 TB · RAIDZ1', '2 × 2 TB NVMe · mirror'],
        groups: [
          { id: 'grp-infra', name: 'Containers', services: services('atlas-a', [['nginx-proxy-manager', 'Proxy Manager'], ['adguard-home', 'AdGuard'], ['syncthing', 'DNS Sync'], ['portainer', 'Portainer'], ['dockge', 'Dockge'], ['homepage', 'Homepage'], ['gitea', 'Gitea'], ['uptime-kuma', 'Uptime Kuma'], ['searxng', 'SearXNG'], ['xwiki', 'XWiki'], ['docmost', 'Docmost'], ['prometheus', 'Metrics'], ['freshrss', 'FreshRSS'], ['paperless-ngx', 'Paperless'], ['immich', 'Immich'], ['nextcloud', 'Nextcloud'], ['vaultwarden', 'Vaultwarden'], ['tailscale', 'Tailscale'], ['nginx', 'Admin ingress'], ['wireguard', 'Net guards']]) },
          { id: 'grp-cloud', name: 'Data services', services: services('atlas-b', [['postgresql', 'Postgres', 2], ['redis', 'Redis'], ['minio', 'MinIO'], ['restic', 'Backups']]) },
        ],
      },
      {
        id: 'dev-media', name: 'Relay', role: 'Unraid / media + voice', icon: 'unraid', accent: '#f28a61', network: '20 Servers',
        hardware: ['i9-10900K · 32 GB RAM', 'RTX 3060 · 12 GB', '7 data HDDs + 2 parity · NVMe mirror'],
        groups: [
          { id: 'grp-media', name: 'Containers', services: services('relay-a', [['jellyfin', 'Jellyfin'], ['sonarr', 'Sonarr', 3], ['radarr', 'Radarr'], ['prowlarr', 'Prowlarr'], ['bazarr', 'Bazarr', 3], ['seerr', 'Seerr'], ['sabnzbd', 'SABnzbd'], ['qbittorrent', 'qBittorrent'], ['tdarr', 'Tdarr', 3], ['open-webui', 'Open WebUI'], ['adguard-home', 'AdGuard'], ['grafana', 'Grafana'], ['postgresql', 'Postgres'], ['home-assistant', 'HA helper'], ['ollama', 'llama.cpp'], ['music-assistant', 'Music Assistant'], ['mosquitto', 'Mosquitto'], ['node-red', 'Node-RED']]) },
          { id: 'grp-ha', name: 'Home automation', services: services('relay-b', [['home-assistant', 'Home Assistant'], ['node-red', 'Node-RED'], ['music-assistant', 'Music'], ['mosquitto', 'MQTT']]) },
        ],
      },
      {
        id: 'dev-ai', name: 'Vector', role: 'Fedora / local AI', icon: 'amd', accent: '#a78bfa', network: '40 Lab',
        hardware: ['Ryzen AI Max+ 395', '128 GB unified memory', '2 TB NVMe'],
        groups: [{ id: 'grp-ai', name: 'Inference', services: services('vector', [['ollama', 'Ollama'], ['open-webui', 'Open WebUI'], ['qwen', 'Qwen', 3], ['n8n', 'n8n'], ['podman', 'Podman']]) }],
      },
      {
        id: 'dev-edge', name: 'Edge Pi', role: 'Raspberry Pi / edge', icon: 'raspberry-pi', accent: '#ef6f91', network: '30 IoT',
        hardware: ['Pi 4 · 4 GB RAM'],
        groups: [{ id: 'grp-edge', name: 'Native services', services: services('edge', [['nginx', 'nginx'], ['cloudflare', 'Cloudflare'], ['tailscale', 'Tailscale']]) }],
      },
      {
        id: 'dev-remote', name: 'Remote', role: 'Friend-owned node', icon: 'tailscale', accent: '#f0a36a', network: '50 Guest',
        hardware: ['K3s · remote tunnel'],
        groups: [{ id: 'grp-remote', name: 'Remote stack', services: services('remote', [['docmost', 'Docmost'], ['nextcloud', 'Files'], ['postgresql', 'Postgres'], ['redis', 'Redis']]) }],
      },
    ],
    connections: [
      { id: 'conn-wan', from: 'net-internet', to: 'net-router', label: 'WAN' },
      { id: 'conn-lan', from: 'net-router', to: 'net-switch', label: 'LAN' },
      { id: 'conn-storage', from: 'net-switch', to: 'dev-storage', label: 'Main' },
      { id: 'conn-media', from: 'net-switch', to: 'dev-media', label: 'Main' },
      { id: 'conn-ai', from: 'net-switch', to: 'dev-ai', label: 'Main' },
      { id: 'conn-edge', from: 'net-switch', to: 'dev-edge', label: 'IoT' },
      { id: 'conn-remote', from: 'net-router', to: 'dev-remote', label: 'Tailscale' },
    ],
  };
}

export function emptyProject() {
  return { ...sampleProject(), title: 'Untitled Home Lab', subtitle: '', revision: 1, networks: [], vlans: [], devices: [], connections: [] };
}

export function parseProject(text) {
  if (new TextEncoder().encode(text).length > LIMITS.bytes) throw new Error('File is larger than 1 MB.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  validateProject(data);
  return structuredClone(data);
}

export function validateProject(project) {
  const fail = message => { throw new Error(message); };
  const string = (value, label = 'Text') => {
    if (typeof value !== 'string' || value.length > LIMITS.text) fail(`${label} must be text under ${LIMITS.text + 1} characters.`);
  };
  const exact = (object, allowed, label) => {
    if (!object || typeof object !== 'object' || Array.isArray(object) || Object.keys(object).some(key => !allowed.includes(key))) fail(`${label} has an invalid structure.`);
  };
  if (!project || typeof project !== 'object' || Array.isArray(project)) fail('Project must be an object.');
  exact(project, ['schemaVersion', 'revision', 'title', 'subtitle', 'theme', 'columns', 'density', 'networks', 'vlans', 'devices', 'connections'], 'Project');
  if (project.schemaVersion !== SCHEMA_VERSION) fail(`Unsupported schema version: ${project.schemaVersion ?? 'missing'}.`);
  string(project.title, 'Title');
  string(project.subtitle, 'Subtitle');
  if (!Number.isInteger(project.revision) || project.revision < 0 || project.revision > 1_000_000_000) fail('Invalid revision.');
  if (!THEMES.includes(project.theme)) fail('Unknown theme.');
  if (!DENSITIES.includes(project.density)) fail('Unknown density.');
  if (!Number.isInteger(project.columns) || project.columns < 1 || project.columns > 4) fail('Columns must be 1–4.');
  for (const [key, maximum] of [['devices', LIMITS.devices], ['networks', LIMITS.networks], ['vlans', LIMITS.networks], ['connections', LIMITS.connections]]) {
    if (!Array.isArray(project[key]) || project[key].length > maximum) fail(`Invalid or excessive ${key}.`);
  }

  const ids = new Set();
  const addId = (id, label) => {
    if (typeof id !== 'string' || !ID_RE.test(id) || ids.has(id)) fail(`${label} has an invalid or duplicate ID.`);
    ids.add(id);
  };
  let serviceCount = 0;
  let groupCount = 0;
  for (const network of project.networks) {
    exact(network, ['id', 'name', 'kind', 'accent'], 'Network');
    addId(network.id, 'Network'); string(network.name); string(network.kind);
    if (!COLOR_RE.test(network.accent)) fail('Invalid network color.');
  }
  for (const vlan of project.vlans) {
    exact(vlan, ['id', 'name', 'color'], 'VLAN');
    addId(vlan.id, 'VLAN'); string(vlan.name);
    if (!COLOR_RE.test(vlan.color)) fail('Invalid VLAN color.');
  }
  for (const device of project.devices) {
    exact(device, ['id', 'name', 'role', 'icon', 'accent', 'network', 'hardware', 'groups'], 'Device');
    addId(device.id, 'Device'); string(device.name); string(device.role); string(device.network);
    if (!LOGO_IDS.has(device.icon)) fail(`Unknown logo: ${device.icon}.`);
    if (!COLOR_RE.test(device.accent)) fail('Invalid device color.');
    if (!Array.isArray(device.hardware) || device.hardware.length > LIMITS.hardware) fail('Invalid hardware facts.');
    device.hardware.forEach(fact => string(fact, 'Hardware fact'));
    if (!Array.isArray(device.groups) || device.groups.length > LIMITS.groups) fail('Invalid service groups.');
    for (const group of device.groups) {
      exact(group, ['id', 'name', 'services'], 'Group');
      addId(group.id, 'Group'); string(group.name); groupCount += 1;
      if (!Array.isArray(group.services)) fail('Invalid services.');
      for (const service of group.services) {
        exact(service, ['id', 'logo', 'name', 'count'], 'Service');
        addId(service.id, 'Service'); string(service.name); serviceCount += 1;
        if (!LOGO_IDS.has(service.logo)) fail(`Unknown logo: ${service.logo}.`);
        if (!Number.isInteger(service.count) || service.count < 1 || service.count > 99) fail('Service count must be 1–99.');
      }
    }
  }
  if (serviceCount > LIMITS.services || groupCount > LIMITS.groups) fail('Project contains too many services or groups.');
  const endpoints = new Set([...project.networks, ...project.devices].map(item => item.id));
  for (const connection of project.connections) {
    exact(connection, ['id', 'from', 'to', 'label'], 'Connection');
    addId(connection.id, 'Connection'); string(connection.label);
    if (!endpoints.has(connection.from) || !endpoints.has(connection.to) || connection.from === connection.to) fail('Connection has an invalid endpoint.');
  }
  return true;
}

export function removeDevice(project, id) {
  project.devices = project.devices.filter(device => device.id !== id);
  project.connections = project.connections.filter(connection => connection.from !== id && connection.to !== id);
}

export function removeNetwork(project, id) {
  project.networks = project.networks.filter(network => network.id !== id);
  project.connections = project.connections.filter(connection => connection.from !== id && connection.to !== id);
}

export function wrapText(value, maxChars, maxLines = 2) {
  const text = String(value).trim();
  if (!text) return [''];
  const lines = [];
  let remaining = text;
  while (remaining && lines.length < maxLines) {
    if (remaining.length <= maxChars) { lines.push(remaining); remaining = ''; break; }
    let cut = remaining.lastIndexOf(' ', maxChars + 1);
    if (cut <= 0) cut = maxChars;
    lines.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) {
    const last = lines.length - 1;
    lines[last] = `${lines[last].slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  }
  return lines;
}

function hardwareHeight(device, width) {
  if (!device.hardware.length) return 0;
  const chars = Math.max(18, Math.floor((width - 48) / 7.4));
  const lines = device.hardware.reduce((sum, fact) => sum + wrapText(fact, chars, 2).length, 0);
  return lines * 19 + (device.hardware.length > 1 ? 28 : 14);
}

function cardHeight(device, width, compact) {
  const tileColumns = width < 380 ? 3 : 4;
  const tileHeight = compact ? 76 : 82;
  const groups = device.groups.reduce((height, group) => height + 34 + Math.ceil(group.services.length / tileColumns) * tileHeight + 12, 0);
  return Math.max(236, 116 + hardwareHeight(device, width) + groups + 18);
}

export function layoutProject(project) {
  const compact = project.density === 'compact';
  const margin = 60;
  const gap = 24;
  const columns = Math.min(project.columns, Math.max(1, project.devices.length));
  const widths = columns === 3
    ? (compact ? [450, 450, 300] : [480, 480, 320])
    : Array(columns).fill(compact ? 408 : (columns === 1 ? 480 : 432));
  const width = widths.reduce((sum, value) => sum + value, 0) + gap * (columns - 1) + margin * 2;
  const contentWidth = width - margin * 2;
  const oneColumnHeader = width < 900;
  const titleMaxChars = oneColumnHeader ? Math.max(9, Math.floor(contentWidth / 39)) : Math.max(10, Math.floor((contentWidth - 420) / 39));
  const titleLines = wrapText(project.title, titleMaxChars, 2).length;
  const headerHeight = (oneColumnHeader ? 252 : 160) + (titleLines - 1) * 74;
  const networkY = headerHeight + 22;
  const networkGap = 18;
  const networksPerRow = Math.min(5, Math.max(1, project.networks.length));
  const networkWidth = (contentWidth - networkGap * (networksPerRow - 1)) / networksPerRow;
  const networkRows = Math.ceil(project.networks.length / networksPerRow);
  const networkHeight = project.networks.length ? networkRows * 80 + Math.max(0, networkRows - 1) * 14 : 0;
  const networks = project.networks.map((network, index) => ({
    id: network.id,
    x: margin + (index % networksPerRow) * (networkWidth + networkGap),
    y: networkY + Math.floor(index / networksPerRow) * 94,
    w: networkWidth,
    h: 80,
  }));

  const vlanGap = 10;
  const vlansPerRow = Math.min(6, Math.max(1, project.vlans.length));
  const vlanWidth = (contentWidth - vlanGap * (vlansPerRow - 1)) / vlansPerRow;
  const vlanRows = Math.ceil(project.vlans.length / vlansPerRow);
  const vlanY = networkY + networkHeight + (project.networks.length && project.vlans.length ? 30 : 0);
  const vlanHeight = project.vlans.length ? vlanRows * 46 + Math.max(0, vlanRows - 1) * 10 : 0;
  const vlans = project.vlans.map((vlan, index) => ({
    id: vlan.id,
    x: margin + (index % vlansPerRow) * (vlanWidth + vlanGap),
    y: vlanY + Math.floor(index / vlansPerRow) * 56,
    w: vlanWidth,
    h: 46,
  }));
  const vlanGaps = vlans.slice(0, -1).filter((box, index) => vlans[index + 1].y === box.y).map((box, index) => (box.x + box.w + vlans[index + 1].x) / 2);
  const routingLaneY = Math.max(networkY + networkHeight, vlanY + vlanHeight) + 28;
  const cardsY = routingLaneY + 34;
  const columnX = [];
  widths.reduce((x, cardWidth, index) => {
    columnX[index] = x;
    return x + cardWidth + gap;
  }, margin);
  const columnBottoms = Array(columns).fill(cardsY);
  const cards = project.devices.map((device, index) => {
    const column = index < columns ? index : columnBottoms.indexOf(Math.min(...columnBottoms));
    const card = { id: device.id, column, x: columnX[column], y: columnBottoms[column], w: widths[column], h: cardHeight(device, widths[column], compact), tileColumns: widths[column] < 380 ? 3 : 4, tileHeight: compact ? 76 : 82 };
    columnBottoms[column] += card.h + gap;
    return card;
  });
  const networkIds = new Set(project.networks.map(network => network.id));
  const drawable = connection => {
    const fromNetwork = networkIds.has(connection.from);
    const toNetwork = networkIds.has(connection.to);
    if (fromNetwork && toNetwork) {
      const from = networks.find(item => item.id === connection.from);
      const to = networks.find(item => item.id === connection.to);
      return Boolean(from && to && from.y === to.y && Math.abs(networks.indexOf(from) - networks.indexOf(to)) === 1);
    }
    if (fromNetwork === toNetwork) return false;
    const device = cards.find(item => item.id === (fromNetwork ? connection.to : connection.from));
    return Boolean(device && device.y === cardsY);
  };
  const relationships = project.connections;
  const relationshipColumns = width < 900 ? 1 : 3;
  const relationshipRows = Math.ceil(relationships.length / relationshipColumns);
  const cardsBottom = cards.length ? Math.max(...cards.map(card => card.y + card.h)) : cardsY;
  const relationshipsY = cardsBottom + 42;
  const footerY = relationshipsY + Math.max(24, relationshipRows * 25) + 34;
  const height = Math.max(560, footerY + 52);
  return { width, height, margin, gap, columns, widths, cardsY, networks, vlans, vlanGaps, cards, relationships, relationshipColumns, relationshipsY, footerY, routingLaneY, oneColumnHeader, titleMaxChars, drawable };
}

function textElement(text, x, y, options) {
  const { fill, size, weight = 400, anchor = 'start', maxChars = 100, maxLines = 1, lineHeight = Math.round(size * 1.2), opacity = 1 } = options;
  const lines = wrapText(text, maxChars, maxLines);
  const title = `<title>${escapeXml(text)}</title>`;
  const spans = lines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escapeXml(line)}</tspan>`).join('');
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" opacity="${opacity}">${title}${spans}</text>`;
}

function networkIcon(kind) {
  const key = kind.toLowerCase();
  if (key.includes('ubiquiti') || key.includes('unifi')) return 'ubiquiti';
  if (key.includes('internet')) return 'internet';
  if (key.includes('router')) return 'router';
  if (key.includes('switch')) return 'switch';
  if (key.includes('wi-fi') || key.includes('wifi')) return 'wifi';
  return 'generic';
}

function renderNetwork(network, box, theme) {
  const name = textElement(network.name, box.x + 62, box.y + 35, { fill: theme.text, size: 17, weight: 700, maxChars: Math.max(10, Math.floor((box.w - 76) / 9)) });
  const kind = textElement(network.kind, box.x + 62, box.y + 57, { fill: theme.muted, size: 11, weight: 600, maxChars: Math.max(12, Math.floor((box.w - 76) / 7)) });
  return `<g data-network="${network.id}" role="button" tabindex="0" aria-label="Edit ${escapeXml(network.name)}"><title>${escapeXml(network.name)}</title><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="10" fill="${theme.card}" stroke="${theme.line}"/><rect x="${box.x + 14}" y="${box.y + 19}" width="42" height="42" rx="8" fill="${network.accent}" fill-opacity="0.13"/><image href="${logoDataUri(networkIcon(network.kind))}" x="${box.x + 17}" y="${box.y + 22}" width="36" height="36"/>${name}${kind}</g>`;
}

function renderService(service, x, y, width, height, theme, themeName) {
  const center = x + width / 2;
  const logoSize = 34;
  const plate = logoPlate(service.logo, themeName);
  const plateRect = plate ? `<rect x="${center - 21}" y="${y + 8}" width="42" height="42" rx="5" fill="${plate}"/>` : '';
  const name = textElement(service.name, center, y + height - 21, { fill: theme.text, size: 13, weight: 500, anchor: 'middle', maxChars: Math.max(8, Math.floor(width / 7)), maxLines: 2, lineHeight: 14 });
  const badge = service.count > 1 ? textElement(`×${service.count}`, x + width - 7, y + 14, { fill: theme.muted, size: 10, weight: 700, anchor: 'end', maxChars: 3 }) : '';
  return `<g><title>${escapeXml(service.name)}${service.count > 1 ? ` ×${service.count}` : ''}</title><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${theme.tile}" stroke="${theme.line}"/>${plateRect}<image href="${logoDataUri(service.logo)}" x="${center - logoSize / 2}" y="${y + 12}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>${name}${badge}</g>`;
}

function renderCard(device, box, theme, themeName) {
  const innerX = box.x + 20;
  const innerWidth = box.w - 40;
  const tileGap = 8;
  const tileWidth = (innerWidth - tileGap * (box.tileColumns - 1)) / box.tileColumns;
  const plate = logoPlate(device.icon, themeName);
  const iconPlate = plate ? `<rect x="${box.x + box.w - 68}" y="${box.y + 22}" width="48" height="48" rx="6" fill="${plate}"/>` : '';
  const nameSize = Math.max(30, (box.w < 380 ? 38 : 44) - Math.max(0, device.name.length - 12) * 0.7);
  const role = textElement(device.role.toUpperCase(), innerX, box.y + 29, { fill: device.accent, size: 11, weight: 750, maxChars: Math.floor((box.w - 96) / 7) });
  const name = textElement(device.name, innerX, box.y + 74, { fill: theme.text, size: nameSize, weight: 780, maxChars: Math.max(8, Math.floor((box.w - 100) / (nameSize * .55))) });
  const network = textElement(device.network, innerX, box.y + 101, { fill: theme.muted, size: 12, weight: 550, maxChars: 32 });
  let y = box.y + 118;
  let hardware = '';
  if (device.hardware.length > 1) {
    const top = y;
    y += 18;
    hardware = device.hardware.map(fact => {
      const lines = wrapText(fact, Math.max(18, Math.floor((box.w - 64) / 7.4)), 2);
      const value = textElement(fact, innerX + 12, y, { fill: theme.muted, size: 13, weight: 500, maxChars: Math.max(18, Math.floor((box.w - 64) / 7.4)), maxLines: 2, lineHeight: 19 });
      y += lines.length * 19;
      return value;
    }).join('');
    hardware = `<rect x="${innerX}" y="${top}" width="${innerWidth}" height="${y - top + 6}" rx="6" fill="${theme.tile}" stroke="${theme.line}"/>${hardware}`;
    y += 16;
  } else if (device.hardware.length) {
    hardware = textElement(device.hardware[0], innerX, y + 5, { fill: theme.muted, size: 13, maxChars: Math.floor(innerWidth / 7), maxLines: 2, lineHeight: 19 });
    y += 32;
  }
  const groups = device.groups.map(group => {
    const groupName = `${textElement(group.name.toUpperCase(), innerX, y + 13, { fill: device.accent, size: 11, weight: 750, maxChars: 42 })}<line x1="${innerX + Math.min(150, group.name.length * 8 + 16)}" y1="${y + 10}" x2="${innerX + innerWidth}" y2="${y + 10}" stroke="${theme.line}"/>`;
    y += 30;
    const rows = Math.ceil(group.services.length / box.tileColumns);
    const services = group.services.map((service, index) => {
      const x = innerX + (index % box.tileColumns) * (tileWidth + tileGap);
      const serviceY = y + Math.floor(index / box.tileColumns) * box.tileHeight;
      return renderService(service, x, serviceY, tileWidth, box.tileHeight - 8, theme, themeName);
    }).join('');
    y += rows * box.tileHeight + 12;
    return `<g>${groupName}${services}</g>`;
  }).join('');
  return `<g data-device="${device.id}" role="button" tabindex="0" aria-label="Edit ${escapeXml(device.name)}"><title>${escapeXml(device.name)}</title><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="12" fill="${theme.card}" stroke="${theme.line}"/><rect x="${innerX}" y="${box.y + 12}" width="38" height="3" rx="1.5" fill="${device.accent}"/>${iconPlate}<image href="${logoDataUri(device.icon)}" x="${box.x + box.w - 61}" y="${box.y + 29}" width="34" height="34" preserveAspectRatio="xMidYMid meet"/>${role}${name}${network}${hardware}${groups}</g>`;
}

function connectionLines(project, layout, theme) {
  const points = new Map();
  const networkIds = new Set(project.networks.map(network => network.id));
  layout.networks.forEach(box => points.set(box.id, { x: box.x + box.w / 2, top: box.y, bottom: box.y + box.h }));
  layout.cards.forEach(box => points.set(box.id, { x: box.x + box.w / 2, top: box.y, bottom: box.y + box.h }));
  return project.connections.filter(connection => layout.drawable(connection)).map(connection => {
    const from = points.get(connection.from);
    const to = points.get(connection.to);
    if (networkIds.has(connection.from) && networkIds.has(connection.to)) {
      const left = from.x < to.x ? from : to;
      const right = left === from ? to : from;
      return `<path d="M ${left.x + layout.networks.find(item => item.id === (left === from ? connection.from : connection.to)).w / 2} ${(left.top + left.bottom) / 2} H ${right.x - layout.networks.find(item => item.id === (right === from ? connection.from : connection.to)).w / 2}" fill="none" stroke="${theme.muted}" stroke-width="1.5" marker-end="url(#arrow)"/>`;
    }
    const network = networkIds.has(connection.from) ? from : to;
    const device = network === from ? to : from;
    const gapX = layout.vlanGaps.length ? layout.vlanGaps.reduce((best, x) => Math.abs(x - network.x) < Math.abs(best - network.x) ? x : best) : network.x;
    const laneTop = layout.vlans.length ? layout.vlans[0].y - 14 : network.bottom + 12;
    const path = `M ${network.x} ${network.bottom} V ${laneTop} H ${gapX} V ${layout.routingLaneY} H ${device.x} V ${device.top}`;
    return `<g><path d="${path}" fill="none" stroke="${theme.muted}" stroke-width="1.4"/><circle cx="${gapX}" cy="${layout.routingLaneY}" r="3" fill="${theme.teal}"/><circle cx="${device.x}" cy="${layout.routingLaneY}" r="3" fill="${theme.teal}"/></g>`;
  }).join('');
}

export function renderProject(project) {
  validateProject(project);
  const layout = layoutProject(project);
  const theme = palettes[project.theme];
  const serviceCount = project.devices.reduce((sum, device) => sum + device.groups.reduce((groupSum, group) => groupSum + group.services.length, 0), 0);
  const titleLines = wrapText(project.title, layout.titleMaxChars, 2);
  const title = textElement(project.title, layout.margin, 103, { fill: theme.text, size: 68, weight: 800, maxChars: layout.titleMaxChars, maxLines: 2, lineHeight: 74 });
  const subtitleY = 136 + (titleLines.length - 1) * 74;
  const subtitle = textElement(project.subtitle, layout.margin, subtitleY, { fill: theme.muted, size: 15, weight: 500, maxChars: Math.max(24, Math.floor((layout.width - layout.margin * 2) / 8)), maxLines: 2, lineHeight: 19 });
  const statsY = layout.oneColumnHeader ? subtitleY + 58 : 70;
  const statStart = layout.oneColumnHeader ? layout.margin : layout.width - layout.margin - 360;
  const statWidth = layout.oneColumnHeader ? (layout.width - layout.margin * 2) / 3 : 120;
  const stats = [[project.devices.length, 'HOSTS'], [serviceCount, 'SERVICES'], [project.vlans.length, 'VLANS']].map(([value, label], index) => `${textElement(String(value).padStart(2, '0'), statStart + index * statWidth, statsY, { fill: index ? theme.text : theme.teal, size: 44, weight: 750, maxChars: 3 })}${textElement(label, statStart + index * statWidth, statsY + 28, { fill: theme.muted, size: 10, weight: 700, maxChars: 10 })}`).join('');
  const networks = project.networks.map(network => renderNetwork(network, layout.networks.find(box => box.id === network.id), theme)).join('');
  const vlans = project.vlans.map(vlan => {
    const box = layout.vlans.find(item => item.id === vlan.id);
    const label = textElement(vlan.name, box.x + 20, box.y + 29, { fill: theme.text, size: 13, weight: 650, maxChars: Math.max(8, Math.floor((box.w - 30) / 7)) });
    return `<g><title>${escapeXml(vlan.name)}</title><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="${theme.tile}" stroke="${theme.line}"/><rect x="${box.x + 9}" y="${box.y + 12}" width="3" height="22" rx="1.5" fill="${vlan.color}"/>${label}</g>`;
  }).join('');
  const cards = layout.cards.map(box => renderCard(project.devices.find(device => device.id === box.id), box, theme, project.theme)).join('');
  const names = new Map([...project.networks, ...project.devices].map(item => [item.id, item.name]));
  const relationships = layout.relationships.map((connection, index) => {
    const column = index % layout.relationshipColumns;
    const row = Math.floor(index / layout.relationshipColumns);
    const columnWidth = (layout.width - layout.margin * 2) / layout.relationshipColumns;
    return textElement(`${names.get(connection.from)} → ${names.get(connection.to)}${connection.label ? ` · ${connection.label}` : ''}`, layout.margin + column * columnWidth, layout.relationshipsY + row * 25, { fill: theme.muted, size: 12, weight: 550, maxChars: Math.floor(columnWidth / 7) });
  }).join('');
  const footer = `<line x1="${layout.margin}" y1="${layout.footerY}" x2="${layout.width - layout.margin}" y2="${layout.footerY}" stroke="${theme.line}"/><text x="${layout.margin}" y="${layout.footerY + 28}" fill="${theme.muted}" font-family="${FONT}" font-size="10" font-weight="700" letter-spacing="1.5">HOMELAB ATLAS</text><text x="${layout.width - layout.margin}" y="${layout.footerY + 28}" fill="${theme.muted}" font-family="${FONT}" font-size="10" text-anchor="end">Logical links · Service groups</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeXml(project.title)}"><defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${theme.line}" opacity="0.22"/></pattern><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="${theme.muted}" stroke-width="1.2"/></marker></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#dots)"/><line x1="${layout.margin}" y1="42" x2="${layout.margin + 38}" y2="42" stroke="${theme.teal}" stroke-width="4" stroke-linecap="round"/><text x="${layout.margin + 52}" y="46" fill="${theme.muted}" font-family="${FONT}" font-size="11" font-weight="700" letter-spacing="2">BUILT AT HOME</text>${title}${subtitle}${stats}${connectionLines(project, layout, theme)}${networks}${vlans}${cards}${relationships}${footer}</svg>`;
}
