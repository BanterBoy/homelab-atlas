import test from 'node:test';
import assert from 'node:assert/strict';
import { LOGOS, logoDataUri, logoPlate } from '../public/catalog.js';
import { ICON_DATA } from '../public/icon-data.js';
import {
  LIMITS, layoutProject, parseProject, removeDevice, removeNetwork,
  renderProject, sampleProject, uid, validateProject, wrapText,
} from '../public/model.js';
import { applyProjectChange, hasStorageConflict, pngDimensions, updateSelection } from '../public/state.js';

test('sample validates and renders deterministically in dark and light themes', () => {
  const project = sampleProject();
  assert.equal(validateProject(project), true);
  assert.equal(renderProject(project), renderProject(project));
  assert.match(renderProject(project), /fill="#0b1117"/);
  project.theme = 'light';
  assert.match(renderProject(project), /fill="#edf1f4"/);
});

test('renderer is CSP-safe and escapes malicious text', () => {
  const project = sampleProject();
  project.title = '<script>alert(1)</script>&"';
  const svg = renderProject(project);
  assert.doesNotMatch(svg, /<style| style=|<script>/i);
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /&amp;/);
  assert.match(svg, /font-family=/);
});

test('bundled catalog uses real embedded assets and safe generic fallbacks', () => {
  assert.ok(Object.keys(ICON_DATA).length >= 80);
  assert.ok(LOGOS.filter(logo => !['generic', 'server', 'router', 'switch', 'wifi', 'internet', 'restic'].includes(logo.id)).length >= 60);
  assert.equal(logoDataUri('restic'), ICON_DATA.backup);
  assert.match(logoDataUri('jellyfin'), /^data:image\/svg\+xml;base64,/);
  assert.notEqual(logoDataUri('jellyfin'), logoDataUri('plex'));
});

test('IDs work without crypto.randomUUID', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis.crypto, 'randomUUID');
  Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
  try {
    const ids = new Set(Array.from({ length: 100 }, () => uid('test')));
    assert.equal(ids.size, 100);
    assert.match([...ids][0], /^test-[0-9a-f]{24}$/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis.crypto, 'randomUUID', descriptor);
    else delete globalThis.crypto.randomUUID;
  }
});

test('logo plates are limited to monochrome marks that need contrast', () => {
  for (const id of ['intel', 'ollama', 'open-webui', 'portainer', 'vaultwarden']) assert.equal(logoPlate(id, 'navy'), '#f8fafc');
  for (const id of ['amd', 'docmost', 'miniflux', 'tailscale']) assert.equal(logoPlate(id, 'light'), '#111827');
  assert.equal(logoPlate('jellyfin', 'navy'), null);
  assert.equal(logoPlate('amd', 'navy'), null);
  const project = sampleProject();
  project.devices[0].icon = 'amd';
  project.devices[0].groups[0].services[0].logo = 'docmost';
  assert.doesNotMatch(renderProject(project), /fill="#111827"/);
  project.theme = 'light';
  assert.match(renderProject(project), /fill="#111827"/);
  assert.doesNotMatch(renderProject(project), /logo-shadow|feDropShadow/);
});

test('bad and oversized imports are rejected', () => {
  assert.throws(() => parseProject('{no'), /valid JSON/);
  assert.throws(() => parseProject(' '.repeat(LIMITS.bytes + 1)), /larger/);
  const project = sampleProject();
  project.schemaVersion = 9;
  assert.throws(() => parseProject(JSON.stringify(project)), /schema/);
  project.schemaVersion = 1;
  project.devices[0].icon = 'data:image/svg+xml,<script>';
  assert.throws(() => validateProject(project), /Unknown logo/);
  const extra = sampleProject();
  extra.devices[0].html = '<img onerror=alert(1)>';
  assert.throws(() => validateProject(extra), /structure/);
});

