import { renderProject } from './model.js';

export const HIDDEN_TEXT = '[hidden]';
export const EXPORT_LIMITS = { terms: 30, termLength: 120, inputLength: 3660 };

const URL_RE = /\b[a-z][a-z0-9+.-]{0,31}:\/\/[^\s<>"']+/giu;
const EMAIL_RE = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*/giu;
const MAC_RE = /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b|\b(?:[0-9a-f]{4}\.){2}[0-9a-f]{4}\b/giu;
const BRACKETED_IPV6_RE = /\[[0-9a-f:.]+(?:%[a-z0-9_.-]+)?\](?::\d{1,5})?(?:\/\d{1,3})?/giu;
const IPV6_RE = /(?<![0-9a-z_:])(?:[0-9a-f]{1,4}:|::)[0-9a-f:.]*(?:%[a-z0-9_.-]+)?(?:\/\d{1,3})?(?![0-9a-z_:])/giu;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/gu;

export function parseExportTerms(value = '') {
  if (typeof value !== 'string' || value.length > EXPORT_LIMITS.inputLength) throw new Error(`Also hide text is limited to ${EXPORT_LIMITS.terms} terms.`);
  const terms = value.split(/\r\n?|\n/u).map(term => term.trim()).filter(Boolean);
  if (terms.length > EXPORT_LIMITS.terms) throw new Error(`Also hide text accepts at most ${EXPORT_LIMITS.terms} terms.`);
  if (terms.some(term => term.length > EXPORT_LIMITS.termLength)) throw new Error(`Each hidden term must be ${EXPORT_LIMITS.termLength} characters or fewer.`);
  const seen = new Set();
  return terms.filter(term => {
    const key = term.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeExportOptions(options = {}) {
  const input = Array.isArray(options.terms) ? options.terms.join('\n') : options.customTerms || '';
  return { hideNetworkDetails: options.hideNetworkDetails !== false, terms: parseExportTerms(input) };
}

function validURL(candidate) {
  try {
    return Boolean(new URL(candidate).protocol);
  } catch {
    const match = candidate.match(/^[a-z][a-z0-9+.-]{0,31}:\/\/(?:[^\s/?#@]*@)?\[([0-9a-f:.]+%[a-z0-9_.-]+)\](?::(\d{1,5}))?(?:[/?#].*)?$/iu);
    return Boolean(match && (!match[2] || Number(match[2]) <= 65535) && validIPv6(match[1]));
  }
}

function validIPv4(candidate) {
  const [address, prefix] = candidate.split('/');
  if (prefix !== undefined && (!/^\d{1,2}$/u.test(prefix) || Number(prefix) > 32)) return false;
  const parts = address.split('.');
  return parts.length === 4 && parts.every(part => /^\d{1,3}$/u.test(part) && Number(part) <= 255 && (part === '0' || !part.startsWith('0')));
}

function validIPv6(candidate) {
  let address = candidate;
  let prefix;
  if (candidate.startsWith('[')) {
    const match = candidate.match(/^\[([^\]]+)\](?::(\d{1,5}))?(?:\/(\d{1,3}))?$/u);
    if (!match || (match[2] && Number(match[2]) > 65535)) return false;
    [, address, , prefix] = match;
  } else if (candidate.includes('/')) {
    [address, prefix] = candidate.split('/');
  }
  if (prefix !== undefined && (!/^\d{1,3}$/u.test(prefix) || Number(prefix) > 128)) return false;
  const zone = address.indexOf('%');
  if (zone >= 0) {
    if (!/^[a-z0-9_.-]{1,32}$/iu.test(address.slice(zone + 1))) return false;
    address = address.slice(0, zone);
  }
  if (!address.includes(':')) return false;
  try {
    new URL(`http://[${address}]/`);
    return true;
  } catch {
    return false;
  }
}

function replaceValid(text, pattern, valid) {
  return text.replace(pattern, candidate => valid(candidate) ? HIDDEN_TEXT : candidate);
}

function replaceAddress(text, pattern, valid) {
  return text.replace(pattern, candidate => {
    if (valid(candidate)) return HIDDEN_TEXT;
    const punctuation = candidate.endsWith('.') ? '.' : '';
    const literal = punctuation ? candidate.slice(0, -1) : candidate;
    const suffix = literal.match(/\/\d+$/u)?.[0] || '';
    const address = suffix ? literal.slice(0, -suffix.length) : literal;
    return valid(address) ? `${HIDDEN_TEXT}${suffix}${punctuation}` : candidate;
  });
}

function replaceLiteral(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return text.replace(new RegExp(escaped, 'giu'), HIDDEN_TEXT);
}

function redact(value, options) {
  let text = String(value);
  if (options.hideNetworkDetails) {
    text = replaceValid(text, URL_RE, validURL);
    text = replaceAddress(text, BRACKETED_IPV6_RE, validIPv6);
    text = replaceAddress(text, IPV6_RE, validIPv6);
    text = text.replace(EMAIL_RE, HIDDEN_TEXT).replace(MAC_RE, HIDDEN_TEXT);
    text = replaceAddress(text, IPV4_RE, validIPv4);
  }
  for (const term of options.terms) text = replaceLiteral(text, term);
  return text;
}

export function redactExportText(value, options = {}) {
  return redact(value, normalizeExportOptions(options));
}

function sanitizedProject(project, options) {
  const text = value => redact(value, options);
  return {
    ...project,
    title: text(project.title),
    subtitle: text(project.subtitle),
    networks: project.networks.map(network => ({ ...network, name: text(network.name), kind: text(network.kind) })),
    vlans: project.vlans.map(vlan => ({ ...vlan, name: text(vlan.name) })),
    devices: project.devices.map(device => ({
      ...device,
      name: text(device.name),
      role: text(device.role),
      network: text(device.network),
      hardware: device.hardware.map(text),
      groups: device.groups.map(group => ({
        ...group,
        name: text(group.name),
        services: group.services.map(service => ({ ...service, name: text(service.name) })),
      })),
    })),
    connections: project.connections.map(connection => ({ ...connection, label: text(connection.label) })),
  };
}

export function sanitizeExportProject(project, options = {}) {
  return sanitizedProject(project, normalizeExportOptions(options));
}

function exportFilename(title, extension) {
  if (!/^\.[a-z0-9]+$/u.test(extension)) throw new Error('Invalid export extension.');
  const stem = title.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 80) || 'homelab-atlas';
  return `${stem}${extension}`;
}

export function createExportSnapshot(project, options = {}, extension = '.svg') {
  const normalized = normalizeExportOptions(options);
  const displayProject = sanitizedProject(project, normalized);
  const snapshotOptions = Object.freeze({ hideNetworkDetails: normalized.hideNetworkDetails, terms: Object.freeze([...normalized.terms]) });
  return Object.freeze({
    svg: renderProject(project, { displayProject, interactive: false }),
    filename: exportFilename(displayProject.title, extension),
    options: snapshotOptions,
  });
}
