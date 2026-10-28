import { LOGOS } from './catalog.js';
import { LIMITS, layoutProject, uid, validateProject } from './model.js';

export const DISCOVERY_LIMITS = { bytes: 2_000_000, findings: 1000, bindings: 1600 };
const KEY_RE = /^(?:compose|container):[0-9a-f]{64}$/;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const encoder = new TextEncoder();

const isObject = value => value && typeof value === 'object' && !Array.isArray(value);

function unicodeSafe(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      index += 1;
      if (index >= value.length) return false;
      const next = value.charCodeAt(index);
      if (next < 0xdc00 || next > 0xdfff) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

function exact(value, keys, label) {
  if (!isObject(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) throw new Error(`${label} has an invalid structure.`);
}

function text(value, maximum, label, empty = true) {
  if (typeof value !== 'string' || !unicodeSafe(value) || (!empty && !value) || encoder.encode(value).length > maximum) throw new Error(`${label} is invalid.`);
}

function validTimestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText] = match;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText || 0, offsetMinuteText || 0].map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
    && hour <= 23 && minute <= 59 && second <= 59 && offsetHour <= 23 && offsetMinute <= 59;
}

export function validateDiscoverySnapshot(input) {
  exact(input, ['format', 'version', 'source', 'scannedAt', 'findings'], 'Snapshot');
  if (input.format !== 'homelab-atlas.docker-discovery' || input.version !== 1) throw new Error('Unsupported discovery snapshot.');
  exact(input.source, ['id', 'name'], 'Snapshot source');
  if (!ID_RE.test(input.source.id)) throw new Error('Snapshot source ID is invalid.');
  text(input.source.name, 120, 'Snapshot source name', false);
  text(input.scannedAt, 64, 'Scan date', false);
  if (!validTimestamp(input.scannedAt)) throw new Error('Scan date is invalid.');
  if (!Array.isArray(input.findings) || input.findings.length > DISCOVERY_LIMITS.findings) throw new Error('Snapshot has too many findings.');
  const keys = new Set();
  let total = 0;
  for (const finding of input.findings) {
    exact(finding, ['key', 'name', 'image', 'count', 'running', 'stopped', 'ports', 'composeProject', 'composeService', 'containerNames'], 'Finding');
    if (!KEY_RE.test(finding.key) || keys.has(finding.key)) throw new Error('Finding key is invalid or duplicated.');
    keys.add(finding.key);
    text(finding.name, 120, 'Finding name', false);
    text(finding.image, 256, 'Finding image');
    text(finding.composeProject, 120, 'Compose project');
    text(finding.composeService, 120, 'Compose service');
    if (![finding.count, finding.running, finding.stopped].every(Number.isInteger) || finding.count < 1 || finding.running < 0 || finding.stopped < 0 || finding.count !== finding.running + finding.stopped) throw new Error('Finding counts are invalid.');
    if (!Array.isArray(finding.ports) || finding.ports.length > 20) throw new Error('Finding ports are invalid.');
    finding.ports.forEach(value => text(value, 80, 'Finding port', false));
    if (!Array.isArray(finding.containerNames) || finding.containerNames.length !== finding.count || finding.containerNames.length > DISCOVERY_LIMITS.findings) throw new Error('Finding container names are invalid.');
    finding.containerNames.forEach(value => text(value, 120, 'Container name', false));
    total += finding.count;
    if (total > DISCOVERY_LIMITS.findings) throw new Error('Snapshot contains more than 1000 containers.');
  }
  return true;
}

export function parseDiscoverySnapshot(source) {
  if (typeof source !== 'string' || encoder.encode(source).length > DISCOVERY_LIMITS.bytes) throw new Error('Snapshot is larger than 2 MB.');
  let value;
  try { value = JSON.parse(source); } catch { throw new Error('Snapshot is not valid JSON.'); }
  validateDiscoverySnapshot(value);
  return structuredClone(value);
}

const normalize = value => String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function imageName(image) {
  const basename = String(image || '').split('/').at(-1).split('@')[0];
  return basename.replace(/:[^:]+$/, '');
}

export function matchDiscoveryLogo(finding, catalog = LOGOS) {
  const aliases = { postgres: 'postgresql', homeassistant: 'home-assistant', pihole: 'pi-hole' };
  const needles = [finding.composeService, finding.name, imageName(finding.image)].map(normalize).filter(Boolean);
  for (const needle of needles) {
    const alias = aliases[needle];
    if (alias && catalog.some(logo => logo.id === alias)) return alias;
    const matches = catalog.filter(logo => [logo.id, logo.label, ...(logo.aliases || [])].some(value => normalize(value) === needle));
    if (matches.length) return matches.sort((left, right) => left.id.localeCompare(right.id))[0].id;
  }
  return 'generic';
}

