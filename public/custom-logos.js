export const CUSTOM_LOGO_LIMITS = {
  count: 32,
  uploadBytes: 2_000_000,
  sourceSide: 4096,
  sourcePixels: 16_000_000,
  storedSide: 512,
  dataUrlChars: 200_000,
  totalDataUrlChars: 1_200_000,
};

const ID_RE = /^custom-[a-zA-Z0-9][a-zA-Z0-9_-]{0,56}$/;
const DATA_RE = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const fail = message => { throw new Error(message); };

function decodedLength(base64) {
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
}

export function pngInfo(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length > CUSTOM_LOGO_LIMITS.dataUrlChars) fail('Custom logo PNG is too large.');
  const match = DATA_RE.exec(dataUrl);
  if (!match || match[1].length % 4) fail('Custom logo must be a canonical PNG data URL.');
  const base64 = match[1];
  const length = decodedLength(base64);
  if (length < 45 || length > 150_000) fail('Custom logo PNG has invalid data.');
  let binary;
  try { binary = atob(base64); } catch { fail('Custom logo PNG has invalid base64 data.'); }
  if (binary.length !== length || btoa(binary) !== base64) fail('Custom logo PNG is not canonically encoded.');
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value)) fail('Custom logo has an invalid PNG signature.');
  const view = new DataView(bytes.buffer);
  let offset = 8;
  let width;
  let height;
  let hasImageData = false;
  let ended = false;
  while (offset + 12 <= bytes.length) {
    const size = view.getUint32(offset);
    const end = offset + 12 + size;
    if (end > bytes.length) fail('Custom logo PNG is truncated.');
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (offset === 8 && (type !== 'IHDR' || size !== 13)) fail('Custom logo PNG has an invalid header.');
    if (type === 'IHDR') {
      if (width !== undefined) fail('Custom logo PNG has duplicate headers.');
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      if (!width || !height || width > CUSTOM_LOGO_LIMITS.storedSide || height > CUSTOM_LOGO_LIMITS.storedSide) fail('Custom logo PNG dimensions exceed 512px.');
    }
    if (type === 'IDAT') hasImageData = true;
    offset = end;
    if (type === 'IEND') {
      if (size || offset !== bytes.length) fail('Custom logo PNG has an invalid terminator.');
      ended = true;
      break;
    }
  }
  if (!ended || width === undefined || !hasImageData) fail('Custom logo PNG is incomplete.');
  return { width, height, bytes: length };
}

export function validateCustomLogo(logo) {
  if (!logo || typeof logo !== 'object' || Array.isArray(logo) || Object.keys(logo).sort().join(',') !== 'background,dataUrl,id,label') fail('Custom logo has an invalid structure.');
  if (typeof logo.id !== 'string' || !ID_RE.test(logo.id) || logo.id.length > 64) fail('Custom logo has an invalid ID.');
  if (typeof logo.label !== 'string' || !logo.label.trim() || logo.label !== logo.label.trim() || logo.label.length > 120) fail('Custom logo name must be trimmed text under 121 characters.');
  if (!['none', 'light', 'dark'].includes(logo.background)) fail('Custom logo background is invalid.');
  pngInfo(logo.dataUrl);
  return true;
}

export function validateCustomLogos(logos, usedIds = new Set()) {
  if (!Array.isArray(logos) || logos.length > CUSTOM_LOGO_LIMITS.count) fail('Project contains too many custom logos.');
  if (logos.reduce((total, logo) => total + (typeof logo?.dataUrl === 'string' ? logo.dataUrl.length : 0), 0) > CUSTOM_LOGO_LIMITS.totalDataUrlChars) fail('Custom logo data exceeds the project limit.');
  const ids = new Set(usedIds);
  for (const logo of logos) {
    if (typeof logo?.id === 'string' && ids.has(logo.id)) fail(`Custom logo ID collides with another ID: ${logo.id}.`);
    ids.add(logo.id);
  }
  logos.forEach(validateCustomLogo);
  return ids;
}

export async function verifyCustomLogoDecodes(logos) {
  await Promise.all(logos.map(logo => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth && image.naturalHeight ? resolve() : reject(new Error(`Custom logo cannot be decoded: ${logo.label}.`));
    image.onerror = () => reject(new Error(`Custom logo cannot be decoded: ${logo.label}.`));
    image.src = logo.dataUrl;
  })));
}

export const svgTextHasUnsafeContent = text => /<!DOCTYPE|<!ENTITY|<script\b|\son[a-z]+\s*=|<foreignObject\b|<(?:animate|animateMotion|animateTransform|set)\b|<\?xml-stylesheet|@import|url\(\s*['"]?(?!#)/i.test(text);

function svgIsSafe(text) {
  if (svgTextHasUnsafeContent(text)) return false;
  const document = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') return false;
  for (const element of document.querySelectorAll('*')) {
    for (const attribute of element.attributes) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on') || ((name === 'href' || name.endsWith(':href')) && value && !value.startsWith('#')) || /url\(\s*['"]?(?!#)/i.test(value)) return false;
    }
  }
  return true;
}

const readFile = (file, method) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Could not read that logo file.'));
  reader[method](file);
});

const decodeImage = source => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('This image cannot be decoded by the browser.'));
  image.src = source;
});

export async function normalizeLogoUpload(file, { id, label, background }) {
  if (!(file instanceof File) || !file.size) fail('Choose a logo file.');
  if (file.size > CUSTOM_LOGO_LIMITS.uploadBytes) fail('Logo files must be 2 MB or smaller.');
  const extensionMime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' }[file.name.split('.').pop().toLowerCase()];
  const mime = file.type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : file.type.toLowerCase() || extensionMime;
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(mime)) fail('Choose a PNG, JPG, WebP, or SVG file.');
  let source;
  if (mime === 'image/svg+xml') {
    const text = await readFile(file, 'readAsText');
    if (!svgIsSafe(text)) fail('This SVG contains unsupported or unsafe content.');
    source = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
  } else {
    source = await readFile(file, 'readAsDataURL');
  }
  const image = await decodeImage(source);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  if (!sourceWidth || !sourceHeight || sourceWidth > CUSTOM_LOGO_LIMITS.sourceSide || sourceHeight > CUSTOM_LOGO_LIMITS.sourceSide || sourceWidth * sourceHeight > CUSTOM_LOGO_LIMITS.sourcePixels) fail('Logo dimensions exceed 4096px or 16 million pixels.');
  const scale = Math.min(1, CUSTOM_LOGO_LIMITS.storedSide / Math.max(sourceWidth, sourceHeight));
  let width = Math.max(1, Math.round(sourceWidth * scale));
  let height = Math.max(1, Math.round(sourceHeight * scale));
  let dataUrl;
  do {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    dataUrl = canvas.toDataURL('image/png');
    if (dataUrl.length <= CUSTOM_LOGO_LIMITS.dataUrlChars) break;
    width = Math.floor(width * .8);
    height = Math.floor(height * .8);
  } while (width >= 16 && height >= 16);
  if (dataUrl.length > CUSTOM_LOGO_LIMITS.dataUrlChars) fail('This logo cannot be stored under the project size limit.');
  const logo = { id, label: label.trim(), dataUrl, background };
  validateCustomLogo(logo);
  return logo;
}
