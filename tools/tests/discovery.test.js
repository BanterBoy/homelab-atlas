import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDiscoveryPlan, captureProjectGuard, discoveryBindingLabel, matchDiscoveryLogo,
  filterDiscoveryFindings, parseDiscoverySnapshot, planDiscoveryMerge, projectGuardCurrent, suggestDiscoveryService,
  validateDiscoverySnapshot,
} from '../../app/public/discovery.js';
import { emptyProject, layoutProject, sampleProject, setManualCard, validateProject } from '../../app/public/model.js';

const key = (kind, character) => `${kind}:${character.repeat(64)}`;
const finding = (overrides = {}) => ({
  key: key('container', 'a'), name: 'Jellyfin', image: 'ghcr.io/linuxserver/jellyfin:latest', count: 1,
  running: 1, stopped: 0, ports: ['8096:8096/tcp'], composeProject: '', composeService: '', containerNames: ['jellyfin'],
  ...overrides,
});
const snapshot = (...findings) => ({
  format: 'homelab-atlas.docker-discovery', version: 1,
  source: { id: 'localdocker', name: 'Docker' }, scannedAt: '2026-10-27T12:00:00Z', findings,
});
const ids = () => {
  let value = 0;
  return prefix => `${prefix}-discovery-${++value}`;
};

test('snapshot validation is strict, bounded, and non-mutating', () => {
  const value = snapshot(finding());
  assert.equal(validateDiscoverySnapshot(value), true);
  assert.deepEqual(parseDiscoverySnapshot(JSON.stringify(value)), value);
  const duplicate = snapshot(finding(), finding());
  assert.throws(() => validateDiscoverySnapshot(duplicate), /duplicated/);
  const unknown = structuredClone(value);
  unknown.findings[0].environment = ['SECRET=value'];
  assert.throws(() => validateDiscoverySnapshot(unknown), /structure/);
  const badDate = structuredClone(value);
  badDate.scannedAt = '2026-02-30T12:00:00Z';
  assert.throws(() => validateDiscoverySnapshot(badDate), /date/);
  const badCount = structuredClone(value);
  badCount.findings[0].stopped = 1;
  assert.throws(() => validateDiscoverySnapshot(badCount), /counts/);
  const badUnicode = structuredClone(value);
  badUnicode.findings[0].name = '\ud800';
  assert.throws(() => validateDiscoverySnapshot(badUnicode), /name/);
  const arraySource = structuredClone(value);
  arraySource.source.id = ['localdocker'];
  assert.throws(() => validateDiscoverySnapshot(arraySource), /source ID/);
  const arrayKey = structuredClone(value);
  arrayKey.findings[0].key = [arrayKey.findings[0].key];
  assert.throws(() => validateDiscoverySnapshot(arrayKey), /key/);
  assert.throws(() => parseDiscoverySnapshot('x'.repeat(2_000_001)), /2 MB/);
});

test('finding search covers names, images, and Compose metadata without mutating order', () => {
  const findings = [
    finding({ key: key('container', 'b'), name: 'Zulu', image: 'example/worker:1' }),
    finding({ key: key('compose', 'c'), name: 'Alpha', image: 'example/api:1', composeProject: 'Home Stack', composeService: 'gateway' }),
  ];
  assert.deepEqual(filterDiscoveryFindings(findings, '').map(item => item.name), ['Alpha', 'Zulu']);
  assert.deepEqual(filterDiscoveryFindings(findings, 'worker').map(item => item.name), ['Zulu']);
  assert.deepEqual(filterDiscoveryFindings(findings, 'home stack').map(item => item.name), ['Alpha']);
  assert.deepEqual(findings.map(item => item.name), ['Zulu', 'Alpha']);
});

