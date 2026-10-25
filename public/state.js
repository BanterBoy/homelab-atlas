import { validateProject } from './model.js';

export function applyProjectChange(project, mutate) {
  const candidate = structuredClone(project);
  mutate(candidate);
  candidate.revision = project.revision + 1;
  validateProject(candidate);
  return candidate;
}

export function hasStorageConflict(existing, lastStored, tabId) {
  if (!existing || existing === lastStored) return false;
  try { return JSON.parse(existing).tab !== tabId; } catch { return true; }
}

export function updateSelection(selection, id, checked) {
  const next = new Set(selection);
  if (checked) next.add(id); else next.delete(id);
  return next;
}

export function filterInventory(items, query, keys) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(item => keys.some(key => String(item[key] || '').toLowerCase().includes(needle)));
}

export function pngDimensions(width, height, desiredScale = 3, maxSide = 16_384, maxPixels = 36_000_000) {
  if (![width, height, desiredScale].every(Number.isFinite) || width <= 0 || height <= 0 || desiredScale <= 0) throw new Error('Invalid export dimensions.');
  const scale = Math.min(desiredScale, maxSide / width, maxSide / height, Math.sqrt(maxPixels / (width * height)));
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    scale,
    reduced: scale < desiredScale,
  };
}
