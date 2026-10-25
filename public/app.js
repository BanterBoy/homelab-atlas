import { LOGOS, logoById, logoDataUri } from './catalog.js';
import {
  LIMITS, emptyProject, parseProject, removeDevice, removeNetwork,
  renderProject, sampleProject, uid, validateProject,
} from './model.js';
import { applyProjectChange, hasStorageConflict, pngDimensions, updateSelection } from './state.js';

const $ = selector => document.querySelector(selector);
const STORAGE_KEY = 'homelab-atlas.project';
const TAB_ID = crypto.randomUUID();
const templates = [
  { id: 'server', name: 'Server', icon: 'server', accent: '#38bdf8', services: [] },
  { id: 'nas', name: 'NAS', icon: 'truenas', accent: '#22b8cf', services: [['truenas', 'TrueNAS']] },
  { id: 'hypervisor', name: 'Hypervisor', icon: 'proxmox', accent: '#f97316', services: [['proxmox', 'Proxmox']] },
  { id: 'media', name: 'Media server', icon: 'unraid', accent: '#f59e0b', services: [['jellyfin', 'Jellyfin'], ['sonarr', 'Sonarr'], ['radarr', 'Radarr']] },
  { id: 'ai', name: 'AI server', icon: 'open-webui', accent: '#8b5cf6', services: [['ollama', 'Ollama'], ['open-webui', 'Open WebUI']] },
  { id: 'pi', name: 'Raspberry Pi', icon: 'raspberry-pi', accent: '#ef476f', services: [] },
  { id: 'cloud', name: 'Cloud server', icon: 'server', accent: '#3b82f6', services: [] },
  { id: 'router', name: 'Router', icon: 'router', accent: '#22c55e', network: true },
  { id: 'switch', name: 'Switch', icon: 'switch', accent: '#06b6d4', network: true },
  { id: 'wifi', name: 'Wi-Fi', icon: 'wifi', accent: '#a78bfa', network: true },
  { id: 'internet', name: 'Internet', icon: 'internet', accent: '#f97316', network: true },
];

let project;
let selected = null;
let inspectorOpen = false;
let history = [];
let future = [];
let zoom = 1;
let fitMode = true;
let saveTimer;
let lastStored = '';
let conflictRaw = '';
let targetGroup = null;
let logoSelection = new Set();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function toast(message, persistent = false) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(element._timer);
  if (!persistent) element._timer = setTimeout(() => element.classList.remove('show'), 4000);
}

function setSaveStatus(message, warning = false) {
  $('#save-status').textContent = message;
  $('#save-status').classList.toggle('warn', warning);
}

function countServices(source = project) {
  return source.devices.reduce((total, device) => total + device.groups.reduce((sum, group) => sum + group.services.length, 0), 0);
}

function countGroups(source = project) {
  return source.devices.reduce((total, device) => total + device.groups.length, 0);
}

function change(mutator, options = {}) {
  try {
    const previous = project;
    const candidate = applyProjectChange(project, mutator);
    history.push(structuredClone(previous));
    if (history.length > 60) history.shift();
    future = [];
    project = candidate;
    if ('select' in options) selected = options.select;
    render();
    scheduleSave();
    return true;
  } catch (error) {
    render();
    toast(error.message);
    return false;
  }
}

function replaceProject(next) {
  validateProject(next);
  history.push(structuredClone(project));
  if (history.length > 60) history.shift();
  future = [];
  project = structuredClone(next);
  project.revision = history.at(-1).revision + 1;
  selected = null;
  render();
  scheduleSave();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  setSaveStatus('Saving…');
  saveTimer = setTimeout(() => saveProject(), 350);
}

function showConflict(raw) {
  conflictRaw = raw;
  $('#conflict-banner').hidden = false;
  setSaveStatus('Save conflict — action needed', true);
}

function hideConflict() {
  conflictRaw = '';
  $('#conflict-banner').hidden = true;
}

