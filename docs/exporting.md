# Exporting

Choose **Export** to download SVG or PNG. Use **Save project** for editable JSON.

| Format | Best for | Behavior |
|---|---|---|
| JSON | Backup and later editing | Includes inventory, layout, and uploaded logo PNGs |
| SVG | Documentation, scaling, print | Self-contained image with bundled and uploaded logos embedded |
| PNG | Chats, wikis, broad compatibility | Rendered at 3× when possible, within browser limits |

Uploaded PNG, JPG, WebP, and SVG files are stored as PNG data in the project. SVG uploads do not remain vector. Their stored PNGs are at most 512px, so scaling the exported diagram does not recreate vector detail.

SVG and PNG exports work offline and do not contact the original file location. They cannot be imported to restore an editable project. Keep a JSON backup too.