test('IDs, counts, and connection references are enforced', () => {
  const duplicate = sampleProject();
  duplicate.devices[1].id = duplicate.devices[0].id;
  assert.throws(() => validateProject(duplicate), /duplicate ID/);
  const dangling = sampleProject();
  dangling.connections[0].to = 'missing';
  assert.throws(() => validateProject(dangling), /invalid endpoint/);
  const fractional = sampleProject();
  fractional.devices[0].groups[0].services[0].count = 1.5;
  assert.throws(() => validateProject(fractional), /1–99/);
});

test('deleting endpoints cleans dangling connections', () => {
  const project = sampleProject();
  removeDevice(project, 'dev-storage');
  assert.ok(project.connections.every(connection => connection.from !== 'dev-storage' && connection.to !== 'dev-storage'));
  removeNetwork(project, 'net-switch');
  assert.ok(project.connections.every(connection => connection.from !== 'net-switch' && connection.to !== 'net-switch'));
  assert.equal(validateProject(project), true);
});

test('wrapping and service tiles contain long labels and count badges', () => {
  assert.deepEqual(wrapText('A very long service label that cannot fit', 12, 2), ['A very long', 'service lab…']);
  assert.deepEqual(wrapText('Home Assistant', 12, 2), ['Home', 'Assistant']);
  assert.deepEqual(wrapText('Music Assistant', 12, 2), ['Music', 'Assistant']);
  assert.deepEqual(wrapText('Proxy Manager', 12, 2), ['Proxy', 'Manager']);
  const project = sampleProject();
  const service = project.devices[0].groups[0].services[0];
  service.name = 'A service label that is deliberately one hundred and twenty characters long'.padEnd(120, 'x');
  service.count = 99;
  project.devices[0].hardware = ['A hardware description '.repeat(5).slice(0, 120)];
  const svg = renderProject(project);
  assert.match(svg, /×99/);
  assert.match(svg, /<title>A service label/);
  assert.match(svg, /…/);
  const layout = layoutProject(project);
  const card = layout.cards[0];
  assert.ok(card.y + card.h < layout.height);
  assert.ok(card.x + card.w <= layout.width);
});

test('network and VLAN rows wrap without expanding beyond selected columns', () => {
  const project = sampleProject();
  project.columns = 1;
  project.networks = Array.from({ length: 20 }, (_, index) => ({ id: `network-${index}`, name: 'Very long network name '.repeat(4), kind: 'Switch', accent: '#123456' }));
  project.vlans = Array.from({ length: 20 }, (_, index) => ({ id: `vlan-${index}`, name: 'Very long VLAN name '.repeat(4), color: '#654321' }));
  project.connections = [];
  const layout = layoutProject(project);
  assert.equal(layout.width, 600);
  assert.ok(new Set(layout.networks.map(item => item.y)).size > 1);
  assert.ok(new Set(layout.vlans.map(item => item.y)).size > 1);
  for (const item of [...layout.networks, ...layout.vlans]) {
    assert.ok(item.x >= layout.margin);
    assert.ok(item.x + item.w <= layout.width - layout.margin);
  }
});

test('connections use straight network arrows, a VLAN-gap bus, and lower-card fallbacks', () => {
  const project = sampleProject();
  const layout = layoutProject(project);
  const vlanBottom = Math.max(...layout.vlans.map(vlan => vlan.y + vlan.h));
  const lastNetworkBottom = Math.max(...layout.networks.map(network => network.y + network.h));
  assert.ok(layout.routingLaneY > vlanBottom);
  assert.ok(layout.cardsY > layout.routingLaneY);
  assert.ok(lastNetworkBottom + 12 < Math.min(...layout.vlans.map(vlan => vlan.y)));
  assert.ok(layout.vlanGaps.length > 0);
  const svg = renderProject(project);
  assert.match(svg, /marker-end="url\(#arrow\)"/);
  assert.match(svg, new RegExp(`V ${layout.routingLaneY}`));
  assert.equal(layout.drawable(project.connections.find(item => item.id === 'conn-edge')), false);
  assert.ok(layout.relationships.some(connection => connection.id === 'conn-edge'));

  project.columns = 1;
  project.networks.push({ id: 'net-remote', name: 'Remote', kind: 'Router', accent: '#123456' });
  project.connections.push({ id: 'conn-complex', from: 'net-internet', to: 'net-remote', label: 'Tunnel' });
  assert.ok(layoutProject(project).relationships.some(connection => connection.id === 'conn-complex'));
});