function saveProject(force = false) {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!force && hasStorageConflict(existing, lastStored, TAB_ID)) {
      showConflict(existing);
      return false;
    }
    const raw = JSON.stringify({ tab: TAB_ID, data: JSON.stringify(project) });
    localStorage.setItem(STORAGE_KEY, raw);
    lastStored = raw;
    hideConflict();
    setSaveStatus('Saved locally');
    return true;
  } catch {
    setSaveStatus('Not saved — storage unavailable', true);
    return false;
  }
}

function loadProject() {
  let fresh = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      project = parseProject(JSON.parse(raw).data);
      lastStored = raw;
    } else {
      project = sampleProject();
      fresh = true;
    }
  } catch (error) {
    project = sampleProject();
    setSaveStatus('Not saved — storage unavailable', true);
    toast(`Local project could not be loaded: ${error.message}`);
    render();
    return;
  }
  render();
  if (fresh) saveProject(); else setSaveStatus('Saved locally');
}

function render() {
  validateProject(project);
  $('#project-title').value = project.title;
  $('#preview').innerHTML = renderProject(project);
  renderInventory();
  renderInspector();
  $('.inspector').classList.toggle('open', inspectorOpen);
  $('#undo').disabled = !history.length;
  $('#redo').disabled = !future.length;
  requestAnimationFrame(() => fitMode ? fitPreview() : applyZoom());
}

function applyZoom() {
  const svg = $('#preview svg');
  if (!svg) return;
  const width = svg.viewBox.baseVal.width * zoom;
  const height = svg.viewBox.baseVal.height * zoom;
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  $('#zoom-label').value = `${Math.round(zoom * 100)}%`;
}

function fitPreview() {
  const svg = $('#preview svg');
  const canvas = $('#canvas');
  if (!svg || !canvas.clientWidth || !canvas.clientHeight) return;
  const availableWidth = Math.max(100, canvas.clientWidth - 72);
  const availableHeight = Math.max(100, canvas.clientHeight - 112);
  zoom = Math.min(1, availableWidth / svg.viewBox.baseVal.width, availableHeight / svg.viewBox.baseVal.height);
  applyZoom();
}

function renderInventory() {
  const deviceList = $('#device-list');
  deviceList.replaceChildren(...project.devices.map((device, index) => {
    const row = document.createElement('div');
    row.className = `inventory-item ${selected === device.id ? 'selected' : ''}`;
    row.dataset.id = device.id;
    row.innerHTML = `<button class="inventory-select" aria-label="Edit ${escapeHtml(device.name)}"><img alt="" src="${logoDataUri(device.icon)}"><span><strong></strong><small></small></span></button><span class="reorder"><button class="mini" data-move="-1" aria-label="Move up">↑</button><button class="mini" data-move="1" aria-label="Move down">↓</button></span>`;
    row.querySelector('strong').textContent = device.name;
    row.querySelector('small').textContent = device.role;
    const buttons = row.querySelectorAll('[data-move]');
    buttons[0].disabled = index === 0;
    buttons[1].disabled = index === project.devices.length - 1;
    return row;
  }));

  const networkList = $('#network-list');
  networkList.replaceChildren(...project.networks.map(network => {
    const row = document.createElement('div');
    row.className = `inventory-item ${selected === network.id ? 'selected' : ''}`;
    row.dataset.id = network.id;
    row.innerHTML = `<button class="inventory-select" aria-label="Edit ${escapeHtml(network.name)}"><img alt="" src="${logoDataUri(networkIcon(network.kind))}"><span><strong></strong><small></small></span></button>`;
    row.querySelector('strong').textContent = network.name;
    row.querySelector('small').textContent = network.kind;
    return row;
  }));
}

function networkIcon(kind) {
  const value = kind.toLowerCase();
  if (value.includes('internet')) return 'internet';
  if (value.includes('router')) return 'router';
  if (value.includes('switch')) return 'switch';
  if (value.includes('wi-fi') || value.includes('wifi')) return 'wifi';
  return 'generic';
}