test('catalog matching and unique-name suggestions are deterministic', () => {
  assert.equal(matchDiscoveryLogo(finding()), 'jellyfin');
  assert.equal(matchDiscoveryLogo(finding({ name: 'Database', image: 'postgres:17' })), 'postgresql');
  assert.equal(matchDiscoveryLogo(finding({ name: 'Unknown app', image: 'registry.invalid/acme:1' })), 'generic');
  const device = sampleProject().devices[0];
  assert.equal(suggestDiscoveryService(finding({ name: 'Portainer' }), device), 'svc-atlas-a-3');
  assert.equal(suggestDiscoveryService(finding({ name: 'Not present' }), device), null);
});

test('linking only adds a binding and preserves all project and layout details', () => {
  const project = sampleProject();
  setManualCard(project, 'dev-storage', { x: 72, y: 41, w: 520, h: 1300 });
  const beforeLayout = structuredClone(project.layout);
  const beforeService = structuredClone(project.devices[0].groups[0].services[0]);
  const value = snapshot(finding({ name: beforeService.name }));
  const plan = planDiscoveryMerge(project, value, {
    deviceId: 'dev-storage', groupId: null, newGroupName: 'Must not exist',
    choices: [{ key: value.findings[0].key, serviceId: beforeService.id }],
  }, ids());
  assert.deepEqual(plan.project.layout, beforeLayout);
  assert.deepEqual(plan.project.devices[0].groups[0].services[0], beforeService);
  assert.equal(plan.project.devices[0].groups.some(group => group.name === 'Must not exist'), false);
  assert.deepEqual(plan.summary, { added: 0, linked: 1, newDevice: false, newGroup: false, heightChanges: [] });
  const applied = structuredClone(project);
  applyDiscoveryPlan(applied, plan);
  assert.equal(validateProject(applied), true);
  assert.equal(applied.discovery.bindings.length, 1);
  assert.equal(discoveryBindingLabel(applied, applied.discovery.bindings[0]), `${project.devices[0].name} · ${beforeService.name}`);
  assert.throws(() => applyDiscoveryPlan(applied, plan), /changed/);
});

test('adding services snapshots manual positions and grows only the target card', () => {
  const project = sampleProject();
  setManualCard(project, 'dev-media', { x: 512, y: 37, w: 461, h: 1700 });
  const storedPeer = structuredClone(project.layout.cards.find(card => card.id === 'dev-media'));
  const before = layoutProject(project);
  const value = snapshot(finding({ key: key('compose', 'b'), name: 'New application', image: 'new/app:1', count: 2, containerNames: ['new-1', 'new-2'], running: 2 }));
  const plan = planDiscoveryMerge(project, value, {
    deviceId: 'dev-storage', groupId: 'grp-infra', choices: [{ key: value.findings[0].key, serviceId: null }],
  }, ids());
  const after = layoutProject(plan.project);
  for (const card of before.cards) {
    const next = after.cards.find(item => item.id === card.id);
    assert.deepEqual({ x: next.x, y: next.y, w: next.w }, { x: card.x, y: card.y, w: card.w });
    if (card.id !== 'dev-storage') assert.equal(next.h, card.h);
  }
  const service = plan.project.devices[0].groups[0].services.at(-1);
  assert.deepEqual({ name: service.name, logo: service.logo, count: service.count }, { name: 'New application', logo: 'generic', count: 2 });
  assert.equal(plan.project.discovery.bindings[0].serviceId, service.id);
  assert.deepEqual(plan.project.layout.cards.find(card => card.id === 'dev-media'), storedPeer);
});

