import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverySetupProgress, discoverySetupSteps, SETUP_COMMANDS, shouldOpenDockerSetup, updateDiscoverySetupAnswers } from '../../app/public/discovery-setup.js';

test('Docker setup branches to local Compose, native, or remote snapshot paths', () => {
  assert.deepEqual(discoverySetupSteps('docker'), ['docker-location']);
  assert.deepEqual(discoverySetupSteps('docker', { location: 'another' }), ['docker-location', 'docker-snapshot']);
  assert.deepEqual(discoverySetupSteps('docker', { location: 'same', install: 'native' }), ['docker-location', 'docker-install', 'docker-native']);
  assert.deepEqual(discoverySetupSteps('docker', { location: 'same', install: 'released' }).slice(-2), ['docker-start-released', 'docker-check']);
  assert.deepEqual(discoverySetupSteps('docker', { location: 'same', install: 'source' }).slice(-2), ['docker-start-source', 'docker-check']);
});

test('Nmap setup separates source builds from native installs', () => {
  assert.deepEqual(discoverySetupSteps('network'), ['nmap-install']);
  assert.deepEqual(discoverySetupSteps('network', { install: 'native' }), ['nmap-install', 'nmap-native', 'nmap-check']);
  assert.deepEqual(discoverySetupSteps('network', { install: 'compose' }), ['nmap-install', 'nmap-source', 'nmap-env', 'nmap-build', 'nmap-check']);
});

test('setup progress waits for a known branch and branch changes clear stale answers', () => {
  assert.equal(discoverySetupProgress('docker', {}, 0), 'Setup · Step 1');
  assert.equal(discoverySetupProgress('docker', { location: 'same' }, 1), 'Setup · Step 2');
  assert.equal(discoverySetupProgress('docker', { location: 'same', install: 'released' }, 2), 'Setup · Step 3 of 6');
  assert.equal(discoverySetupProgress('network', { install: 'native' }, 1), 'Setup · Step 2 of 3');
  assert.deepEqual(updateDiscoverySetupAnswers({ location: 'same', install: 'released' }, 'location', 'another'), { location: 'another' });
  assert.deepEqual(updateDiscoverySetupAnswers({ location: 'same', install: 'released' }, 'location', 'same'), { location: 'same', install: 'released' });
});

test('Docker setup opens only after a successful empty readiness response', () => {
  for (const readiness of ['unknown', 'loading', 'error']) assert.equal(shouldOpenDockerSetup(readiness, []), false);
  assert.equal(shouldOpenDockerSetup('loaded', [{ id: 'local' }]), false);
  assert.equal(shouldOpenDockerSetup('loaded', []), true);
});

test('setup commands keep the documented release and restricted snapshot forms', () => {
  assert.match(SETUP_COMMANDS.composeRelease, /compose\.release\.yaml --profile discovery/);
  assert.match(SETUP_COMMANDS.snapshot, /--network none/);
  assert.match(SETUP_COMMANDS.snapshot, /homelab-atlas:0\.11\.1 collect/);
  assert.equal(SETUP_COMMANDS.nmapBuild, 'ATLAS_WITH_NMAP=true docker compose up -d --build');
});