function projectForm() {
  return `<div class="settings"><span class="eyebrow">Appearance</span><label>Subtitle<input data-project="subtitle" maxlength="120"></label><div class="form-grid"><label>Theme<select data-project="theme"><option value="navy">Navy</option><option value="light">Light</option><option value="midnight">Midnight</option></select></label><label>Columns<select data-project="columns"><option>1</option><option>2</option><option>3</option><option>4</option></select></label></div><label>Density<select data-project="density"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><div class="section-head"><h2>VLAN chips</h2><button type="button" data-add-vlan>＋ VLAN</button></div><div id="vlan-list" class="vlan-list"></div></div>`;
}

function bindProjectForm(root) {
  for (const key of ['subtitle', 'theme', 'columns', 'density']) root.querySelector(`[data-project=${key}]`).value = project[key];
  root.querySelector('#vlan-list').replaceChildren(...project.vlans.map(vlan => {
    const row = document.createElement('div');
    row.className = 'vlan-row';
    row.dataset.vlan = vlan.id;
    row.innerHTML = '<input data-vlan-name maxlength="120" aria-label="VLAN name"><input data-vlan-color type="color" aria-label="VLAN color"><button type="button" data-remove-vlan class="danger" aria-label="Remove VLAN">×</button>';
    row.querySelector('[data-vlan-name]').value = vlan.name;
    row.querySelector('[data-vlan-color]').value = vlan.color;
    return row;
  }));
}

function renderInspector() {
  const root = $('#inspector-content');
  const device = project.devices.find(item => item.id === selected);
  const network = project.networks.find(item => item.id === selected);
  if (!device && !network) {
    root.innerHTML = `<span class="eyebrow">Project</span><h2>Diagram settings</h2><p class="muted">Select a device or network node to edit it.</p>${projectForm()}`;
    bindProjectForm(root);
    return;
  }
  if (network) {
    root.innerHTML = `<div class="inspector-head"><div><span class="eyebrow">Network node</span><h2>${escapeHtml(network.name)}</h2></div><button data-delete-network class="danger">Delete</button></div><label>Name<input data-network="name" maxlength="120"></label><div class="form-grid"><label>Kind<input data-network="kind" maxlength="120"></label><label>Accent<input data-network="accent" type="color"></label></div>${projectForm()}`;
    for (const key of ['name', 'kind', 'accent']) root.querySelector(`[data-network=${key}]`).value = network[key];
    bindProjectForm(root);
    return;
  }
  const iconOptions = LOGOS.map(logo => `<option value="${logo.id}">${escapeHtml(logo.label)}</option>`).join('');
  root.innerHTML = `<div class="inspector-head"><div><span class="eyebrow">Device</span><h2>${escapeHtml(device.name)}</h2></div><div><button data-duplicate title="Duplicate">⧉</button><button data-delete class="danger">Delete</button></div></div><label>Name<input data-device="name" maxlength="120"></label><label>Role<input data-device="role" maxlength="120"></label><div class="form-grid"><label>Network / VLAN<input data-device="network" maxlength="120"></label><label>Accent<input data-device="accent" type="color"></label></div><label>Search device icon<input data-device="icon" list="icon-options" maxlength="64"><datalist id="icon-options">${iconOptions}</datalist></label><label>Hardware facts <span class="muted">one per line</span><textarea data-hardware maxlength="1451"></textarea></label><div class="section-head"><h2>Service groups</h2><button data-add-group>＋ Group</button></div><div id="groups"></div>${projectForm()}`;
  for (const key of ['name', 'role', 'network', 'accent', 'icon']) root.querySelector(`[data-device=${key}]`).value = device[key];
  root.querySelector('[data-hardware]').value = device.hardware.join('\n');
  root.querySelector('#groups').replaceChildren(...device.groups.map(groupElement));
  bindProjectForm(root);
}