export function suggestDiscoveryService(finding, device) {
  if (!device) return null;
  const needle = normalize(finding.name);
  const matches = device.groups.flatMap(group => group.services).filter(service => normalize(service.name) === needle);
  return matches.length === 1 ? matches[0].id : null;
}

export function discoveryBinding(project, sourceId, key) {
  return project.discovery.bindings.find(binding => binding.sourceId === sourceId && binding.key === key) || null;
}

export function discoveryBindingLabel(project, binding) {
  const device = project.devices.find(item => item.id === binding?.deviceId);
  const service = device?.groups.flatMap(group => group.services).find(item => item.id === binding?.serviceId);
  return device && service ? `${device.name} · ${service.name}` : 'Missing target';
}

export function captureProjectGuard(project) {
  return { project, revision: project.revision };
}

export function projectGuardCurrent(guard, project) {
  return guard?.project === project && guard.revision === project.revision;
}

function allIDs(project) {
  return new Set([
    ...project.customLogos.map(item => item.id),
    ...project.networks.map(item => item.id),
    ...project.vlans.map(item => item.id),
    ...project.connections.map(item => item.id),
    ...project.devices.flatMap(device => [device.id, ...device.groups.flatMap(group => [group.id, ...group.services.map(service => service.id)])]),
  ]);
}

function intersects(left, right) {
  return left.x < right.x + right.w && left.x + left.w > right.x && left.y < right.y + right.h && left.y + left.h > right.y;
}

