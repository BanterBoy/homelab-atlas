import { LOGO_IDS, logoDataUri } from './catalog.js';

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
  navy: { bg: '#07131f', panel: '#0b1f2e', card: '#102b3e', tile: '#0b2131', line: '#2b6175', text: '#e8f3f6', muted: '#90aeba', chip: '#163a4d' },
  light: { bg: '#edf4f6', panel: '#ffffff', card: '#ffffff', tile: '#f2f7f8', line: '#91afba', text: '#132d38', muted: '#55717c', chip: '#d9e9ed' },
  midnight: { bg: '#0e0b1a', panel: '#19142a', card: '#211a36', tile: '#171226', line: '#67579d', text: '#f0edff', muted: '#aaa0cc', chip: '#31284c' },
};

export const uid = prefix => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[character]);

function services(items) {
  return items.map(([logo, name, count = 1], index) => ({ id: `svc-${logo}-${index}`, logo, name, count }));
}

export function sampleProject() {
  return {
    schemaVersion: 1,
    revision: 1,
    title: 'Home Lab',
    subtitle: 'Local services & network map',
    theme: 'navy',
    columns: 3,
    density: 'comfortable',
    networks: [
      { id: 'net-internet', name: 'Internet', kind: 'Internet', accent: '#48bfe3' },
      { id: 'net-router', name: 'Core Router', kind: 'Router', accent: '#4dd4ac' },
      { id: 'net-switch', name: 'Core Switch', kind: 'Switch', accent: '#7dd3fc' },
    ],
    vlans: [
      { id: 'vlan-main', name: 'Main', color: '#34d399' },
      { id: 'vlan-iot', name: 'IoT', color: '#fbbf24' },
      { id: 'vlan-guest', name: 'Guest', color: '#a78bfa' },
    ],
    devices: [
      {
        id: 'dev-storage', name: 'Atlas Storage', role: 'Storage & infrastructure', icon: 'truenas', accent: '#22b8cf', network: 'Main',
        hardware: ['8-core CPU · 64 GB RAM', '72 TB ZFS storage'],
        groups: [
          { id: 'grp-infra', name: 'Infrastructure', services: services([['truenas', 'TrueNAS'], ['docker', 'Docker'], ['portainer', 'Portainer'], ['grafana', 'Grafana'], ['prometheus', 'Prometheus'], ['uptime-kuma', 'Uptime Kuma'], ['nginx-proxy-manager', 'Proxy Manager'], ['vaultwarden', 'Vaultwarden']]) },
          { id: 'grp-cloud', name: 'Cloud & backup', services: services([['nextcloud', 'Nextcloud'], ['immich', 'Immich'], ['paperless-ngx', 'Paperless'], ['restic', 'Restic']]) },
        ],
      },
      {
        id: 'dev-media', name: 'Media Server', role: 'Streaming & automation', icon: 'unraid', accent: '#f59f00', network: 'Main',
        hardware: ['12-core CPU · 32 GB RAM', 'Hardware transcoding'],
        groups: [
          { id: 'grp-media', name: 'Media stack', services: services([['jellyfin', 'Jellyfin'], ['sonarr', 'Sonarr'], ['radarr', 'Radarr'], ['prowlarr', 'Prowlarr'], ['bazarr', 'Bazarr'], ['seerr', 'Seerr'], ['qbittorrent', 'qBittorrent'], ['sabnzbd', 'SABnzbd']]) },
          { id: 'grp-ha', name: 'Home Assistant VM', services: services([['home-assistant', 'Home Assistant'], ['music-assistant', 'Music Assistant'], ['mosquitto', 'Mosquitto'], ['node-red', 'Node-RED']]) },
        ],
      },
      {
        id: 'dev-ai', name: 'Compute Node', role: 'Local inference', icon: 'open-webui', accent: '#8b5cf6', network: 'Main',
        hardware: ['16-core CPU · 64 GB RAM', '24 GB accelerator'],
        groups: [{ id: 'grp-ai', name: 'Inference', services: services([['ollama', 'Ollama'], ['open-webui', 'Open WebUI'], ['qwen', 'Qwen', 3], ['n8n', 'n8n']]) }],
      },
    ],
    connections: [
      { id: 'conn-wan', from: 'net-internet', to: 'net-router', label: 'WAN' },
      { id: 'conn-lan', from: 'net-router', to: 'net-switch', label: 'LAN' },
      { id: 'conn-storage', from: 'net-switch', to: 'dev-storage', label: 'Main' },
      { id: 'conn-media', from: 'net-switch', to: 'dev-media', label: 'Main' },
      { id: 'conn-ai', from: 'net-switch', to: 'dev-ai', label: 'Main' },
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
    let cut = remaining.lastIndexOf(' ', maxChars);
    if (cut < Math.floor(maxChars * 0.55)) cut = maxChars;
    lines.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) {
    const last = lines.length - 1;
    lines[last] = `${lines[last].slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  }
  return lines;
}

function wrappedCount(value, maxChars, maxLines = 2) {
  return wrapText(value, maxChars, maxLines).length;
}

export function layoutProject(project) {
  const compact = project.density === 'compact';
  const margin = 56;
  const gap = 28;
  const cardWidth = compact ? 416 : 448;
  const columns = Math.min(project.columns, Math.max(1, project.devices.length));
  const width = Math.max(820, columns * cardWidth + (columns - 1) * gap + margin * 2);
  const contentWidth = width - margin * 2;
  const networkWidth = 184;
  const networkGap = 16;
  const networksPerRow = Math.max(1, Math.floor((contentWidth + networkGap) / (networkWidth + networkGap)));
  const networkRows = Math.ceil(project.networks.length / networksPerRow);
  const networkY = 128;
  const networkHeight = project.networks.length ? networkRows * 70 + Math.max(0, networkRows - 1) * 14 : 0;
  const vlanWidth = 132;
  const vlanGap = 12;
  const vlansPerRow = Math.max(1, Math.floor((contentWidth + vlanGap) / (vlanWidth + vlanGap)));
  const vlanRows = Math.ceil(project.vlans.length / vlansPerRow);
  const vlanY = networkY + networkHeight + (project.networks.length && project.vlans.length ? 24 : 0);
  const vlanHeight = project.vlans.length ? vlanRows * 34 + Math.max(0, vlanRows - 1) * 10 : 0;
  const cardsY = Math.max(154, vlanY + vlanHeight + 38);
  const tileHeight = compact ? 104 : 118;

  const networks = project.networks.map((network, index) => ({
    id: network.id,
    x: margin + (index % networksPerRow) * (networkWidth + networkGap),
    y: networkY + Math.floor(index / networksPerRow) * 84,
    w: networkWidth,
    h: 70,
  }));
  const vlans = project.vlans.map((vlan, index) => ({
    id: vlan.id,
    x: margin + (index % vlansPerRow) * (vlanWidth + vlanGap),
    y: vlanY + Math.floor(index / vlansPerRow) * 44,
    w: vlanWidth,
    h: 34,
  }));

  const cards = project.devices.map(device => {
    const hardwareHeight = device.hardware.reduce((height, fact) => height + wrappedCount(`• ${fact}`, 48, 2) * 19, 0);
    const groupsHeight = device.groups.reduce((height, group) => height + 42 + Math.ceil(group.services.length / 4) * tileHeight, 0);
    return { id: device.id, w: cardWidth, h: Math.max(260, 124 + hardwareHeight + groupsHeight) };
  });
  let y = cardsY;
  let rowHeight = 0;
  cards.forEach((card, index) => {
    if (index && index % columns === 0) { y += rowHeight + gap; rowHeight = 0; }
    card.x = margin + (index % columns) * (cardWidth + gap);
    card.y = y;
    rowHeight = Math.max(rowHeight, card.h);
  });
  const relationships = project.connections.filter(connection => project.devices.some(device => device.id === connection.from) && project.devices.some(device => device.id === connection.to));
  const relationshipRows = Math.ceil(relationships.length / 3);
  const cardsBottom = cards.length ? y + rowHeight : cardsY;
  const height = Math.max(520, cardsBottom + 56 + relationshipRows * 24);
  return { width, height, margin, gap, cardWidth, cardsY, tileHeight, networks, vlans, cards, relationships };
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
  if (key.includes('internet')) return 'internet';
  if (key.includes('router')) return 'router';
  if (key.includes('switch')) return 'switch';
  if (key.includes('wi-fi') || key.includes('wifi')) return 'wifi';
  return 'generic';
}

function renderNetwork(network, box, theme) {
  const name = textElement(network.name, box.x + 62, box.y + 32, { fill: theme.text, size: 16, weight: 700, maxChars: 15 });
  const kind = textElement(network.kind, box.x + 62, box.y + 52, { fill: theme.muted, size: 12, weight: 600, maxChars: 18 });
  return `<g data-network="${network.id}" role="button" tabindex="0" aria-label="Edit ${escapeXml(network.name)}"><title>${escapeXml(network.name)}</title><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="15" fill="${theme.panel}" stroke="${network.accent}" stroke-width="2"/><rect x="${box.x + 12}" y="${box.y + 13}" width="44" height="44" rx="12" fill="${theme.chip}"/><image href="${logoDataUri(networkIcon(network.kind))}" x="${box.x + 16}" y="${box.y + 17}" width="36" height="36"/>${name}${kind}</g>`;
}

function renderService(service, x, y, width, height, theme) {
  const center = x + width / 2;
  const nameY = y + height - 35;
  const name = textElement(service.name, center, nameY, { fill: theme.text, size: 14, weight: 650, anchor: 'middle', maxChars: 12, maxLines: 2, lineHeight: 16 });
  const badge = service.count > 1 ? `<g><rect x="${x + width - 31}" y="${y + 8}" width="24" height="20" rx="10" fill="#0f766e"/><text x="${x + width - 19}" y="${y + 23}" fill="#ffffff" font-family="${FONT}" font-size="11" font-weight="800" text-anchor="middle">×${service.count}</text></g>` : '';
  return `<g><title>${escapeXml(service.name)}${service.count > 1 ? ` ×${service.count}` : ''}</title><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="${theme.tile}" stroke="${theme.line}" stroke-opacity="0.62"/><rect x="${center - 25}" y="${y + 11}" width="50" height="50" rx="13" fill="#ffffff" fill-opacity="0.96"/><image href="${logoDataUri(service.logo)}" x="${center - 21}" y="${y + 15}" width="42" height="42" preserveAspectRatio="xMidYMid meet" filter="url(#logo-shadow)"/>${name}${badge}</g>`;
}

function renderCard(device, box, theme, tileHeight) {
  const innerX = box.x + 22;
  const innerWidth = box.w - 44;
  const tileGap = 10;
  const tileWidth = (innerWidth - tileGap * 3) / 4;
  let y = box.y + 92;
  const name = textElement(device.name, box.x + 88, box.y + 37, { fill: theme.text, size: 22, weight: 780, maxChars: 27 });
  const role = textElement(device.role, box.x + 88, box.y + 61, { fill: theme.muted, size: 14, weight: 600, maxChars: 36 });
  const network = textElement(device.network, box.x + 88, box.y + 80, { fill: device.accent, size: 12, weight: 750, maxChars: 26 });
  const hardware = device.hardware.map(fact => {
    const lines = wrapText(fact, 48, 2);
    const value = textElement(`• ${fact}`, innerX, y, { fill: theme.muted, size: 13, weight: 500, maxChars: 48, maxLines: 2, lineHeight: 19 });
    y += lines.length * 19;
    return value;
  }).join('');
  y += 12;
  const groups = device.groups.map(group => {
    const groupY = y;
    const groupName = textElement(group.name, innerX + 10, y + 21, { fill: theme.text, size: 15, weight: 750, maxChars: 42 });
    y += 36;
    const rows = Math.ceil(group.services.length / 4);
    const services = group.services.map((service, index) => {
      const x = innerX + (index % 4) * (tileWidth + tileGap);
      const serviceY = y + Math.floor(index / 4) * tileHeight;
      return renderService(service, x, serviceY, tileWidth, tileHeight - 10, theme);
    }).join('');
    y += rows * tileHeight + 6;
    return `<g><rect x="${innerX}" y="${groupY}" width="${innerWidth}" height="${y - groupY - 4}" rx="11" fill="${theme.panel}" fill-opacity="0.42" stroke="${theme.line}" stroke-opacity="0.4"/>${groupName}${services}</g>`;
  }).join('');
  return `<g data-device="${device.id}" role="button" tabindex="0" aria-label="Edit ${escapeXml(device.name)}"><title>${escapeXml(device.name)}</title><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="20" fill="${theme.card}" stroke="${device.accent}" stroke-width="1.6"/><rect x="${box.x}" y="${box.y}" width="7" height="${box.h}" rx="4" fill="${device.accent}"/><rect x="${box.x + 20}" y="${box.y + 18}" width="56" height="56" rx="15" fill="#ffffff" fill-opacity="0.96"/><image href="${logoDataUri(device.icon)}" x="${box.x + 25}" y="${box.y + 23}" width="46" height="46" preserveAspectRatio="xMidYMid meet" filter="url(#logo-shadow)"/>${name}${role}${network}${hardware}${groups}</g>`;
}

function connectionLines(project, layout, theme) {
  const points = new Map();
  const deviceIds = new Set(project.devices.map(device => device.id));
  layout.networks.forEach(box => points.set(box.id, { x: box.x + box.w / 2, left: box.x, right: box.x + box.w, top: box.y, bottom: box.y + box.h }));
  layout.cards.forEach(box => points.set(box.id, { x: box.x + box.w / 2, left: box.x, right: box.x + box.w, top: box.y, bottom: box.y + box.h }));
  return project.connections.filter(connection => points.has(connection.from) && points.has(connection.to)).map(connection => {
    if (deviceIds.has(connection.from) && deviceIds.has(connection.to)) return '';
    const from = points.get(connection.from);
    const to = points.get(connection.to);
    if (Math.abs(from.top - to.top) < 4) {
      const left = from.x < to.x ? from : to;
      const right = left === from ? to : from;
      const y = (left.top + left.bottom) / 2;
      const label = connection.label ? textElement(connection.label, (left.right + right.left) / 2, y - 8, { fill: theme.muted, size: 11, weight: 700, anchor: 'middle', maxChars: 18 }) : '';
      return `<g><path d="M ${left.right} ${y} H ${right.left}" fill="none" stroke="${theme.line}" stroke-width="2" stroke-dasharray="5 5" opacity="0.8"/>${label}</g>`;
    }
    const first = from.top < to.top ? from : to;
    const second = first === from ? to : from;
    const startY = first.bottom;
    const endY = second.top;
    const middleY = startY + Math.max(14, (endY - startY) / 2);
    const path = `M ${first.x} ${startY} V ${middleY} H ${second.x} V ${endY}`;
    const label = connection.label ? textElement(connection.label, (first.x + second.x) / 2, middleY - 6, { fill: theme.muted, size: 11, weight: 700, anchor: 'middle', maxChars: 18 }) : '';
    return `<g><path d="${path}" fill="none" stroke="${theme.line}" stroke-width="2" stroke-dasharray="5 5" opacity="0.8"/>${label}</g>`;
  }).join('');
}

export function renderProject(project) {
  validateProject(project);
  const layout = layoutProject(project);
  const theme = palettes[project.theme];
  const serviceCount = project.devices.reduce((sum, device) => sum + device.groups.reduce((groupSum, group) => groupSum + group.services.length, 0), 0);
  const title = textElement(project.title, layout.margin, 58, { fill: theme.text, size: 46, weight: 800, maxChars: Math.max(10, Math.floor((layout.width - 480) / 25)) });
  const subtitle = textElement(project.subtitle, layout.margin, 88, { fill: theme.muted, size: 15, weight: 550, maxChars: Math.max(30, Math.floor((layout.width - 112) / 9)) });
  const stats = textElement(`${project.devices.length} hosts  ·  ${serviceCount} services  ·  ${project.networks.length} network nodes`, layout.width - layout.margin, 52, { fill: theme.muted, size: 14, weight: 700, anchor: 'end', maxChars: 48 });
  const networks = project.networks.map(network => renderNetwork(network, layout.networks.find(box => box.id === network.id), theme)).join('');
  const vlans = project.vlans.map(vlan => {
    const box = layout.vlans.find(item => item.id === vlan.id);
    const label = textElement(vlan.name, box.x + box.w / 2, box.y + 22, { fill: theme.text, size: 13, weight: 750, anchor: 'middle', maxChars: 15 });
    return `<g><title>${escapeXml(vlan.name)}</title><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="17" fill="${vlan.color}" fill-opacity="0.17" stroke="${vlan.color}"/>${label}</g>`;
  }).join('');
  const cards = layout.cards.map(box => renderCard(project.devices.find(device => device.id === box.id), box, theme, layout.tileHeight)).join('');
  const relationships = layout.relationships.map((connection, index) => {
    const names = new Map(project.devices.map(device => [device.id, device.name]));
    const column = index % 3;
    const row = Math.floor(index / 3);
    const columnWidth = (layout.width - layout.margin * 2) / 3;
    return textElement(`${names.get(connection.from)} → ${names.get(connection.to)}${connection.label ? ` · ${connection.label}` : ''}`, layout.margin + column * columnWidth, layout.height - 22 - (Math.ceil(layout.relationships.length / 3) - 1 - row) * 24, { fill: theme.muted, size: 12, weight: 600, maxChars: 38 });
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeXml(project.title)}"><defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${theme.line}" opacity="0.24"/></pattern><filter id="logo-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#0f172a" flood-opacity="0.55"/></filter></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#dots)"/>${title}${subtitle}${stats}${connectionLines(project, layout, theme)}${networks}${vlans}${cards}${relationships}</svg>`;
}