function groupElement(group) {
  const element = document.createElement('section');
  element.className = 'group';
  element.dataset.group = group.id;
  element.innerHTML = '<div class="group-head"><input data-group-name maxlength="120" aria-label="Group name"><button data-add-services>＋ Apps</button><button data-remove-group class="danger" aria-label="Remove group">×</button></div><div class="service-list"></div>';
  element.querySelector('[data-group-name]').value = group.name;
  element.querySelector('.service-list').replaceChildren(...group.services.map(service => {
    const row = document.createElement('div');
    row.className = 'service-row';
    row.dataset.service = service.id;
    row.innerHTML = `<img alt="" src="${logoDataUri(service.logo)}"><input data-service-name maxlength="120" aria-label="Service name"><input data-service-count type="number" min="1" max="99" step="1" aria-label="Instance count"><button data-service-up class="mini" aria-label="Move up">↑</button><button data-service-down class="mini" aria-label="Move down">↓</button><button data-remove-service class="mini danger" aria-label="Remove service">×</button>`;
    row.querySelector('[data-service-name]').value = service.name;
    row.querySelector('[data-service-count]').value = service.count;
    return row;
  }));
  return element;
}

function selectInventoryItem(id) {
  selected = id;
  inspectorOpen = true;
  render();
}

for (const id of ['device-list', 'network-list']) {
  const list = $(`#${id}`);
  list.addEventListener('click', event => {
    const item = event.target.closest('[data-id]');
    if (!item) return;
    const move = event.target.closest('[data-move]');
    if (move) {
      event.stopPropagation();
      const deviceId = item.dataset.id;
      change(candidate => {
        const index = candidate.devices.findIndex(device => device.id === deviceId);
        const target = index + Number(move.dataset.move);
        candidate.devices.splice(target, 0, candidate.devices.splice(index, 1)[0]);
      });
      return;
    }
    selectInventoryItem(item.dataset.id);
  });
}

$('#project-title').addEventListener('change', event => change(candidate => { candidate.title = event.target.value; }));

$('#inspector-content').addEventListener('change', event => {
  const deviceId = project.devices.some(item => item.id === selected) ? selected : null;
  const networkId = project.networks.some(item => item.id === selected) ? selected : null;
  if (event.target.dataset.device && deviceId) {
    const key = event.target.dataset.device;
    change(candidate => { candidate.devices.find(item => item.id === deviceId)[key] = event.target.value; });
  } else if (event.target.matches('[data-hardware]') && deviceId) {
    const facts = event.target.value.split('\n').map(value => value.trim()).filter(Boolean);
    if (facts.length > LIMITS.hardware || facts.some(value => value.length > LIMITS.text)) {
      render();
      return toast(`Use at most ${LIMITS.hardware} hardware lines, each no longer than ${LIMITS.text} characters.`);
    }
    change(candidate => { candidate.devices.find(item => item.id === deviceId).hardware = facts; });
  } else if (event.target.dataset.network && networkId) {
    const key = event.target.dataset.network;
    change(candidate => { candidate.networks.find(item => item.id === networkId)[key] = event.target.value; });
  } else if (event.target.dataset.project) {
    const key = event.target.dataset.project;
    const value = key === 'columns' ? Number(event.target.value) : event.target.value;
    change(candidate => { candidate[key] = value; });
  } else if (event.target.matches('[data-group-name]') && deviceId) {
    const groupId = event.target.closest('[data-group]').dataset.group;
    change(candidate => { candidate.devices.find(item => item.id === deviceId).groups.find(group => group.id === groupId).name = event.target.value; });
  } else if (event.target.matches('[data-service-name], [data-service-count]') && deviceId) {
    const groupId = event.target.closest('[data-group]').dataset.group;
    const serviceId = event.target.closest('[data-service]').dataset.service;
    const count = Number(event.target.value);
    if (event.target.matches('[data-service-count]') && (!Number.isInteger(count) || count < 1 || count > 99)) {
      render();
      return toast('Instance count must be a whole number from 1 to 99.');
    }
    change(candidate => {
      const service = candidate.devices.find(item => item.id === deviceId).groups.find(group => group.id === groupId).services.find(item => item.id === serviceId);
      if (event.target.matches('[data-service-count]')) service.count = count; else service.name = event.target.value;
    });
  } else if (event.target.matches('[data-vlan-name], [data-vlan-color]')) {
    const vlanId = event.target.closest('[data-vlan]').dataset.vlan;
    const key = event.target.matches('[data-vlan-name]') ? 'name' : 'color';
    change(candidate => { candidate.vlans.find(vlan => vlan.id === vlanId)[key] = event.target.value; });
  }
});

