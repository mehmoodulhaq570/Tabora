# Tabora

A Chrome Extension that transforms your new-tab page into a visual workspace for organizing browser tabs and bookmarks.

## Overview

Tabora replaces the default new-tab page with an organized dashboard where you can create pages, arrange links into customizable boards, save browser windows, and maintain a centralized hub for your digital workspace. Everything is stored locally in your browser profile with no cloud synchronization or data collection.

## Features

- **Multiple Pages**: Create separate pages for different areas of your life or projects
- **Customizable Boards**: Arrange links into colorful, customizable boards with 4-column layouts
- **Quick Save**: Save the current tab using Ctrl+Shift+Y keyboard shortcut
- **Window Snapshots**: Save your entire browser window as a collection of links
- **Duplicate Detection**: Automatically detect and prevent saving duplicate links
- **Trash & Recovery**: Restore accidentally deleted items from trash
- **Visual Themes**: Choose between light and dark themes with multiple wallpaper options
- **14+ Wallpapers**: Including Digital Ocean, Crimson Realm, Aurora Station, Moonlit Garden, Eclipse Forge, Abyss Bloom, Neon Monsoon, Mist Valley, Amber Voyager, Alpine Clear, Coral Coast, Glass Horizon, Sakura Drift, and Arctic Prism
- **Undo System**: Undo recent actions to recover from mistakes
- **Export & Import**: Export pages and boards as .tabora files for sharing or backup
- **Private Vaults**: Create private local storage areas for sensitive information
- **Recent Activity**: Track recently opened links for quick access
- **Compact Mode**: Toggle between standard and compact board layouts
- **Bookmark Integration**: Import browser bookmarks with optional permission
- **Link Health Checker**: Verify that saved links are still accessible
- **Incognito Mode**: Supports incognito browsing
- **Privacy Mode**: Hide sensitive boards temporarily
- **Customizable Link Display**: Control title length, descriptions, and metadata display

## Installation

### Development Installation

Tabora is currently available through manual installation. Follow these steps to install:

1. Clone this repository:
   ```bash
   git clone https://github.com/mehmoodulhaq570/tabora.git
   cd tabora
   ```

2. Open Chrome or Chromium-based browser and navigate to the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
   - Opera: `opera://extensions/`

3. Enable "Developer mode" using the toggle in the top right corner

4. Click the "Load unpacked" button

5. Select the project directory where you cloned Tabora

6. The extension will be installed and ready to use. Open a new tab to access your Tabora dashboard.

### Coming Soon

Tabora will be available on:
- Chrome Web Store
- Microsoft Edge Add-ons
- Firefox Add-ons

Check back for official distribution links as they become available.

## Usage

### Opening Tabora

Open a new tab to view your Tabora dashboard. The dashboard displays all your pages, boards, and saved links.

### Saving Links

- Use the toolbar popup to save the current tab or entire window
- Press Ctrl+Shift+Y to save the current tab to your Quick Saves board
- Search for specific boards in the popup before saving

### Managing Workspace

- **Create Page**: Add a new page from the workspace tools
- **Create Board**: Add a board to organize related links
- **Edit Board**: Change color, icon, size, and display name
- **Pin Boards**: Mark important boards as pinned for quick access
- **Delete Items**: Move items to trash; restore or permanently delete later

### Settings

Access workspace settings to:

- Toggle between light and dark themes
- Change wallpaper and appearance
- Configure link opening behavior (same tab or new tab)
- Set quick-save destination
- Manage incognito mode and privacy settings
- Change display language

## Permissions

Tabora requests the following permissions:

| Permission | Purpose |
|-----------|---------|
| `tabs` | Read titles and URLs of tabs you save; create tabs when opening links; optionally close tabs after saving windows |
| `storage` | Store pages, boards, links, settings, trash data, and undo history locally |
| `clipboardWrite` | Copy links, boards, pages, or share packages when you use share or export actions |
| `bookmarks` (optional) | Import your browser bookmarks only when you choose to do so |
| `http://*/*`, `https://*/*` (optional) | Check link status and fetch metadata during user-initiated saves or imports |

## Privacy & Data

- No account required
- No data transmitted to Tabora servers
- No data sold to third parties
- All workspace data stored locally in your browser profile
- Optional link checking contacts only websites you have saved
- Export files remain on your device unless you share them manually

## Development

### Project Structure

```
├── manifest.json           # Extension configuration
├── background.js           # Service worker and command handlers
├── shared.js              # Shared utilities and state management
├── popup.html/js          # Toolbar popup interface
├── dashboard.html/js      # New-tab dashboard interface
├── features.js            # Feature implementations
├── styles.css             # Global styles
├── tests/                 # Test files
├── assets/                # Wallpapers and resources
├── icons/                 # Extension icons
└── artifacts/             # Build artifacts
```

### Key Modules

- **shared.js**: Contains state management, storage operations, and utility functions
- **background.js**: Handles command processing and quick-save functionality
- **popup.js**: Manages the toolbar popup for quick access and saving
- **dashboard.js**: Powers the main dashboard interface

### State Schema (v4)

The application state includes:

```javascript
{
  schemaVersion: 4,
  pages: [],              // Page definitions
  boards: [],             // Board collections
  trash: [],              // Deleted items
  recentlyOpened: [],     // Recently accessed links
  moods: [],              // Mood configurations
  vaults: [],             // Private storage areas
  settings: {}            // User preferences
}
```

## Browser Support

Currently Supported:
- Chrome 90+
- Chromium-based browsers (Edge, Brave, Opera)

Planned Support:
- Firefox (coming soon)
- Microsoft Edge (official add-on)

## File Format

Tabora uses `.tabora` files for export/import. These files contain serialized page, board, and link data for manual sharing or backup purposes.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Changelog

### Version 3.0.2

- Current stable release
- Full Manifest V3 support
- All core features implemented
- Multiple themes and wallpapers
- Privacy-focused local storage

## Roadmap

- Enhanced link metadata preview
- Collaborative workspace sharing
- Advanced filtering and search
- Custom keyboard shortcuts
- Board templates
- Performance optimizations

## Support

For issues, feature requests, or questions, please refer to the project repository.

## Acknowledgments

Tabora was built with privacy and user experience as core principles. Special thanks to all contributors and testers who have helped improve the extension.

---

**Tabora** - Organize Your Digital Workspace Locally