export function planDiscoveryMerge(project, snapshot, options, idFactory = uid) {
  validateProject(project);
  validateDiscoverySnapshot(snapshot);
  const choices = options?.choices;
  if (!Array.isArray(choices) || !choices.length) throw new Error('Select at least one finding.');
  const findings = new Map(snapshot.findings.map(finding => [finding.key, finding]));
  const choiceKeys = new Set();
  const bound = new Set(project.discovery.bindings.map(binding => `${binding.sourceId}\0${binding.key}`));
  for (const choice of choices) {
    exact(choice, ['key', 'serviceId'], 'Discovery choice');
    if (!findings.has(choice.key) || choiceKeys.has(choice.key) || bound.has(`${snapshot.source.id}\0${choice.key}`)) throw new Error('A selected finding is invalid or already linked.');
    if (choice.serviceId !== null && typeof choice.serviceId !== 'string') throw new Error('Discovery choice target is invalid.');
    choiceKeys.add(choice.key);
  }

  const target = options.deviceId === null ? null : project.devices.find(device => device.id === options.deviceId);
  if (options.deviceId !== null && !target) throw new Error('Choose a destination device.');
  const additions = choices.filter(choice => choice.serviceId === null);
  const links = choices.filter(choice => choice.serviceId !== null);
  if (!target && links.length) throw new Error('A new device cannot link to an existing service.');
  for (const choice of links) {
    if (!target.groups.some(group => group.services.some(service => service.id === choice.serviceId))) throw new Error('A linked service is not on the destination device.');
  }
  for (const choice of additions) if (findings.get(choice.key).count > 99) throw new Error(`${findings.get(choice.key).name} has more than 99 instances and cannot be added.`);

  let destinationGroup = null;
  if (additions.length && target && options.groupId !== null) {
    destinationGroup = target.groups.find(group => group.id === options.groupId);
    if (!destinationGroup) throw new Error('Choose a destination service group.');
  }
  const candidate = structuredClone(project);
  const before = layoutProject(project);
  const beforeCards = new Map(before.cards.map(card => [card.id, { id: card.id, x: card.x, y: card.y, w: card.w, h: card.h }]));
  const used = allIDs(project);
  const allocate = prefix => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const id = idFactory(prefix);
      if (ID_RE.test(id) && !used.has(id)) { used.add(id); return id; }
    }
    throw new Error('Could not allocate a unique project ID.');
  };

  let candidateDevice = target && candidate.devices.find(device => device.id === target.id);
  let newDevice = false;
  if (!candidateDevice) {
    if (!additions.length) throw new Error('A new device needs at least one added service.');
    const name = options.newDeviceName?.trim() || snapshot.source.name;
    candidateDevice = { id: allocate('dev'), name, role: 'Docker', icon: 'docker', accent: '#2496ed', network: '', hardware: [], groups: [] };
    candidate.devices.push(candidateDevice);
    newDevice = true;
  }

  let candidateGroup = null;
  let newGroup = false;
  if (additions.length) {
    candidateGroup = destinationGroup && candidateDevice.groups.find(group => group.id === destinationGroup.id);
    if (!candidateGroup) {
      candidateGroup = { id: allocate('grp'), name: options.newGroupName?.trim() || 'Discovered services', services: [] };
      candidateDevice.groups.push(candidateGroup);
      newGroup = true;
    }
  }

  for (const choice of choices) {
    const item = findings.get(choice.key);
    let serviceId = choice.serviceId;
    if (serviceId === null) {
      serviceId = allocate('svc');
      candidateGroup.services.push({ id: serviceId, logo: matchDiscoveryLogo(item), name: item.name, count: item.count });
    }
    candidate.discovery.bindings.push({ sourceId: snapshot.source.id, key: item.key, deviceId: candidateDevice.id, serviceId });
  }

  const heightChanges = [];
  if (additions.length) {
    if (newDevice) {
      candidate.layout = { mode: 'auto', cards: [] };
      const automatic = layoutProject(candidate);
      const cards = project.layout.mode === 'manual' ? structuredClone(project.layout.cards) : [];
      for (const card of before.cards) if (!cards.some(item => item.id === card.id)) cards.push({
        id: card.id, x: Math.round(card.x - automatic.margin), y: Math.round(card.y - automatic.cardsY), w: Math.round(card.w), h: Math.round(card.h),
      });
      candidate.layout = { mode: 'manual', cards };
      let positioned = layoutProject(candidate);
      for (const original of before.cards) {
        const current = positioned.cards.find(card => card.id === original.id);
        if (!current || current.x !== original.x || current.y !== original.y || current.w !== original.w) throw new Error('Adding a new card would shift existing cards. Adjust the diagram first.');
      }
      const added = positioned.cards.find(card => card.id === candidateDevice.id);
      candidate.layout.cards.push({ id: added.id, x: Math.round(added.x - positioned.margin), y: Math.round(added.y - positioned.cardsY), w: Math.round(added.w), h: Math.round(added.h) });
      positioned = layoutProject(candidate);
      if (before.cards.length && positioned.cards.find(card => card.id === candidateDevice.id).y < Math.max(...before.cards.map(card => card.y + card.h)) + positioned.gap) throw new Error('The new card could not be placed below existing cards.');
    } else {
      const saved = project.layout.mode === 'manual' ? structuredClone(project.layout.cards) : [];
      for (const card of before.cards) if (!saved.some(item => item.id === card.id)) saved.push({
        id: card.id, x: Math.round(card.x - before.margin), y: Math.round(card.y - before.cardsY), w: Math.round(card.w), h: Math.round(card.h),
      });
      candidate.layout = { mode: 'manual', cards: saved };
      const grown = layoutProject(candidate);
      const prior = beforeCards.get(candidateDevice.id);
      const current = grown.cards.find(card => card.id === candidateDevice.id);
      for (const original of before.cards) {
        const next = grown.cards.find(card => card.id === original.id);
        if (!next || next.x !== original.x || next.y !== original.y || next.w !== original.w) throw new Error('Adding services would shift an existing card. Adjust the diagram first.');
      }
      if (current.h > prior.h) {
        const strip = { x: current.x, y: prior.y + prior.h, w: current.w, h: current.h - prior.h };
        const collision = [...beforeCards.values()].some(card => card.id !== current.id && intersects(strip, card));
        if (collision) throw new Error(`Make room for ${candidateDevice.name} or add to a new card.`);
        candidate.layout.cards.find(card => card.id === current.id).h = Math.round(current.h);
        heightChanges.push({ deviceId: current.id, name: candidateDevice.name, from: prior.h, to: current.h });
      }
    }
  }

  validateProject(candidate);
  if (encoder.encode(JSON.stringify(candidate)).length > LIMITS.bytes) throw new Error('The resulting project would be larger than 2 MB.');
  return {
    baseRevision: project.revision,
    baseJSON: JSON.stringify(project),
    project: candidate,
    summary: { added: additions.length, linked: links.length, newDevice, newGroup, heightChanges },
  };
}

export function applyDiscoveryPlan(project, plan) {
  if (!plan || project.revision !== plan.baseRevision || JSON.stringify(project) !== plan.baseJSON) throw new Error('The project changed. Review the discovery results again.');
  const next = structuredClone(plan.project);
  for (const key of Object.keys(project)) delete project[key];
  Object.assign(project, next);
  return project;
}