$('#inspector-content').addEventListener('click', event => {
  const deviceId = project.devices.some(item => item.id === selected) ? selected : null;
  const networkId = project.networks.some(item => item.id === selected) ? selected : null;
  if (event.target.matches('[data-delete]') && deviceId) {
    const name = project.devices.find(device => device.id === deviceId).name;
    if (confirm(`Delete ${name} and its connections?`)) change(candidate => removeDevice(candidate, deviceId), { select: null });
  } else if (event.target.matches('[data-delete-network]') && networkId) {
    const name = project.networks.find(network => network.id === networkId).name;
    if (confirm(`Delete ${name} and its connections?`)) change(candidate => removeNetwork(candidate, networkId), { select: null });
  } else if (event.target.matches('[data-duplicate]') && deviceId) {
    const source = project.devices.find(device => device.id === deviceId);
    const sourceServices = source.groups.reduce((sum, group) => sum + group.services.length, 0);
    if (project.devices.length >= LIMITS.devices) return toast('Device limit reached.');
    if (countGroups() + source.groups.length > LIMITS.groups) return toast('Group limit reached.');
    if (countServices() + sourceServices > LIMITS.services) return toast('Service limit reached.');
    change(candidate => {
      const original = candidate.devices.find(device => device.id === deviceId);
      const copy = structuredClone(original);
      copy.id = uid('dev');
      copy.name = `${copy.name.slice(0, LIMITS.text - 5)} copy`;
      for (const group of copy.groups) {
        group.id = uid('grp');
        for (const service of group.services) service.id = uid('svc');
      }
      candidate.devices.splice(candidate.devices.findIndex(device => device.id === deviceId) + 1, 0, copy);
    });
  } else if (event.target.matches('[data-add-group]') && deviceId) {
    if (countGroups() >= LIMITS.groups) return toast('Group limit reached.');
    change(candidate => { candidate.devices.find(device => device.id === deviceId).groups.push({ id: uid('grp'), name: 'Services', services: [] }); });
  } else if (event.target.matches('[data-add-vlan]')) {
    if (project.vlans.length >= LIMITS.networks) return toast('VLAN limit reached.');
    change(candidate => { candidate.vlans.push({ id: uid('vlan'), name: 'New VLAN', color: '#34d399' }); });
  } else if (event.target.matches('[data-remove-vlan]')) {
    const vlanId = event.target.closest('[data-vlan]').dataset.vlan;
    change(candidate => { candidate.vlans = candidate.vlans.filter(vlan => vlan.id !== vlanId); });
  } else {
    const groupElement = event.target.closest('[data-group]');
    if (!groupElement || !deviceId) return;
    const groupId = groupElement.dataset.group;
    if (event.target.matches('[data-remove-group]')) {
      change(candidate => { const device = candidate.devices.find(item => item.id === deviceId); device.groups = device.groups.filter(group => group.id !== groupId); });
    } else if (event.target.matches('[data-add-services]')) {
      openLogoDialog(groupId);
    } else {
      const row = event.target.closest('[data-service]');
      if (!row) return;
      const serviceId = row.dataset.service;
      const action = ['data-remove-service', 'data-service-up', 'data-service-down'].find(attribute => event.target.hasAttribute(attribute));
      if (!action) return;
      change(candidate => {
        const services = candidate.devices.find(item => item.id === deviceId).groups.find(group => group.id === groupId).services;
        const index = services.findIndex(service => service.id === serviceId);
        if (event.target.matches('[data-remove-service]')) services.splice(index, 1);
        else if (event.target.matches('[data-service-up]') && index > 0) services.splice(index - 1, 0, services.splice(index, 1)[0]);
        else if (event.target.matches('[data-service-down]') && index < services.length - 1) services.splice(index + 1, 0, services.splice(index, 1)[0]);
      });
    }
  }
});

