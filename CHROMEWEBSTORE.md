# Chrome Web Store Listing - Tabora

> Last Updated: 2026-08-31

## Store Listing

**Extension Name**

Tabora

**Short Description**

Organize browser tabs and bookmarks into visual pages and boards on every new tab.

**Detailed Description**

Tabora replaces the new-tab page with a visual workspace for organizing browser tabs and bookmarks.

Create pages for different areas of your life, arrange links into customizable boards, save the current browser window, find duplicate links, restore deleted items, and switch between original light and dark themes.

Use the toolbar popup to save the current tab or window. Open a new tab to manage pages, boards, links, wallpapers, recent activity, private local vaults, and workspace tools.

Tabora stores its workspace locally in the current browser profile. It does not require an account, sell user data, or send the saved workspace to Tabora servers. The optional link checker and link-detail fetching contact a saved or user-entered website only after the user starts the relevant save or import action and allows optional site access in Chrome. Chrome remembers that choice for future actions.

Individual pages and boards can be exported as local `.tabora` files for the user to send manually. Tabora does not upload or transmit those files.

**Category**

Productivity

**Single Purpose**

Organize browser tabs and bookmarks into visual pages and boards.

**Primary Language**

English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128x128 PNG | Ready | icons/tabora-128.png |
| Screenshot 1 | 1280x800 or 640x400 | Needs update | |
| Screenshot 2 | 1280x800 or 640x400 | Needs update | |
| Screenshot 3 | 1280x800 or 640x400 | Not created | |
| Small Promo Tile | 440x280 | Not created | |

### Screenshot Notes

- Show the new-tab dashboard with several populated boards.
- Show the toolbar popup saving a tab to a board.
- Show the light theme, wallpaper selector, and workspace tools.
- Refresh the dashboard screenshot after the in-layout welcome guidance is finalized.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `tabs` | permissions | Reads titles and addresses of tabs the user explicitly saves, creates tabs when opening saved links, and optionally closes tabs after saving a window. |
| `storage` | permissions | Stores pages, boards, links, settings, trash recovery data, and undo state locally in the browser profile. |
| `clipboardWrite` | permissions | Copies a link, board, page, or encrypted temporary room package when the user chooses a share or copy action. |
| `bookmarks` | optional_permissions | Imports browser bookmarks only after the user selects Browser bookmarks and approves access. |
| `http://*/*`, `https://*/*` | optional_host_permissions | Checks saved links and fetches title, description, and favicon metadata during user-initiated link saves or imports only after the user allows one-time optional site access in Chrome. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes. Tabora handles user-provided bookmarks and browsing-tab details locally to provide its core organization features.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|------------|-------------------------|---------|----------------------------|
| Personally identifiable info | No | No | Not collected | No |
| Authentication info | No | No | Not collected | No |
| Personal communications | No | No | Not collected | No |
| Location | No | No | Not collected | No |
| Web history | Yes | No | Stores tab titles and addresses selected by the user | No |
| User activity | Yes | No | Stores recently opened Tabora links and preferences locally | No |
| Website content | Yes | No | Stores bookmark titles, notes, addresses, and optional metadata locally | No |

The optional broken-link checker and link-detail fetching send standard HTTP requests directly from the browser to the specific websites selected by the user. Tabora does not operate an intermediary server and does not transmit the user's workspace to Tabora or analytics services.

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL:** TODO before submission

## Distribution

**Visibility:** Public

**Regions:** All regions

### Browser Compatibility

Tabora's Manifest V3 package is compatible with Chrome, Microsoft Edge, Brave, Opera, and Vivaldi. It includes both the Chromium service-worker and Firefox MV3 background-script declarations. The same manifest also contains Firefox signing metadata; Firefox distribution requires AMO signing and its required data-collection declaration, which states that Tabora does not transmit collected data. Safari requires conversion to a Safari Web Extension in Xcode. See `BROWSER_SUPPORT.md` for packaging and testing steps.

## Developer Info

**Publisher Name:** TODO before submission

**Contact Email:** TODO before submission

**Support URL / Email:** TODO before submission

**Homepage URL:** TODO before submission

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| Next release | 2026-08-31 | Added Chromium and Firefox MV3 compatibility plus browser-specific distribution guidance; no new permissions or data transmission | Draft |
| Next release | 2026-08-31 | Added portable `.tabora` files for exporting and importing individual boards and pages locally | Draft |
| Next release | 2026-08-31 | Added six premium dark and light wallpaper presets with matching glass UI palettes | Draft |
| Next release | 2026-08-31 | Added optimized Tabora icon assets for the Chrome toolbar, extension manager, and store listing | Draft |
| Next release | 2026-08-31 | Added automatic link metadata fetching during dashboard saves and imports with one-time optional site access | Draft |
| Next release | 2026-08-31 | Added quiet in-layout welcome guidance for creating boards, saving links, and searching the workspace | Draft |
| 3.0.2 | 2026-08-31 | Removed an unnecessary background permission and hardened service-worker startup across Chromium browsers | Draft |
| 3.0.1 | 2026-08-31 | MV3 reliability, optional site access, accessibility, consistent local typography, and theme-aware toolbar popup styling | Draft |

## Review Notes

### Known Issues / Limitations

- Uploaded wallpapers remain local to the browser profile and are not included in JSON workspace exports.
- The link checker cannot run unless the user grants optional access to saved HTTP and HTTPS addresses.
- Store graphics, publisher details, support details, and a public privacy policy URL must be completed before submission.

### Rejection History

None.
