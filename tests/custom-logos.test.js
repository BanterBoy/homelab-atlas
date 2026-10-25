import test from 'node:test';
import assert from 'node:assert/strict';
import { LOGOS, logoById, logoDataUri, logoPlate } from '../public/catalog.js';
import { CUSTOM_LOGO_LIMITS, pngInfo, svgTextHasUnsafeContent, validateCustomLogo, validateCustomLogos } from '../public/custom-logos.js';
import { parseProject, renderProject, sampleProject, validateProject } from '../public/model.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const custom = (id = 'custom-test', overrides = {}) => ({ id, label: 'Test logo', dataUrl: PNG, background: 'none', ...overrides });

function largePng(size = 149_000) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const chunk = (type, data) => {
    const bytes = new Uint8Array(12 + data.length);
    new DataView(bytes.buffer).setUint32(0, data.length);
    bytes.set([...type].map(character => character.charCodeAt(0)), 4);
    bytes.set(data, 8);
    return bytes;
  };
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, 1);
  new DataView(ihdr.buffer).setUint32(4, 1);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const parts = [Uint8Array.from(signature), chunk('IHDR', ihdr), chunk('IDAT', new Uint8Array(size)), chunk('IEND', new Uint8Array())];
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
}

test('custom logo entries and PNG structure validate strictly', () => {
  assert.deepEqual(pngInfo(PNG), { width: 1, height: 1, bytes: 68 });
  assert.equal(validateCustomLogo(custom()), true);
  for (const logo of [
    custom('bad'), custom('custom-test', { label: ' ' }), custom('custom-test', { label: ' padded ' }),
    custom('custom-test', { background: 'blue' }), custom('custom-test', { dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }),
    { ...custom(), extra: true },
  ]) assert.throws(() => validateCustomLogo(logo));
  assert.throws(() => pngInfo(`${PNG}AAAA`), /canonical|terminator/);
  assert.throws(() => pngInfo(PNG.slice(0, -8)), /base64|truncated|incomplete/);
  assert.throws(() => validateCustomLogo(custom('custom-test', { dataUrl: `data:image/png;base64,${'A'.repeat(200_004)}` })), /large/);
});

test('SVG upload screening rejects active and external content', () => {
  for (const text of [
    '<svg><script>alert(1)</script></svg>', '<svg onload="alert(1)"/>', '<!DOCTYPE svg><svg/>',
    '<svg><foreignObject/></svg>', '<svg><animate attributeName="x"/></svg>',
    '<svg><style>@import "https://example.test/a.css"</style></svg>', '<svg><path style="fill:url(https://example.test/a)"/></svg>',
  ]) assert.equal(svgTextHasUnsafeContent(text), true);
  assert.equal(svgTextHasUnsafeContent('<svg><defs><linearGradient id="a"/></defs><path fill="url(#a)"/></svg>'), false);
});

test('custom logo count, total data, duplicate IDs, and ID collisions are rejected', () => {
  assert.equal(CUSTOM_LOGO_LIMITS.uploadBytes, 2_000_000);
  assert.throws(() => validateCustomLogos(Array.from({ length: 33 }, (_, index) => custom(`custom-${index}`))), /too many/);
  assert.throws(() => validateCustomLogos([custom(), custom()]), /collides/);
  assert.throws(() => validateCustomLogos([custom()], new Set(['custom-test'])), /collides/);
  const dataUrl = largePng();
  assert.ok(dataUrl.length < CUSTOM_LOGO_LIMITS.dataUrlChars);
  assert.throws(() => validateCustomLogos(Array.from({ length: 7 }, (_, index) => custom(`custom-big-${index}`, { dataUrl }))), /project limit/);
});

test('schema 4 enforces custom references and record-ID isolation', () => {
  const project = sampleProject();
  project.customLogos.push(custom());
  project.devices[0].icon = 'custom-test';
  assert.equal(validateProject(project), true);
  assert.deepEqual(parseProject(JSON.stringify(project)), project);
  project.devices[0].icon = 'custom-missing';
  assert.throws(() => validateProject(project), /Unknown logo/);
  project.devices[0].icon = 'custom-test';
  project.devices[0].id = 'custom-test';
  assert.throws(() => validateProject(project), /duplicate ID/);
});

test('custom catalog context never leaks between projects', () => {
  const logos = [custom('custom-isolated', { background: 'light' })];
  assert.equal(logoDataUri('custom-isolated', logos), PNG);
  assert.notEqual(logoDataUri('custom-isolated'), PNG);
  assert.equal(logoById('custom-isolated', logos).label, 'Test logo');
  assert.equal(logoById('custom-isolated').id, 'generic');
  assert.equal(logoPlate('custom-isolated', 'light', logos), '#f8fafc');
  assert.equal(LOGOS.some(logo => logo.id === 'custom-isolated'), false);
});

test('custom PNG and background render in device, network, service tile, and service row output', () => {
  const project = sampleProject();
  const logo = custom('custom-render', { label: '<Logo & name>', background: 'dark' });
  project.customLogos.push(logo);
  project.devices[0].icon = logo.id;
  project.networks[0].icon = logo.id;
  project.networks[0].secondaryIcon = logo.id;
  project.devices[0].groups[0].services[0].logo = logo.id;
  project.devices[0].groups[0].services[0].name = logo.label;
  project.devices[0].groups.push({ id: 'grp-custom-row', name: 'One', services: [{ id: 'svc-custom-row', logo: logo.id, name: 'Row', count: 1 }] });
  const svg = renderProject(project);
  assert.ok(svg.split(PNG).length - 1 >= 5);
  assert.match(svg, /fill="#111827"/);
  assert.match(svg, /&lt;Logo &amp; name&gt;/);
  assert.doesNotMatch(svg, /<Logo & name>/);
});