function buildTemplates() {
  $('#template-grid').replaceChildren(...templates.map(template => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template';
    button.dataset.template = template.id;
    button.innerHTML = `<img alt="" src="${logoDataUri(template.icon)}"><span><strong>${escapeHtml(template.name)}</strong><small class="muted">${template.network ? 'Network node' : 'Device'}</small></span>`;
    return button;
  }));
}

$('#add-device').addEventListener('click', () => $('#device-dialog').showModal());
$('#template-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-template]');
  if (!button) return;
  const template = templates.find(item => item.id === button.dataset.template);
  if (template.network) {
    if (project.networks.length >= LIMITS.networks) return toast('Network node limit reached.');
    const id = uid('net');
    if (change(candidate => { candidate.networks.push({ id, name: template.name, kind: template.name, accent: template.accent }); }, { select: id })) inspectorOpen = true;
  } else {
    if (project.devices.length >= LIMITS.devices || countGroups() >= LIMITS.groups) return toast('Device or group limit reached.');
    if (countServices() + template.services.length > LIMITS.services) return toast('Service limit reached.');
    const id = uid('dev');
    change(candidate => {
      candidate.devices.push({
        id, name: template.name, role: template.name, icon: template.icon, accent: template.accent, network: 'Main', hardware: [],
        groups: [{ id: uid('grp'), name: 'Services', services: template.services.map(([logo, name]) => ({ id: uid('svc'), logo, name, count: 1 })) }],
      });
    }, { select: id });
    inspectorOpen = true;
  }
  $('#device-dialog').close();
  render();
});

function openLogoDialog(groupId) {
  targetGroup = groupId;
  logoSelection = new Set();
  $('#logo-search').value = '';
  renderLogos();
  $('#logo-dialog').showModal();
  $('#logo-search').focus();
}

function renderLogos() {
  const query = $('#logo-search').value.trim().toLowerCase();
  const matches = LOGOS.filter(logo => !['server', 'router', 'switch', 'wifi', 'internet'].includes(logo.id) && `${logo.label} ${logo.category}`.toLowerCase().includes(query));
  const grid = $('#logo-grid');
  if (!matches.length) {
    grid.innerHTML = '<p class="no-results">No matching local logos. Add a custom service instead.</p>';
  } else {
    grid.innerHTML = matches.map(logo => `<label class="logo-option"><input type="checkbox" value="${logo.id}" ${logoSelection.has(logo.id) ? 'checked' : ''}><img alt="" src="${logoDataUri(logo.id)}"><span>${escapeHtml(logo.label)}<small class="muted">${escapeHtml(logo.category)}</small></span></label>`).join('');
  }
  $('#selection-count').textContent = `${logoSelection.size} selected`;
}