test('masonry cards preserve order, stay in bounds, and never overlap', () => {
  const project = sampleProject();
  const layout = layoutProject(project);
  assert.deepEqual(layout.widths, [480, 480, 320]);
  assert.deepEqual(layout.cards.slice(0, 3).map(card => card.column), [0, 1, 2]);
  assert.ok(layout.cards.slice(3).every(card => card.column === 2));
  for (const card of layout.cards) {
    assert.ok(card.x >= layout.margin);
    assert.ok(card.x + card.w <= layout.width - layout.margin);
    assert.ok(card.y >= layout.cardsY);
    assert.ok(card.y + card.h < layout.relationshipsY);
  }
  for (let i = 0; i < layout.cards.length; i += 1) {
    for (let j = i + 1; j < layout.cards.length; j += 1) {
      const a = layout.cards[i];
      const b = layout.cards[j];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
    }
  }
  assert.equal(layout.cards.find(card => card.id === 'dev-ai').tileColumns, 3);
});

test('card labels and hardware remain bounded across one to four columns', () => {
  for (const columns of [1, 2, 3, 4]) {
    const project = sampleProject();
    project.columns = columns;
    project.devices[0].name = 'An unusually long storage host name for wrapping';
    project.devices[0].hardware = ['A hardware description that is long enough to wrap without leaving its card boundary'];
    const layout = layoutProject(project);
    const svg = renderProject(project);
    assert.match(svg, /…/);
    assert.ok(layout.cards.every(card => card.x + card.w <= layout.width - layout.margin));
    assert.ok(layout.footerY < layout.height);
  }
});

test('invalid changes are atomic', () => {
  const project = sampleProject();
  const before = structuredClone(project);
  assert.throws(() => applyProjectChange(project, candidate => { candidate.devices[0].groups[0].services[0].count = Number.NaN; }), /1–99/);
  assert.deepEqual(project, before);
  const changed = applyProjectChange(project, candidate => { candidate.title = 'Changed'; });
  assert.equal(changed.title, 'Changed');
  assert.equal(changed.revision, project.revision + 1);
});

test('selection survives filtering state changes', () => {
  let selection = new Set();
  selection = updateSelection(selection, 'jellyfin', true);
  selection = updateSelection(selection, 'grafana', true);
  selection = updateSelection(selection, 'jellyfin', true);
  assert.deepEqual([...selection], ['jellyfin', 'grafana']);
  assert.equal(updateSelection(selection, 'jellyfin', false).has('grafana'), true);
});

test('foreign localStorage values always conflict regardless of revision', () => {
  const foreign = JSON.stringify({ tab: 'other', revision: 0, data: '{}' });
  assert.equal(hasStorageConflict(foreign, '', 'mine'), true);
  assert.equal(hasStorageConflict(foreign, foreign, 'mine'), false);
  assert.equal(hasStorageConflict(JSON.stringify({ tab: 'mine', data: '{}' }), '', 'mine'), false);
});

test('PNG dimensions enforce pixel and side limits while preserving ratio', () => {
  const normal = pngDimensions(1200, 800);
  assert.deepEqual([normal.width, normal.height], [3600, 2400]);
  assert.equal(normal.reduced, false);
  const tall = pngDimensions(1000, 30_000);
  assert.ok(tall.height <= 16_384);
  assert.ok(tall.width * tall.height <= 36_000_000);
  assert.ok(Math.abs(tall.width / tall.height - 1 / 30) < 0.002);
  assert.equal(tall.reduced, true);
});
