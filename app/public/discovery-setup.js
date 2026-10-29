export const SETUP_COMMANDS = Object.freeze({
  token: 'openssl rand -hex 32',
  collectorEnv: 'ATLAS_COLLECTOR_TOKEN=paste-your-generated-value',
  composeSource: 'docker compose --profile discovery up -d',
  composeRelease: 'docker compose -f compose.release.yaml --profile discovery up -d',
  nmapEnv: 'ATLAS_WITH_NMAP=true',
  nmapBuild: 'ATLAS_WITH_NMAP=true docker compose up -d --build',
  snapshot: `docker run --rm \\
  --user 0:0 \\
  --read-only \\
  --network none \\
  --cap-drop ALL \\
  --security-opt no-new-privileges=true \\
  -e ATLAS_HOST_ID=nas \\
  -e 'ATLAS_HOST_NAME=NAS Docker' \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  ghcr.io/aiden0rchad/homelab-atlas:0.12.0 collect \\
  > ../nas-docker-snapshot.json`,
});

export function discoverySetupSteps(method, answers = {}) {
  if (method === 'docker') {
    if (answers.location === 'another') return ['docker-location', 'docker-snapshot'];
    if (answers.location !== 'same') return ['docker-location'];
    if (!answers.install) return ['docker-location', 'docker-install'];
    if (answers.install === 'native') return ['docker-location', 'docker-install', 'docker-native'];
    return ['docker-location', 'docker-install', 'docker-token', 'docker-env', `docker-start-${answers.install}`, 'docker-check'];
  }
  if (method === 'network') {
    if (!answers.install) return ['nmap-install'];
    if (answers.install === 'native') return ['nmap-install', 'nmap-native', 'nmap-check'];
    return ['nmap-install', 'nmap-source', 'nmap-env', 'nmap-build', 'nmap-check'];
  }
  return [];
}

export function discoverySetupProgress(method, answers, index) {
  const steps = discoverySetupSteps(method, answers);
  const branchKnown = method === 'docker' ? answers.location === 'another' || Boolean(answers.install) : Boolean(answers.install);
  return `Setup · Step ${index + 1}${branchKnown ? ` of ${steps.length}` : ''}`;
}

export function updateDiscoverySetupAnswers(answers, key, value) {
  if (key === 'location' && answers.location !== value) return { location: value };
  return { ...answers, [key]: value };
}

export function shouldOpenDockerSetup(readiness, sources) {
  return readiness === 'loaded' && sources.length === 0;
}
