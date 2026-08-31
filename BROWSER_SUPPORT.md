# Tabora Browser Support

Tabora uses the Manifest V3 WebExtensions platform.

## Supported Builds

| Browser | Build | Notes |
|---|---|---|
| Google Chrome | `manifest.json` | Load unpacked during development or publish to the Chrome Web Store. |
| Microsoft Edge | `manifest.json` | Uses the same Chromium package; publish separately to Microsoft Edge Add-ons. |
| Brave | `manifest.json` | Uses the same Chromium package. Load unpacked from `brave://extensions`. |
| Opera and Vivaldi | `manifest.json` | Uses the same Chromium package. |
| Firefox | `manifest.json` | The manifest includes Firefox MV3 signing metadata, uses Firefox's Promise-based WebExtension APIs when available, and falls back to Firefox's MV3 background-script environment. Test through `about:debugging#/runtime/this-firefox`; submit the same package to AMO for a signed install. |
| Safari | Converted package | Safari requires macOS and Xcode. Convert the project with `xcrun safari-web-extension-converter`, then build and sign the generated Safari app extension. |

## Development Checks

1. Load the same project folder as an unpacked extension in Chrome, Edge, Brave, or another Chromium browser.
2. In Firefox, use **Load Temporary Add-on** and select `manifest.json` from `about:debugging#/runtime/this-firefox`.
3. Confirm the new-tab override, toolbar popup, Quick Save shortcut, saving a current window, and optional site access all work before store submission.

## Notes

- Tabora has no account or sync backend. Each browser profile keeps a separate local workspace.
- Use `.tabora` export/import to move pages and boards between browser profiles.
- The optional `bookmarks` and website-access permissions remain optional in every supported WebExtensions build.
