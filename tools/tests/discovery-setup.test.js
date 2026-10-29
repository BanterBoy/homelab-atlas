import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverySetupSteps, SETUP_COMMANDS } from '../../app/public/discovery-setup.js';

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

test('setup commands keep the documented release and restricted snapshot forms', () => {
  assert.match(SETUP_COMMANDS.composeRelease, /compose\.release\.yaml --profile discovery/);
  assert.match(SETUP_COMMANDS.snapshot, /--network none/);
  assert.match(SETUP_COMMANDS.snapshot, /homelab-atlas:0\.11\.1 collect/);
  assert.equal(SETUP_COMMANDS.nmapBuild, 'ATLAS_WITH_NMAP=true docker compose up -d --build');
});
