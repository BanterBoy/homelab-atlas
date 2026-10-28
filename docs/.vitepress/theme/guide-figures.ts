type Rect = { x: number; y: number; width: number; height: number }
type Mark = {
  rect: Rect
  circle: [number, number]
  target: [number, number]
  caption: string
  accent?: boolean
}

type GuideFigure = {
  title: string
  description: string
  image: string
  imageWidth?: number
  imageHeight?: number
  crop: Rect
  circleRadius: number
  gutter: number
  arrowSize: number
  numberFontSize: number
  marks: Mark[]
}

const editorStyle = { circleRadius: 44, gutter: 50, arrowSize: 24, numberFontSize: 46 }
const dialogStyle = { circleRadius: 18, gutter: 42, arrowSize: 12, numberFontSize: 22 }

export const guideFigures = {
  editor: {
    title: 'Editor overview',
    description: 'The Atlas editor with its inventory, inspector, Arrange control, and save and export actions highlighted.',
    image: 'editor.jpg',
    crop: { x: 0, y: 0, width: 2355, height: 1583 },
    ...editorStyle,
    marks: [
      { rect: { x: 12, y: 70, width: 216, height: 638 }, circle: [305, 245], target: [228, 245], caption: 'Select a device or add one from the inventory.' },
      { rect: { x: 2046, y: 139, width: 284, height: 800 }, circle: [1975, 430], target: [2046, 430], caption: 'Edit identity, hardware facts, groups, and services in the inspector.' },
      { rect: { x: 1066, y: 1526, width: 82, height: 40 }, circle: [1108, 1469], target: [1108, 1526], caption: 'Choose Arrange, then drag a card or resize its lower-right corner. Position fields allow exact placement.' },
      { rect: { x: 2168, y: 7, width: 177, height: 40 }, circle: [2135, 95], target: [2210, 47], caption: 'Save JSON for later editing. Export PNG or SVG for sharing.' },
    ],
  },
  'service-logos': {
    title: 'Add service logos',
    description: 'The service logo picker with search, logo tiles, upload, and Add selected controls highlighted.',
    image: 'service-logos.jpg',
    crop: { x: 837.5, y: 555.4375, width: 680, height: 472.109375 },
    ...dialogStyle,
    marks: [
      { rect: { x: 856.5, y: 655.421875, width: 399.609375, height: 32.796875 }, circle: [824, 672], target: [856.5, 672], caption: 'Search the bundled and uploaded logo catalog.' },
      { rect: { x: 856.5, y: 724.546875, width: 642, height: 236 }, circle: [824, 792], target: [856.5, 792], caption: 'Choose one or more tiles. Two are selected manually here, and selections persist across searches.' },
      { rect: { x: 1398.59375, y: 656.21875, width: 99.90625, height: 32 }, circle: [1531, 672], target: [1498.5, 672], caption: 'Upload PNG, JPG, WebP, or SVG up to 2 MB. Atlas stores it as PNG at up to 512px.' },
      { rect: { x: 1391.71875, y: 976.546875, width: 106.78125, height: 32 }, circle: [1531, 992], target: [1498.5, 992], caption: 'Add the selected services. Cancel leaves the project unchanged.' },
    ],
  },
  'discovery-choose': {
    title: 'Choose a discovery method',
    description: 'The first discovery step with readiness checks and Docker, network, and import method cards highlighted.',
    image: 'discovery-choose.jpg',
    imageWidth: 1874,
    imageHeight: 1583,
    crop: { x: 477, y: 576.515625, width: 920, height: 429.96875 },
    ...dialogStyle,
    marks: [
      { rect: { x: 498, y: 654.703125, width: 878, height: 37 }, circle: [456, 673], target: [498, 673], caption: 'Choose, Find, and Review keep setup and results separate. Opening discovery only checks readiness.' },
      { rect: { x: 498, y: 782.484375, width: 878, height: 142 }, circle: [1418, 853], target: [1376, 853], caption: 'Readiness appears on each method. Choose Docker apps, Network devices, or a saved scan to continue.' },
    ],
  },
  'network-scan': {
    title: 'Set up a live network scan',
    description: 'The network Find step with target, optional advanced settings, and Find devices highlighted.',
    image: 'network-scan.jpg',
    imageWidth: 1874,
    imageHeight: 1583,
    crop: { x: 477, y: 498.15625, width: 920, height: 586.6875 },
    ...dialogStyle,
    marks: [
      { rect: { x: 515, y: 751.328125, width: 844, height: 32.796875 }, circle: [456, 768], target: [515, 768], caption: 'Start with one device IP from the router, or enter an allowed network range.' },
      { rect: { x: 515, y: 865.25, width: 844, height: 38.59375 }, circle: [1418, 885], target: [1359, 885], caption: 'The Homelab app ports preset is ready by default. Open Advanced settings for other ports, service identification, or the network name.' },
      { rect: { x: 515, y: 913.84375, width: 844, height: 32 }, circle: [456, 930], target: [515, 930], caption: 'Find devices starts the bounded scan. Results remain unchanged until Review.' },
    ],
  },
  'discovery-review': {
    title: 'Review network findings',
    description: 'A multi-device network review with navigation, destination, findings, and Add to diagram boundary highlighted.',
    image: 'discovery-review.jpg',
    imageWidth: 1874,
    imageHeight: 1583,
    crop: { x: 477, y: 257.25, width: 920, height: 1068.484375 },
    ...dialogStyle,
    marks: [
      { rect: { x: 498, y: 479.421875, width: 878, height: 76.59375 }, circle: [456, 518], target: [498, 518], caption: 'Move between discovered devices. Pending choices stay with each device while this scan remains open.' },
      { rect: { x: 511, y: 655.40625, width: 421, height: 33 }, circle: [1418, 672], target: [932, 672], caption: 'Review the suggested destination. It is never an automatic merge.' },
      { rect: { x: 498, y: 799.59375, width: 878, height: 402.140625 }, circle: [456, 1001], target: [498, 1001], caption: 'Everything starts unchecked. Only nginx is manually selected here; bulk controls affect the visible filtered page.' },
      { rect: { x: 496, y: 1221.734375, width: 882, height: 85 }, circle: [1418, 1264], target: [1378, 1264], caption: 'Add to diagram affects only the current device and creates one Undo step.', accent: true },
    ],
  },
  'docker-review': {
    title: 'Review Docker findings',
    description: 'A Docker review with destination, unchecked findings, and Add to diagram boundary highlighted.',
    image: 'docker-review.jpg',
    imageWidth: 1874,
    imageHeight: 1583,
    crop: { x: 477, y: 355.5625, width: 920, height: 871.859375 },
    ...dialogStyle,
    marks: [
      { rect: { x: 511, y: 633.328125, width: 421, height: 33 }, circle: [456, 650], target: [511, 650], caption: 'Relay is suggested because it uniquely matches the snapshot source name. You still choose the destination.' },
      { rect: { x: 498, y: 777.515625, width: 878, height: 325.90625 }, circle: [1418, 940], target: [1376, 940], caption: 'No row is checked automatically. Jellyfin is manually checked with Use existing Jellyfin; stopped Paperless remains visible.' },
      { rect: { x: 496, y: 1123.421875, width: 882, height: 85 }, circle: [456, 1166], target: [496, 1166], caption: 'Confirm the summary, then Add to diagram. Existing placement and one-step Undo are preserved.', accent: true },
    ],
  },
  'docker-setup': {
    title: 'Connect a Docker host',
    description: 'The Docker setup panel with token checklist, Compose commands, and readiness retry highlighted.',
    image: 'docker-setup.jpg',
    imageWidth: 1874,
    imageHeight: 1583,
    crop: { x: 477, y: 415.046875, width: 920, height: 752.890625 },
    ...dialogStyle,
    marks: [
      { rect: { x: 515, y: 708.40625, width: 844, height: 148.96875 }, circle: [456, 783], target: [515, 783], caption: 'Generate the value yourself, then save only ATLAS_COLLECTOR_TOKEN in .env beside the Atlas Compose file on the Docker host.' },
      { rect: { x: 515, y: 867.375, width: 844, height: 129.96875 }, circle: [1418, 932], target: [1359, 932], caption: 'Use the command for a source checkout or the released Compose file. Atlas never runs these commands for you.' },
      { rect: { x: 515, y: 1036.9375, width: 103.109375, height: 32 }, circle: [456, 1053], target: [515, 1053], caption: 'Check setup only repeats the readiness check. It does not create tokens or enable the collector.' },
    ],
  },
  'private-export': {
    title: 'Review a private export',
    description: 'The export dialog with privacy toggle, custom terms, preview, and image format options highlighted.',
    image: 'private-export.jpg',
    crop: { x: 727.5, y: 340.875, width: 900, height: 901.234375 },
    ...dialogStyle,
    marks: [
      { rect: { x: 759.5, y: 460.25, width: 313.1875, height: 48.796875 }, circle: [714, 485], target: [759.5, 485], caption: 'Keep Hide network details checked unless the image is meant to include addresses.' },
      { rect: { x: 759.5, y: 578.640625, width: 313.1875, height: 64.78125 }, circle: [714, 611], target: [759.5, 611], caption: 'Add literal private names one per line.' },
      { rect: { x: 1112.6875, y: 459.25, width: 482.8125, height: 666.859375 }, circle: [1641, 780], target: [1595.5, 780], caption: 'Inspect the filtered preview. Hostnames need custom terms, and text baked into logos is not filtered.' },
      { rect: { x: 746.5, y: 1151.109375, width: 862, height: 72 }, circle: [714, 1187], target: [746.5, 1187], caption: 'Download SVG or PNG, and keep editable JSON separately. JSON always keeps the full facts.' },
    ],
  },
} satisfies Record<string, GuideFigure>

export type GuideFigureName = keyof typeof guideFigures