test('new cards are below existing cards without shifting sparse diagrams', () => {
  const project = emptyProject();
  project.columns = 3;
  project.devices.push({ id: 'dev-existing', name: 'Existing', role: 'Server', icon: 'server', accent: '#38bdf8', network: '', hardware: [], groups: [] });
  const before = layoutProject(project);
  const value = snapshot(finding({ key: key('container', 'c'), name: 'Caddy', image: 'caddy:2' }));
  const plan = planDiscoveryMerge(project, value, {
    deviceId: null, groupId: null, newDeviceName: 'Docker host', newGroupName: 'Discovered services',
    choices: [{ key: value.findings[0].key, serviceId: null }],
  }, ids());
  const after = layoutProject(plan.project);
  const original = after.cards.find(card => card.id === 'dev-existing');
  const added = after.cards.find(card => card.id !== 'dev-existing');
  assert.deepEqual({ x: original.x, y: original.y, w: original.w }, { x: before.cards[0].x, y: before.cards[0].y, w: before.cards[0].w });
  assert.ok(added.y >= original.y + original.h + after.gap);
  assert.equal(plan.project.devices.at(-1).hardware.length, 0);
  assert.equal(plan.project.devices.at(-1).icon, 'docker');

  const manual = sampleProject();
  setManualCard(manual, 'dev-storage', { x: 24, y: 16, w: 500, h: 1300 });
  const stored = structuredClone(manual.layout.cards);
  const manualPlan = planDiscoveryMerge(manual, value, {
    deviceId: null, groupId: null, newDeviceName: 'Docker host', newGroupName: 'Discovered services',
    choices: [{ key: value.findings[0].key, serviceId: null }],
  }, ids());
  assert.deepEqual(manualPlan.project.layout.cards.slice(0, stored.length), stored);
});

test('new growth collisions and limits roll back before apply', () => {
  const project = emptyProject();
  project.columns = 1;
  project.devices.push(
    { id: 'dev-target', name: 'Target', role: 'Server', icon: 'server', accent: '#38bdf8', network: '', hardware: [], groups: [{ id: 'grp-target', name: 'Apps', services: [] }] },
    { id: 'dev-peer', name: 'Peer', role: 'Server', icon: 'server', accent: '#38bdf8', network: '', hardware: [], groups: [] },
  );
  let layout = layoutProject(project);
  setManualCard(project, 'dev-target', { x: 0, y: 0, w: 480, h: layout.cards[0].h });
  layout = layoutProject(project);
  setManualCard(project, 'dev-peer', { x: 0, y: layout.cards.find(card => card.id === 'dev-target').h + 1, w: 480, h: layout.cards.find(card => card.id === 'dev-peer').h });
  const before = structuredClone(project);
  const findings = Array.from({ length: 8 }, (_, index) => finding({
    key: key('container', (index + 1).toString(16)), name: `App ${index + 1}`, image: `app:${index + 1}`, containerNames: [`app-${index + 1}`],
  }));
  const value = snapshot(...findings);
  assert.throws(() => planDiscoveryMerge(project, value, {
    deviceId: 'dev-target', groupId: 'grp-target', choices: findings.map(item => ({ key: item.key, serviceId: null })),
  }, ids()), /Make room for Target/);
  assert.deepEqual(project, before);

  const oversized = snapshot(finding({ count: 100, running: 100, containerNames: Array.from({ length: 100 }, (_, index) => `replica-${index}`) }));
  assert.throws(() => planDiscoveryMerge(project, oversized, {
    deviceId: 'dev-target', groupId: 'grp-target', choices: [{ key: oversized.findings[0].key, serviceId: null }],
  }, ids()), /more than 99/);
  assert.deepEqual(project, before);
});

test('bindings prevent duplicate imports and project guards reject stale async work', () => {
  const project = sampleProject();
  const value = snapshot(finding());
  const first = planDiscoveryMerge(project, value, {
    deviceId: 'dev-storage', groupId: 'grp-infra', choices: [{ key: value.findings[0].key, serviceId: null }],
  }, ids());
  assert.throws(() => planDiscoveryMerge(first.project, value, {
    deviceId: 'dev-storage', groupId: 'grp-infra', choices: [{ key: value.findings[0].key, serviceId: null }],
  }, ids()), /already linked/);
  const guard = captureProjectGuard(project);
  assert.equal(projectGuardCurrent(guard, project), true);
  const replacement = structuredClone(project);
  assert.equal(projectGuardCurrent(guard, replacement), false);
  project.revision += 1;
  assert.equal(projectGuardCurrent(guard, project), false);
});
