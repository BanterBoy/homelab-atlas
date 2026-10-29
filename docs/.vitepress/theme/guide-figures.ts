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
    description: 'The first discovery step with readiness checks and Docker, network, and import methods highlighted.',
    image: 'discovery-choose.jpg',
    imageWidth: 1124,
    imageHeight: 720,
    crop: { x: 180, y: 132.375, width: 920, height: 455.2421875 },
    ...dialogStyle,
    marks: [
      { rect: { x: 203, y: 222.125, width: 874, height: 40 }, circle: [156, 242], target: [203, 242], caption: 'Choose, Find, and Review keep setup and results separate. Opening discovery only checks readiness.' },
      { rect: { x: 203, y: 351.6171875, width: 874, height: 144 }, circle: [1124, 423.5], target: [1077, 423.5], caption: 'Choose Docker apps, Network devices, or a saved scan to continue.' },
    ],
  },
  'network-scan': {
    title: 'Set up a live network scan',
    description: 'The network Find step with target, optional advanced settings, and Find devices highlighted.',
    image: 'network-scan.jpg',
    imageWidth: 1124,
    imageHeight: 720,
    crop: { x: 180, y: 52.0859375, width: 920, height: 615.8203125 },
    ...dialogStyle,
    marks: [
      { rect: { x: 218, y: 328.4296875, width: 844, height: 31.9453125 }, circle: [156, 344.5], target: [218, 344.5], caption: 'Enter a permitted target such as the documentation-only address 192.0.2.10.' },
      { rect: { x: 218, y: 434.0625, width: 844, height: 40.84375 }, circle: [1124, 454.5], target: [1062, 454.5], caption: 'Open Advanced settings only when you need different ports, service identification, or a network name.' },
      { rect: { x: 218, y: 486.90625, width: 104.78125, height: 34 }, circle: [156, 504], target: [218, 504], caption: 'Find devices starts the bounded scan. No scan was run for this documentation capture.' },
    ],
  },
  'discovery-review': {
    title: 'Review network findings',
    description: 'A multi-device network review with navigation, destination, and Add to diagram boundary highlighted.',
    image: 'discovery-review.jpg',
    imageWidth: 1124,
    imageHeight: 720,
    crop: { x: 180, y: 16, width: 920, height: 688 },
    ...dialogStyle,
    marks: [
      { rect: { x: 203, y: 277.2421875, width: 874, height: 72.890625 }, circle: [156, 313.5], target: [203, 313.5], caption: 'Move between discovered devices. Pending choices stay with each device while this review remains open.' },
      { rect: { x: 215, y: 459.4375, width: 420, height: 31.4765625 }, circle: [1124, 475], target: [635, 475], caption: 'Review the destination. It is never an automatic merge.' },
      { rect: { x: 201, y: 591.15625, width: 878, height: 91.84375 }, circle: [1124, 637], target: [1079, 637], caption: 'All findings are unchecked, so Add to diagram is disabled. Scroll down to choose services first.', accent: true },
    ],
  },
  'docker-review': {
    title: 'Review Docker findings',
    description: 'A Docker review with destination, a manually selected finding, and the Add to diagram boundary highlighted.',
    image: 'docker-review.jpg',
    imageWidth: 1124,
    imageHeight: 720,
    crop: { x: 180, y: 16, width: 920, height: 688 },
    ...dialogStyle,
    marks: [
      { rect: { x: 215, y: 157.6328125, width: 420, height: 31 }, circle: [156, 173], target: [215, 173], caption: 'Relay is the reviewed destination. You still control where findings go.' },
      { rect: { x: 203, y: 316.3671875, width: 874, height: 104.78125 }, circle: [1124, 369], target: [1077, 369], caption: 'Homepage is manually selected here. Findings start unchecked, and more rows require scrolling.' },
      { rect: { x: 201, y: 572.3125, width: 878, height: 110.6875 }, circle: [1124, 627.5], target: [1079, 627.5], caption: 'Confirm the summary, then Add to diagram. Existing placement and one-step Undo are preserved.', accent: true },
    ],
  },
  'docker-setup': {
    title: 'Connect a Docker host',
    description: 'The Docker setup panel with token checklist, command disclosure, and readiness retry highlighted.',
    image: 'docker-setup.jpg',
    imageWidth: 1124,
    imageHeight: 720,
    crop: { x: 180, y: 16, width: 920, height: 688 },
    ...dialogStyle,
    marks: [
      { rect: { x: 233, y: 373.6640625, width: 814, height: 126.71875 }, circle: [156, 437], target: [233, 437], caption: 'Generate the token yourself, save it in .env, then start the collector for your setup.' },
      { rect: { x: 233, y: 513.3828125, width: 814, height: 18.84375 }, circle: [1124, 523], target: [1047, 523], caption: 'Open Commands for each Compose setup to see the source and released commands. Atlas never runs them.' },
      { rect: { x: 233, y: 577.0703125, width: 100.0078125, height: 34 }, circle: [156, 594], target: [233, 594], caption: 'Check setup repeats the readiness check. It does not create tokens or enable the collector.' },
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
