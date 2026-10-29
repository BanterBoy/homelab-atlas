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
  imageWidth: number
  imageHeight: number
  crop: Rect
  circleRadius: number
  gutter: number
  arrowSize: number
  numberFontSize: number
  marks: Mark[]
}

const editorStyle = { circleRadius: 17, gutter: 42, arrowSize: 11, numberFontSize: 20 }
const dialogStyle = { circleRadius: 17, gutter: 42, arrowSize: 11, numberFontSize: 20 }

export const guideFigures = {
  editor: {
    title: 'Editor overview',
    description: 'The Atlas workspace with its inventory, inspector tabs, canvas controls, File menu, and Export action highlighted.',
    image: 'editor.jpg',
    imageWidth: 1080,
    imageHeight: 675,
    crop: { x: 0, y: 0, width: 1080, height: 675 },
    ...editorStyle,
    marks: [
      { rect: { x: 0, y: 45, width: 186, height: 630 }, circle: [210, 300], target: [186, 300], caption: 'Select a device or use Add in the inventory.' },
      { rect: { x: 830.25, y: 139.5, width: 237.75, height: 28.5 }, circle: [1104, 154], target: [1068, 154], caption: 'Use Details, Apps, and Layout for the selected device.' },
      { rect: { x: 527.736, y: 50.625, width: 71.525, height: 24 }, circle: [563.5, -20], target: [563.5, 50.625], caption: 'Arrange moves and resizes device cards without changing automatic output rules.' },
      { rect: { x: 110.906, y: 9.375, width: 42.047, height: 25.5 }, circle: [132, -20], target: [132, 9.375], caption: 'Open File to import or save an editable project.' },
      { rect: { x: 1000.629, y: 9.375, width: 67.371, height: 25.5 }, circle: [1034, -20], target: [1034, 9.375], caption: 'Export a reviewed SVG or PNG image.' },
    ],
  },
  'service-logos': {
    title: 'Add service logos',
    description: 'The service logo picker with search, selected tiles, upload, and Add selected controls highlighted.',
    image: 'service-logos.jpg',
    imageWidth: 1124,
    imageHeight: 720,
    crop: { x: 290, y: 58.8203125, width: 700, height: 602.3515625 },
    ...dialogStyle,
    marks: [
      { rect: { x: 311, y: 169.515625, width: 419.3984375, height: 31.9453125 }, circle: [266, 185.5], target: [311, 185.5], caption: 'Search bundled and uploaded logos.' },
      { rect: { x: 311, y: 237.171875, width: 658, height: 336 }, circle: [266, 405], target: [311, 405], caption: 'Jellyfin and Plex are manually selected here. Selections persist across searches.' },
      { rect: { x: 871.9609375, y: 167.4609375, width: 97.0390625, height: 34 }, circle: [1014, 184.5], target: [969, 184.5], caption: 'Upload PNG, JPG, WebP, or SVG up to 2 MB. Atlas stores it as PNG at up to 512px.' },
      { rect: { x: 860.359375, y: 606.171875, width: 108.640625, height: 34 }, circle: [1014, 623], target: [969, 623], caption: 'Add the selected services. Cancel leaves the project unchanged.' },
    ],
  },
  'discovery-choose': {
    title: 'Choose a discovery method',
    description: 'The discovery chooser with its three explicit methods and review boundary highlighted.',
    image: 'discovery-choose.jpg',
    imageWidth: 920,
    imageHeight: 456,
    crop: { x: 0, y: 0, width: 920, height: 456 },
    ...dialogStyle,
    marks: [
      { rect: { x: 23, y: 89.75, width: 874, height: 40 }, circle: [-24, 110], target: [23, 110], caption: 'Choose, Find, and Review separate setup, scanning, and the required unchecked review.' },
      { rect: { x: 23, y: 219.2421875, width: 284.6640625, height: 144 }, circle: [-24, 291], target: [23, 291], caption: 'Docker apps lists containers on a configured server or opens the guided setup.' },
      { rect: { x: 317.6640625, y: 219.2421875, width: 284.6640625, height: 144 }, circle: [460, 480], target: [460, 363.2421875], caption: 'Network devices / Nmap finds reachable devices and open services.' },
      { rect: { x: 612.328125, y: 219.2421875, width: 284.6640625, height: 144 }, circle: [944, 291], target: [897, 291], caption: 'Import saved scan reviews Docker JSON or Nmap XML without running a scan.' },
    ],
  },
  'network-scan': {
    title: 'Set up a live network scan',
    description: 'The ready Nmap flow with device guidance, collapsed optional controls, and explicit scan action highlighted.',
    image: 'network-scan.jpg',
    imageWidth: 920,
    imageHeight: 688,
    crop: { x: 0, y: 0, width: 920, height: 688 },
    ...dialogStyle,
    marks: [
      { rect: { x: 38, y: 245.3984375, width: 844, height: 110.578125 }, circle: [-24, 301], target: [38, 301], caption: 'Enter one device IP from your router. The note confirms the scan runs from the Atlas server, not the browser.' },
      { rect: { x: 38, y: 367.9765625, width: 844, height: 40.84375 }, circle: [944, 388], target: [882, 388], caption: 'Open the CIDR or advanced controls only when needed; both stay collapsed by default.' },
      { rect: { x: 38, y: 506.5078125, width: 104.78125, height: 34 }, circle: [-24, 523.5], target: [38, 523.5], caption: 'Find devices explicitly starts the bounded scan and stays disabled until a target is entered.' },
    ],
  },
  'discovery-review': {
    title: 'Review network findings',
    description: 'A multi-device network review with navigation, destination card, and Add selected boundary highlighted.',
    image: 'discovery-review.jpg',
    imageWidth: 920,
    imageHeight: 688,
    crop: { x: 0, y: 0, width: 920, height: 688 },
    ...dialogStyle,
    marks: [
      { rect: { x: 23, y: 261.2421875, width: 874, height: 72.890625 }, circle: [-24, 298], target: [23, 298], caption: 'Move between discovered devices. Pending choices stay with each device while this review remains open.' },
      { rect: { x: 23, y: 433.3203125, width: 874, height: 129.734375 }, circle: [944, 498], target: [897, 498], caption: 'Choose the destination diagram card; suggestions never merge a result automatically.' },
      { rect: { x: 717.546875, y: 633, width: 181.453125, height: 34 }, circle: [944, 650], target: [899, 650], caption: 'Scroll to the findings and select rows first. Add selected remains disabled while nothing is checked.', accent: true },
    ],
  },
  'docker-review': {
    title: 'Review Docker findings',
    description: 'A Docker review with destination, an unchecked finding, and the Add selected boundary highlighted.',
    image: 'docker-review.jpg',
    imageWidth: 920,
    imageHeight: 688,
    crop: { x: 0, y: 0, width: 920, height: 688 },
    ...dialogStyle,
    marks: [
      { rect: { x: 23, y: 143.984375, width: 874, height: 128.7890625 }, circle: [-24, 208.5], target: [23, 208.5], caption: 'Choose the destination diagram card and service group before selecting findings.' },
      { rect: { x: 23, y: 404.90625, width: 874, height: 104.78125 }, circle: [944, 457.5], target: [897, 457.5], caption: 'Every Docker finding starts unchecked. Select only the apps you want to add or link.' },
      { rect: { x: 717.546875, y: 633, width: 181.453125, height: 34 }, circle: [944, 650], target: [899, 650], caption: 'Add selected is one undoable change. Existing cards stay put, and overlap protection still applies.', accent: true },
    ],
  },
  'docker-setup': {
    title: 'Start the Docker collector',
    description: 'Step 5 of the released-Compose setup with one matching command and wizard navigation highlighted.',
    image: 'docker-setup.jpg',
    imageWidth: 920,
    imageHeight: 575,
    crop: { x: 0, y: 0, width: 920, height: 575 },
    ...dialogStyle,
    marks: [
      { rect: { x: 125, y: 272.3984375, width: 670, height: 37.7890625 }, circle: [-24, 291], target: [125, 291], caption: 'The wizard shows one focused instruction at a time and identifies the current step.' },
      { rect: { x: 125, y: 355.03125, width: 670, height: 34.84375 }, circle: [944, 372.5], target: [795, 372.5], caption: 'Only the released-Compose command is shown for this branch. Atlas never executes it.' },
      { rect: { x: 125, y: 405.875, width: 670, height: 47 }, circle: [-24, 429.5], target: [125, 429.5], caption: 'Back keeps prior choices; Continue advances to the final setup check.' },
    ],
  },
  'private-export': {
    title: 'Review a private export',
    description: 'The export dialog with privacy toggle, custom terms, visible preview, and image formats highlighted.',
    image: 'private-export.jpg',
    imageWidth: 1124,
    imageHeight: 720,
    crop: { x: 190, y: 16, width: 900, height: 688 },
    ...dialogStyle,
    marks: [
      { rect: { x: 225, y: 151.8046875, width: 308.796875, height: 50.8359375 }, circle: [166, 177], target: [225, 177], caption: 'Keep Hide network details checked unless the image should include addresses.' },
      { rect: { x: 225, y: 273.4296875, width: 308.796875, height: 72.53125 }, circle: [166, 309.5], target: [225, 309.5], caption: 'Relay is listed as a literal custom term for this image.' },
      { rect: { x: 577.796875, y: 150.8046875, width: 477.203125, height: 448.1953125 }, circle: [1114, 375], target: [1055, 375], caption: 'Inspect the filtered preview. Text baked into logos is not filtered.' },
      { rect: { x: 211, y: 625, width: 858, height: 58 }, circle: [166, 654], target: [211, 654], caption: 'Download SVG or PNG. Editable project JSON remains separate and keeps the full project.' },
    ],
  },
} satisfies Record<string, GuideFigure>

export type GuideFigureName = keyof typeof guideFigures