$('#logo-search').addEventListener('input', renderLogos);
$('#logo-grid').addEventListener('change', event => {
  if (!event.target.matches('input[type=checkbox]')) return;
  logoSelection = updateSelection(logoSelection, event.target.value, event.target.checked);
  $('#selection-count').textContent = `${logoSelection.size} selected`;
});
$('#add-selected').addEventListener('click', event => {
  event.preventDefault();
  const deviceId = selected;
  const ids = [...logoSelection];
  if (!ids.length) return toast('Select at least one service.');
  if (countServices() + ids.length > LIMITS.services) return toast('Service limit reached.');
  if (change(candidate => {
    const group = candidate.devices.find(device => device.id === deviceId).groups.find(item => item.id === targetGroup);
    group.services.push(...ids.map(id => ({ id: uid('svc'), logo: id, name: logoById(id).label, count: 1 })));
  })) $('#logo-dialog').close();
});
$('#add-custom').addEventListener('click', () => {
  const name = prompt('Custom service name:')?.trim();
  if (!name) return;
  if (name.length > LIMITS.text) return toast(`Service names must be ${LIMITS.text} characters or fewer.`);
  if (countServices() >= LIMITS.services) return toast('Service limit reached.');
  const deviceId = selected;
  if (change(candidate => {
    candidate.devices.find(device => device.id === deviceId).groups.find(group => group.id === targetGroup).services.push({ id: uid('svc'), logo: 'generic', name, count: 1 });
  })) $('#logo-dialog').close();
});

$('#add-network').addEventListener('click', () => {
  if (project.networks.length >= LIMITS.networks) return toast('Network node limit reached.');
  $('#network-form').reset();
  $('#network-form').elements.accent.value = '#34d399';
  $('#network-dialog').showModal();
});
document.querySelectorAll('#network-dialog [data-close]').forEach(button => button.addEventListener('click', () => $('#network-dialog').close()));
$('#network-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(event.target);
  const id = uid('net');
  if (change(candidate => { candidate.networks.push({ id, name: form.get('name'), kind: form.get('kind'), accent: form.get('accent') }); }, { select: id })) {
    inspectorOpen = true;
    $('#network-dialog').close();
  }
});

function renderConnections() {
  const endpoints = [...project.networks, ...project.devices];
  const options = endpoints.map(endpoint => `<option value="${endpoint.id}">${escapeHtml(endpoint.name)}</option>`).join('');
  $('#connection-from').innerHTML = options;
  $('#connection-to').innerHTML = options;
  $('#connection-list').innerHTML = project.connections.map(connection => `<div class="connection-row" data-connection="${connection.id}"><span>${escapeHtml(endpoints.find(item => item.id === connection.from)?.name)} → ${escapeHtml(endpoints.find(item => item.id === connection.to)?.name)}</span><input maxlength="120" value="${escapeHtml(connection.label)}" aria-label="Connection label"><button type="button" class="danger">Delete</button></div>`).join('');
}

$('#edit-connections').addEventListener('click', () => { renderConnections(); $('#connections-dialog').showModal(); });
$('#connection-add').addEventListener('click', () => {
  const from = $('#connection-from').value;
  const to = $('#connection-to').value;
  const label = $('#connection-label').value;
  if (project.connections.length >= LIMITS.connections) return toast('Connection limit reached.');
  if (!from || !to || from === to) return toast('Choose two different endpoints.');
  if (change(candidate => { candidate.connections.push({ id: uid('conn'), from, to, label }); })) renderConnections();
});
$('#connection-list').addEventListener('click', event => {
  const row = event.target.closest('[data-connection]');
  if (row && event.target.matches('button') && change(candidate => { candidate.connections = candidate.connections.filter(connection => connection.id !== row.dataset.connection); })) renderConnections();
});
$('#connection-list').addEventListener('change', event => {
  const row = event.target.closest('[data-connection]');
  if (row) change(candidate => { candidate.connections.find(connection => connection.id === row.dataset.connection).label = event.target.value; });
});

$('#sample').addEventListener('click', () => { if (confirm('Replace this project with the example? You can undo afterward.')) replaceProject(sampleProject()); });
$('#empty').addEventListener('click', () => { if (confirm('Start empty? You can undo afterward.')) replaceProject(emptyProject()); });

function undo() {
  if (!history.length) return;
  future.push(structuredClone(project));
  const next = history.pop();
  next.revision = project.revision + 1;
  project = next;
  selected = null;
  render();
  scheduleSave();
}

