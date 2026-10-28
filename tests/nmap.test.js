import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscoveryPlan, filterDiscoveryFindings, planDiscoveryMerge, validateDiscoverySnapshot, validateNmapBundle } from '../public/discovery.js';
import { emptyProject, sampleProject, validateProject } from '../public/model.js';

const hex = value => value.repeat(64).slice(0, 64);
const snapshot = () => ({
  format: 'homelab-atlas.nmap-discovery', version: 1,
  source: { id: hex('a'), name: 'router.example' }, scannedAt: '2024-01-02T03:04:05Z',
  host: { addresses: ['192.0.2.10', '2001:db8::10'], hostnames: ['router.example'], mac: 'AA:BB:CC:DD:EE:FF', vendor: 'Acme' },
  findings: [
    { key: `nmap-host:${hex('b')}`, name: 'router.example', kind: 'host' },
    { key: `nmap:${hex('c')}`, name: 'Caddy · tcp/443', kind: 'service', protocol: 'tcp', port: 443, service: 'https', product: 'Caddy', version: '2.8', tunnel: 'ssl' },
  ],
});

test('Nmap bundle and snapshots validate exact bounded unions', () => {
  const value = snapshot();
  const bundle = { format: 'homelab-atlas.nmap-import', version: 1, scope: 'Home network', scannedAt: value.scannedAt, snapshots: [value], skippedHosts: 2, skippedPorts: 3 };
  assert.equal(validateNmapBundle(bundle), true);
  assert.equal(validateDiscoverySnapshot(value), true);
  for (const mutate of [
    item => { item.extra = true; },
    item => { item.snapshots[0].findings[0].protocol = 'tcp'; },
    item => { item.snapshots[0].findings[1].port = 0; },
    item => { item.snapshots[0].findings.push(structuredClone(item.snapshots[0].findings[0])); },
    item => { item.snapshots[0].host.mac = 'not-a-mac'; },
  ]) {
    const invalid = structuredClone(bundle); mutate(invalid);
    assert.throws(() => validateNmapBundle(invalid));
  }
  assert.deepEqual(filterDiscoveryFindings(value.findings, '443').map(item => item.kind), ['service']);
  assert.deepEqual(filterDiscoveryFindings(value.findings, 'caddy').map(item => item.kind), ['service']);
});

test('host-only Nmap import creates a card and null device binding', () => {
  const project = emptyProject();
  const value = snapshot(); value.findings.pop();
  let serial = 0;
  const plan = planDiscoveryMerge(project, value, {
    deviceId: null, groupId: null, newDeviceName: '', newGroupName: '',
    choices: [{ key: value.findings[0].key, serviceId: null }],
  }, prefix => `${prefix}-${++serial}`);
  assert.equal(plan.summary.newDevice, true);
  assert.deepEqual(plan.project.devices[0], {
    id: 'dev-1', name: 'router.example', role: 'Network host', icon: 'server', accent: '#55d6c9', network: '',
    hardware: ['192.0.2.10', '2001:db8::10'], groups: [],
  });
  assert.equal(plan.project.discovery.bindings[0].serviceId, null);
  applyDiscoveryPlan(project, plan);
  assert.equal(validateProject(project), true);
});

test('partial endpoint import and host link preserve existing device metadata', () => {
  const project = sampleProject();
  const before = structuredClone(project.devices[0]);
  const value = snapshot();
  let serial = 0;
  const plan = planDiscoveryMerge(project, value, {
    deviceId: project.devices[0].id, groupId: project.devices[0].groups[0].id,
    choices: value.findings.map(item => ({ key: item.key, serviceId: null })),
  }, prefix => `${prefix}-nmap-${++serial}`);
  const device = plan.project.devices[0];
  assert.deepEqual({ name: device.name, role: device.role, icon: device.icon, network: device.network, hardware: device.hardware },
    { name: before.name, role: before.role, icon: before.icon, network: before.network, hardware: before.hardware });
  assert.equal(plan.project.discovery.bindings.find(item => item.key.startsWith('nmap-host:')).serviceId, null);
  assert.equal(device.groups[0].services.at(-1).name, 'Caddy · tcp/443');
  assert.throws(() => planDiscoveryMerge(plan.project, value, {
    deviceId: device.id, groupId: device.groups[0].id, choices: [{ key: value.findings[0].key, serviceId: null }],
  }), /already linked/);
});
