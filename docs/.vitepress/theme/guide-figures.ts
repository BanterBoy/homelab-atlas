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
  'network-scan': {
    title: 'Set up a live network scan',
    description: 'The network discovery form with network name, targets, TCP ports, and Scan network highlighted.',
    image: 'network-scan.jpg',
    crop: { x: 717.5, y: 394.328125, width: 920, height: 794.328125 },
    ...dialogStyle,
    marks: [
      { rect: { x: 751.5, y: 622.5, width: 704.546875, height: 32.796875 }, circle: [704, 639], target: [751.5, 639], caption: 'Give the network a stable name so later results match the same scope.' },
      { rect: { x: 751.5, y: 751.21875, width: 422, height: 32.796875 }, circle: [704, 768], target: [751.5, 768], caption: 'Replace the example with an allowed IPv4 address or CIDR you control.' },
      { rect: { x: 1181.5, y: 751.21875, width: 422, height: 32.796875 }, circle: [1651, 768], target: [1603.5, 768], caption: 'Leave ports blank for the common 100 TCP ports, or enter up to 1,000 TCP ports. Identify services is slower.' },
      { rect: { x: 751.5, y: 816.8125, width: 109.8125, height: 32 }, circle: [704, 833], target: [751.5, 833], caption: 'Start the bounded scan. It only finds candidates; nothing is added until review and Apply.' },
    ],
  },
  'discovery-review': {
    title: 'Review an imported Nmap result',
    description: 'An imported Nmap XML review with host, destination, findings, and Apply boundary highlighted.',
    image: 'discovery-review.jpg',
    crop: { x: 717, y: 680, width: 921, height: 766 },
    ...dialogStyle,
    marks: [
      { rect: { x: 738.5, y: 716.296875, width: 878, height: 33 }, circle: [704, 733], target: [738.5, 733], caption: 'Pick the scanned host to review.' },
      { rect: { x: 748, y: 840, width: 860, height: 43 }, circle: [1651, 862], target: [1608, 862], caption: 'Choose its destination device and service group.' },
      { rect: { x: 738.5, y: 998.078125, width: 878, height: 322.5625 }, circle: [704, 1110], target: [738.5, 1110], caption: 'Check only the host or services you want, then choose Add or Link. Only nginx is manually checked here.' },
      { rect: { x: 736, y: 1350, width: 883, height: 77 }, circle: [1651, 1389], target: [1619, 1389], caption: 'Read the change preview, then Apply. Cancel changes nothing; each Apply is one Undo.', accent: true },
    ],
  },
  'docker-review': {
    title: 'Review Docker findings',
    description: 'A Docker discovery review with destination, findings, and Apply boundary highlighted.',
    image: 'docker-review.jpg',
    crop: { x: 717, y: 770, width: 921, height: 590 },
    ...dialogStyle,
    marks: [
      { rect: { x: 748, y: 840, width: 860, height: 43 }, circle: [704, 862], target: [748, 862], caption: 'Select a destination device and service group.' },
      { rect: { x: 738.5, y: 995.96875, width: 878, height: 240.171875 }, circle: [1651, 1088], target: [1616.5, 1088], caption: 'Review every result. Jellyfin is manually checked and set to Link; a matching name suggests Link but never checks it. The stopped container shows why review matters.' },
      { rect: { x: 736, y: 1266, width: 883, height: 79 }, circle: [704, 1306], target: [736, 1306], caption: 'Inspect the counts and summary, then Apply. Linking preserves the existing label, logo, and order.', accent: true },
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