function redo() {
  if (!future.length) return;
  history.push(structuredClone(project));
  const next = future.pop();
  next.revision = project.revision + 1;
  project = next;
  selected = null;
  render();
  scheduleSave();
}

$('#undo').addEventListener('click', undo);
$('#redo').addEventListener('click', redo);
addEventListener('keydown', event => {
  const editing = event.target.matches('input, textarea, [contenteditable=true]');
  if (!editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
  }
});

$('#import').addEventListener('click', () => $('#file-input').click());
$('#file-input').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > LIMITS.bytes) throw new Error('File is larger than 1 MB.');
    replaceProject(parseProject(await file.text()));
    toast('Project imported.');
  } catch (error) {
    toast(`Import failed: ${error.message}`);
  } finally {
    event.target.value = '';
  }
});

const filename = extension => `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'homelab-atlas'}${extension}`;
function download(blob, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

$('#save-json').addEventListener('click', () => download(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), filename('.json')));
$('#export-svg').addEventListener('click', () => {
  try {
    download(new Blob([renderProject(project)], { type: 'image/svg+xml' }), filename('.svg'));
    toast('SVG exported.');
  } catch (error) { toast(`Export failed: ${error.message}`); }
});
$('#export-png').addEventListener('click', () => {
  try {
    toast('Rendering PNG…', true);
    const svg = renderProject(project);
    const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const dimensions = pngDimensions(Number(match[1]), Number(match[2]));
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable.');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          try {
            if (!blob) return toast('PNG encoder failed.');
            download(blob, filename('.png'));
            toast(dimensions.reduced ? `PNG exported at ${dimensions.width}×${dimensions.height} to stay within browser limits. Use SVG for unlimited scaling.` : `PNG exported at ${dimensions.width}×${dimensions.height}.`);
          } catch (error) { toast(`PNG export failed: ${error.message}`); }
        }, 'image/png');
      } catch (error) { toast(`PNG export failed: ${error.message}`); }
    };
    image.onerror = () => toast('PNG rendering failed. Use SVG for this diagram.');
    image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  } catch (error) { toast(`Export failed: ${error.message}`); }
});

function setZoom(next) {
  fitMode = false;
  zoom = Math.min(1.8, Math.max(0.15, next));
  applyZoom();
}

$('#zoom-in').addEventListener('click', () => setZoom(zoom + 0.1));
$('#zoom-out').addEventListener('click', () => setZoom(zoom - 0.1));
$('#zoom-fit').addEventListener('click', () => { fitMode = true; fitPreview(); });
new ResizeObserver(() => { if (fitMode) fitPreview(); }).observe($('#canvas'));

function selectDiagramTarget(target) {
  const item = target.closest('[data-device], [data-network]');
  if (item) selectInventoryItem(item.dataset.device || item.dataset.network);
}

$('#preview').addEventListener('click', event => selectDiagramTarget(event.target));
$('#preview').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    const item = event.target.closest('[data-device], [data-network]');
    if (item) { event.preventDefault(); selectDiagramTarget(item); }
  }
});
$('#settings').addEventListener('click', () => { selected = null; inspectorOpen = true; render(); });
$('#inspector-close').addEventListener('click', () => { inspectorOpen = false; render(); });

addEventListener('storage', event => {
  if (event.key === STORAGE_KEY && hasStorageConflict(event.newValue, lastStored, TAB_ID)) showConflict(event.newValue);
});
$('#conflict-keep').addEventListener('click', () => saveProject(true));
$('#conflict-load').addEventListener('click', () => {
  try {
    const next = parseProject(JSON.parse(conflictRaw).data);
    history.push(structuredClone(project));
    future = [];
    project = next;
    lastStored = conflictRaw;
    hideConflict();
    setSaveStatus('Saved locally');
    render();
  } catch (error) { toast(`Could not load saved version: ${error.message}`); }
});
$('#conflict-download').addEventListener('click', () => download(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), filename('.json')));

buildTemplates();
loadProject();
