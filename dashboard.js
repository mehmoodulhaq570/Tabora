const nodes = {
  pageTabs: document.querySelector("#pageTabs"),
  pageDialog: document.querySelector("#pageDialog"),
  pageForm: document.querySelector("#pageForm"),
  pageName: document.querySelector("#pageName"),
  pageDialogTitle: document.querySelector("#pageDialogTitle"),
  pageSubmitButton: document.querySelector("#pageSubmitButton"),
  editingPageId: document.querySelector("#editingPageId"),
  searchPanel: document.querySelector("#searchPanel"),
  globalSearch: document.querySelector("#globalSearch"),
  boardGrid: document.querySelector("#boardGrid"),
  contextMenu: document.querySelector("#contextMenu"),
  boardDialog: document.querySelector("#boardDialog"),
  boardForm: document.querySelector("#boardForm"),
  boardName: document.querySelector("#boardName"),
  editingBoardId: document.querySelector("#editingBoardId"),
  linkDialog: document.querySelector("#linkDialog"),
  linkForm: document.querySelector("#linkForm"),
  linkTitle: document.querySelector("#linkTitle"),
  linkUrl: document.querySelector("#linkUrl"),
  linkNote: document.querySelector("#linkNote"),
  linkBoardId: document.querySelector("#linkBoardId"),
  editingLinkId: document.querySelector("#editingLinkId"),
  importDialog: document.querySelector("#importDialog"),
  textImportPanel: document.querySelector("#textImportPanel"),
  importText: document.querySelector("#importText"),
  importPreview: document.querySelector("#importPreview"),
  trashDialog: document.querySelector("#trashDialog"),
  trashList: document.querySelector("#trashList"),
  appearancePanel: document.querySelector("#appearancePanel"),
  settingsDialog: document.querySelector("#settingsDialog"),
  onboardingCard: document.querySelector("#onboardingCard"),
  toast: document.querySelector("#toast")
};

let appState = createDefaultState();
let draggedItem = null;
let customWallpaperUrl = "";
let wallpaperPreviewUrls = [];
let toastTimer = null;
let pendingImportGroups = [];
let boardInsertionPlacement = { column: 0, order: 0 };

const WALLPAPERS = [
  { id: "none", name: "Default", theme: "dark", palette: "dark-default", image: "" },
  { id: "digital-ocean", name: "Digital Ocean", theme: "dark", palette: "forest", image: "assets/tabora-background.png" },
  { id: "crimson-realm", name: "Crimson Realm", theme: "dark", palette: "crimson", image: "assets/crimson-realm.png" },
  { id: "none", name: "Default", theme: "light", palette: "light-default", image: "" },
  { id: "mist-valley", name: "Mist Valley", theme: "light", palette: "mist", image: "assets/mist-valley.png" },
  { id: "amber-voyager", name: "Amber Voyager", theme: "light", palette: "amber", image: "assets/amber-voyager.png" }
];

const PAGE_MENU_ICONS = {
  rename: '<svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Z"></path><path d="m13.5 6.5 4 4"></path></svg>',
  share: '<svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="m8.3 10.9 7.4-4.4M8.3 13.1l7.4 4.4"></path></svg>',
  delete: '<svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"></path></svg>'
};

const BOARD_MENU_ICONS = {
  open: '<svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4 11 13"></path><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"></path></svg>',
  add: '<svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a4.5 4.5 0 0 0 6.4.1l2-2a4.5 4.5 0 0 0-6.3-6.4l-1.2 1.2"></path><path d="M14 11a4.5 4.5 0 0 0-6.4-.1l-2 2a4.5 4.5 0 0 0 6.3 6.4l1.2-1.2M19 16v5M16.5 18.5h5"></path></svg>',
  move: '<svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"></path></svg>'
};

async function init() {
  appState = await getTaboraState();
  await applyAppearance();
  render();
}

function activePage() {
  return appState.pages.find((page) => page.id === appState.settings.activePageId) || appState.pages[0];
}

function activeBoards() {
  return ordered(appState.boards.filter((board) => board.pageId === activePage().id));
}

function render() {
  renderPages();
  renderBoards();
  renderToolState();
  renderOnboarding();
}

function renderPages() {
  nodes.pageTabs.innerHTML = "";
  for (const page of ordered(appState.pages)) {
    const item = document.createElement("div");
    item.className = "page-tab-item";
    item.classList.toggle("active", page.id === activePage().id);
    const button = document.createElement("button");
    button.className = "page-tab";
    button.dataset.pageId = page.id;
    button.textContent = page.name;
    const options = document.createElement("button");
    options.className = "page-options-button";
    options.dataset.pageOptions = page.id;
    options.title = `${page.name} options`;
    options.setAttribute("aria-label", `${page.name} options`);
    options.innerHTML = '<svg class="page-chevron-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"></path></svg>';
    item.append(button, options);
    nodes.pageTabs.append(item);
  }
}

function renderBoards() {
  const query = nodes.globalSearch.value.trim();
  const boards = activeBoards().filter((board) => boardMatches(board, query));
  nodes.boardGrid.innerHTML = "";
  const columns = Array.from({ length: TABORA_BOARD_COLUMNS }, (_, columnIndex) => {
    const column = document.createElement("div");
    column.className = "board-column";
    column.dataset.boardColumn = String(columnIndex);
    nodes.boardGrid.append(column);
    return column;
  });
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    boards
      .filter((board) => board.column === columnIndex)
      .sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0))
      .forEach((board) => columns[columnIndex].append(createBoardCard(board, query)));
  }
  if (!query) nodes.boardGrid.append(createAddBoardTile());

  if (!boards.length && query) {
    columns.forEach((column) => column.remove());
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.innerHTML = "<strong>No matching links</strong><span>Try a different title, domain, or URL.</span>";
    nodes.boardGrid.append(empty);
  }
}

function createAddBoardTile() {
    const addTile = document.createElement("button");
    addTile.className = "add-board-tile";
    addTile.dataset.addBoard = "true";
    addTile.innerHTML = '<span class="add-circle" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 7v10M7 12h10"></path></svg></span><strong>Add Board</strong>';
    return addTile;
}

function createBoardCard(board, query) {
  const card = document.createElement("article");
  card.className = "board-card";
  card.dataset.boardId = board.id;
  card.dataset.column = String(board.column);
  card.dataset.columnOrder = String(board.columnOrder);
  card.draggable = appState.settings.organizeMode;

  const header = document.createElement("header");
  header.className = "board-header";
  header.innerHTML = `
    <div class="board-title"><svg class="drag-grip" viewBox="0 0 18 18" aria-hidden="true"><circle cx="5" cy="4" r="1"></circle><circle cx="13" cy="4" r="1"></circle><circle cx="5" cy="9" r="1"></circle><circle cx="13" cy="9" r="1"></circle><circle cx="5" cy="14" r="1"></circle><circle cx="13" cy="14" r="1"></circle></svg><h2></h2></div>
    <div class="board-actions">
      <button class="board-icon-button" data-add-link="${board.id}" title="Add link" aria-label="Add link"><svg class="board-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a4.5 4.5 0 0 0 6.4.1l2-2a4.5 4.5 0 0 0-6.3-6.4l-1.2 1.2"></path><path d="M14 11a4.5 4.5 0 0 0-6.4-.1l-2 2a4.5 4.5 0 0 0 6.3 6.4l1.2-1.2"></path><path class="icon-accent" d="M19 16v5M16.5 18.5h5"></path></svg></button>
      <button class="board-icon-button" data-board-menu="${board.id}" title="Board options" aria-label="Board options"><svg class="board-action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
    </div>`;
  setText(header, "h2", board.name);
  card.append(header);

  const list = document.createElement("div");
  list.className = "board-links";
  list.dataset.dropBoard = board.id;
  const normalizedQuery = query.toLowerCase();
  const links = ordered(board.links).filter((link) => !normalizedQuery || [link.title, link.url, link.note].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)));

  if (!links.length) {
    card.classList.add("empty-board");
    const empty = document.createElement("button");
    empty.className = "empty-board-link";
    empty.dataset.addLink = board.id;
    empty.textContent = query ? "Board title matches" : "Add your first link";
    list.append(empty);
  }

  for (const link of links) list.append(createLinkRow(board, link));
  card.append(list);

  const footer = document.createElement("footer");
  footer.className = "board-footer";
  footer.innerHTML = `<span>${board.links.length} ${board.links.length === 1 ? "link" : "links"}</span><button data-open-board="${board.id}">Open all</button>`;
  card.append(footer);
  return card;
}

function createLinkRow(board, link) {
  const row = document.createElement("div");
  row.className = "bookmark-row";
  row.dataset.linkId = link.id;
  row.dataset.boardId = board.id;
  row.draggable = appState.settings.organizeMode;

  const anchor = document.createElement("a");
  anchor.href = link.url;
  anchor.dataset.openLink = link.id;
  anchor.dataset.boardId = board.id;
  anchor.append(faviconNode(link));
  const copy = document.createElement("span");
  copy.className = "bookmark-copy";
  const title = document.createElement("strong");
  title.textContent = link.title;
  const domain = document.createElement("small");
  domain.className = "private-detail";
  domain.textContent = link.note || getDomain(link.url);
  copy.append(title, domain);
  anchor.append(copy);

  const actions = document.createElement("span");
  actions.className = "link-actions";
  actions.innerHTML = `<button data-edit-link="${link.id}" data-board-id="${board.id}" title="Edit link" aria-label="Edit link"><svg class="link-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Z"></path><path d="m13.5 6.5 4 4"></path></svg></button><button data-delete-link="${link.id}" data-board-id="${board.id}" title="Delete link" aria-label="Delete link"><svg class="link-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"></path></svg></button>`;
  row.append(anchor, actions);
  return row;
}

function renderToolState() {
  document.body.classList.toggle("privacy-mode", appState.settings.privacyMode);
  document.body.classList.toggle("organize-mode", appState.settings.organizeMode);
  document.body.classList.toggle("light-theme", appState.settings.theme === "light");
  document.body.classList.toggle("compact-mode", appState.settings.compactMode);
  document.body.classList.toggle("hide-extra-bookmarks", appState.settings.hideExtraBookmarks);
  document.body.classList.toggle("shorten-titles", appState.settings.shortenLongTitles);
  document.body.classList.toggle("hide-bookmark-descriptions", !appState.settings.showBookmarkDescriptions);
  document.body.classList.toggle("group-tools", appState.settings.groupRightTools);
  document.querySelector("#moreToolsTool").hidden = !appState.settings.groupRightTools;
  document.querySelector("#privacyTool").classList.toggle("active", appState.settings.privacyMode);
  document.querySelector("#organizeTool").classList.toggle("active", appState.settings.organizeMode);
  document.querySelector("#incognitoTool").classList.toggle("active", appState.settings.incognitoMode);
}

function renderOnboarding() {
  nodes.onboardingCard.hidden = appState.settings.onboardingComplete || appState.boards.length > 0;
}

function showToast(message, tone = "") {
  clearTimeout(toastTimer);
  const isWarning = tone === "warning" || (!tone && /cannot|could not|unavailable|invalid|not granted|no new|enter a valid|smaller than/i.test(message));
  nodes.toast.className = `toast ${isWarning ? "toast-warning" : "toast-success"}`;
  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = isWarning
    ? '<svg viewBox="0 0 24 24"><path d="M12 3 2.7 20h18.6L12 3Z"></path><path d="M12 9v5M12 17.5h.01"></path></svg>'
    : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.7 2.7L16.5 9"></path></svg>';
  const copy = document.createElement("span");
  copy.className = "toast-copy";
  copy.textContent = message;
  nodes.toast.replaceChildren(icon, copy);
  nodes.toast.hidden = false;
  requestAnimationFrame(() => nodes.toast.classList.add("is-visible"));
  toastTimer = setTimeout(() => {
    nodes.toast.classList.remove("is-visible");
    setTimeout(() => { if (!nodes.toast.classList.contains("is-visible")) nodes.toast.hidden = true; }, 360);
  }, 3600);
}

function openPageDialog(page = null) {
  nodes.editingPageId.value = page?.id || "";
  nodes.pageName.value = page?.name || "";
  nodes.pageDialogTitle.textContent = page ? "Rename Page" : "Add New Page";
  nodes.pageSubmitButton.textContent = page ? "Save Changes" : "Create Page";
  nodes.pageDialog.showModal();
  nodes.pageName.focus();
  if (page) nodes.pageName.select();
}

function openBoardDialog(board = null) {
  nodes.editingBoardId.value = board?.id || "";
  nodes.boardName.value = board?.name || "";
  document.querySelector("#boardDialogTitle").textContent = board ? "Rename board" : "Add board";
  nodes.boardDialog.showModal();
  nodes.boardName.focus();
}

function openLinkDialog(boardId, link = null) {
  nodes.linkBoardId.value = boardId;
  nodes.editingLinkId.value = link?.id || "";
  nodes.linkTitle.value = link?.title || "";
  nodes.linkUrl.value = link?.url || "";
  nodes.linkNote.value = link?.note || "";
  document.querySelector("#linkDialogTitle").textContent = link ? "Edit link" : "Add link";
  nodes.linkDialog.showModal();
  (link ? nodes.linkTitle : nodes.linkUrl).focus();
}

function closeInlineLinkEditor() {
  const editor = document.querySelector(".inline-link-editor");
  editor?.closest(".board-card")?.classList.remove("link-editor-open");
  editor?.remove();
}

async function fetchLinkMetadata(url) {
  const fallback = { title: getDomain(url), note: "", favIconUrl: "" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { credentials: "omit", redirect: "follow", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return fallback;

    const html = (await response.text()).slice(0, 1500000);
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const title = documentNode.querySelector('meta[property="og:title"]')?.content
      || documentNode.querySelector('meta[name="twitter:title"]')?.content
      || documentNode.title;
    const note = documentNode.querySelector('meta[property="og:description"]')?.content
      || documentNode.querySelector('meta[name="description"]')?.content
      || "";
    const iconHref = documentNode.querySelector('link[rel~="icon"]')?.href || "";
    let favIconUrl = "";
    if (iconHref) {
      const iconUrl = new URL(iconHref, response.url || url);
      if (["http:", "https:"].includes(iconUrl.protocol)) favIconUrl = iconUrl.href;
    }

    return {
      title: String(title || fallback.title).replace(/\s+/g, " ").trim(),
      note: String(note).replace(/\s+/g, " ").trim().slice(0, 2000),
      favIconUrl
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

function showInlineLinkDetails(editor, url, metadata) {
  if (!editor.isConnected) return;
  editor.innerHTML = `
    <form class="inline-link-details-form">
      <input class="inline-link-field" name="url" aria-label="Link URL" autocomplete="url" required>
      <textarea class="inline-link-field inline-link-title" name="title" aria-label="Link title" maxlength="240" required></textarea>
      <textarea class="inline-link-field inline-link-note" name="note" aria-label="Optional description" maxlength="2000" placeholder="Optional description (shown below title)"></textarea>
      <span class="inline-link-count" aria-live="polite">0</span>
      <div class="inline-link-actions">
        <button class="accent-button" type="submit">Add Link</button>
        <button class="secondary-button inline-link-cancel" type="button">Cancel</button>
      </div>
    </form>`;

  const form = editor.querySelector("form");
  const urlInput = form.elements.url;
  const titleInput = form.elements.title;
  const noteInput = form.elements.note;
  const count = editor.querySelector(".inline-link-count");
  urlInput.value = url;
  titleInput.value = metadata.title || getDomain(url);
  noteInput.value = metadata.note || "";
  count.textContent = String(2000 - noteInput.value.length);
  noteInput.addEventListener("input", () => { count.textContent = String(2000 - noteInput.value.length); });
  editor.querySelector(".inline-link-cancel").addEventListener("click", closeInlineLinkEditor);
  form.addEventListener("keydown", (event) => { if (event.key === "Escape") closeInlineLinkEditor(); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const normalizedUrl = normalizeUrl(urlInput.value);
    if (!normalizedUrl) { showToast("Enter a valid web address"); urlInput.focus(); return; }
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    await addLink(editor.dataset.boardId, {
      url: normalizedUrl,
      title: titleInput.value,
      note: noteInput.value,
      favIconUrl: metadata.favIconUrl
    });
    await refresh("Link added");
  });
  titleInput.focus();
  titleInput.select();
}

function openInlineLinkEditor(boardId) {
  closeInlineLinkEditor();
  const card = nodes.boardGrid.querySelector(`.board-card[data-board-id="${CSS.escape(boardId)}"]`);
  if (!card) return;

  const editor = document.createElement("section");
  editor.className = "inline-link-editor";
  editor.dataset.boardId = boardId;
  editor.innerHTML = `
    <form class="inline-link-url-form">
      <input class="inline-link-field" name="url" aria-label="Link URL" placeholder="https://example.com" autocomplete="url" required>
      <div class="inline-link-actions">
        <button class="accent-button" type="submit">Add Link</button>
        <button class="secondary-button inline-link-cancel" type="button">Cancel</button>
      </div>
    </form>`;
  card.classList.add("link-editor-open");
  card.querySelector(".board-header").after(editor);

  const form = editor.querySelector("form");
  const input = form.elements.url;
  editor.querySelector(".inline-link-cancel").addEventListener("click", closeInlineLinkEditor);
  form.addEventListener("keydown", (event) => { if (event.key === "Escape") closeInlineLinkEditor(); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const url = normalizeUrl(input.value);
    if (!url) { showToast("Enter a valid web address"); input.focus(); return; }
    editor.innerHTML = '<div class="inline-link-fetching" role="status"><span class="fetch-spinner" aria-hidden="true"></span><strong>Fetching title...</strong></div>';
    const [metadata] = await Promise.all([
      fetchLinkMetadata(url),
      new Promise((resolve) => setTimeout(resolve, 420))
    ]);
    showInlineLinkDetails(editor, url, metadata);
  });
  input.focus();
}

function closeDialog(id) {
  document.querySelector(`#${id}`)?.close();
}

function showContextMenu(anchor, items) {
  nodes.contextMenu.innerHTML = "";
  for (const item of items) {
    if (item.separator) {
      nodes.contextMenu.append(document.createElement("hr"));
      continue;
    }
    const button = document.createElement("button");
    button.className = item.danger ? "danger-menu-item" : "";
    button.innerHTML = `<span>${item.icon || ""}</span><span></span>`;
    setText(button, "span:last-child", item.label);
    button.addEventListener("click", async () => {
      nodes.contextMenu.hidden = true;
      await item.action();
    });
    nodes.contextMenu.append(button);
  }
  nodes.contextMenu.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const width = 230;
  nodes.contextMenu.style.left = `${Math.min(rect.left, window.innerWidth - width - 16)}px`;
  nodes.contextMenu.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - nodes.contextMenu.offsetHeight - 16)}px`;
}

function boardMenuItems(board) {
  const items = [
    { icon: BOARD_MENU_ICONS.open, label: "Open all links", action: () => openBoard(board) },
    { icon: BOARD_MENU_ICONS.add, label: "Add link", action: () => openInlineLinkEditor(board.id) },
    { icon: PAGE_MENU_ICONS.rename, label: "Rename board", action: () => openBoardDialog(board) },
    { icon: PAGE_MENU_ICONS.share, label: "Share / copy links", action: () => copyBoardLinks(board) }
  ];
  const otherPages = ordered(appState.pages).filter((page) => page.id !== board.pageId);
  for (const page of otherPages) {
    items.push({ icon: BOARD_MENU_ICONS.move, label: `Move to ${page.name}`, action: async () => { await moveBoard(board.id, page.id); await refresh("Board moved"); } });
  }
  items.push({ separator: true }, { icon: PAGE_MENU_ICONS.delete, label: "Delete board", danger: true, action: async () => { await deleteBoard(board.id); await refresh("Board moved to Trash"); } });
  return items;
}

async function openBoard(board) {
  try {
    await openLinks(ordered(board.links), appState.settings.incognitoMode);
  } catch {
    showToast("Private opening is unavailable. Enable Tabora in Brave private windows.");
  }
}

async function openSingleLink(link) {
  try {
    if (appState.settings.incognitoMode) {
      await chrome.windows.create({ url: link.url, incognito: true, focused: true });
    } else if (appState.settings.openLinksInNewTab) {
      await chrome.tabs.create({ url: link.url, active: true });
    } else {
      await chrome.tabs.update({ url: link.url });
    }
  } catch {
    showToast("Could not open a private window. Check Brave extension settings.");
  }
}

async function copyBoardLinks(board) {
  const text = ordered(board.links).map((link) => `${link.title} | ${link.url}`).join("\n");
  await navigator.clipboard.writeText(text);
  showToast("Board links copied");
}

async function copyPageLinks(page) {
  const boards = appState.boards
    .filter((board) => board.pageId === page.id)
    .sort((a, b) => a.column - b.column || a.columnOrder - b.columnOrder);
  const text = boards.map((board) => {
    const links = ordered(board.links).map((link) => `${link.title} | ${link.url}`).join("\n");
    return `${board.name}\n${links}`.trim();
  }).join("\n\n");
  await navigator.clipboard.writeText(text || page.name);
  showToast("Page links copied");
}

function pageMenuItems(page) {
  return [
    { icon: PAGE_MENU_ICONS.rename, label: "Rename", action: () => openPageDialog(page) },
    { icon: PAGE_MENU_ICONS.share, label: "Share Page", action: () => copyPageLinks(page) },
    { separator: true },
    { icon: PAGE_MENU_ICONS.delete, label: "Delete", danger: true, action: async () => {
      if (page.protected) { showToast("The Home page cannot be deleted"); return; }
      if (window.confirm(`Delete ${page.name} and move its boards to Trash?`)) {
        await deletePage(page.id);
        boardInsertionPlacement = { column: 0, order: 0 };
        await refresh("Page deleted");
      }
    } }
  ];
}

async function refresh(message = "") {
  appState = await getTaboraState();
  render();
  if (message) showToast(message);
}

nodes.pageTabs.addEventListener("click", async (event) => {
  const optionsButton = event.target.closest("[data-page-options]");
  if (optionsButton) {
    const page = appState.pages.find((item) => item.id === optionsButton.dataset.pageOptions);
    if (page) showContextMenu(optionsButton, pageMenuItems(page));
    return;
  }
  const button = event.target.closest("[data-page-id]");
  if (!button) return;
  boardInsertionPlacement = { column: 0, order: 0 };
  await setSetting("activePageId", button.dataset.pageId);
  await refresh();
});

nodes.pageTabs.addEventListener("contextmenu", (event) => {
  const button = event.target.closest("[data-page-id]");
  const page = appState.pages.find((item) => item.id === button?.dataset.pageId);
  if (!button || !page) return;
  event.preventDefault();
  showContextMenu(button, pageMenuItems(page));
});

document.querySelector("#addPageButton").addEventListener("click", () => {
  openPageDialog();
});

nodes.pageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!nodes.pageName.value.trim()) return;
  const editingPageId = nodes.editingPageId.value;
  if (editingPageId) await renamePage(editingPageId, nodes.pageName.value);
  else await addPage(nodes.pageName.value);
  nodes.pageName.value = "";
  nodes.editingPageId.value = "";
  nodes.pageDialog.close();
  await refresh(editingPageId ? "Page renamed" : "Page created");
});

function openInlineBoardEditor(tile) {
  document.querySelector(".inline-board-form")?.remove();
  const form = document.createElement("form");
  form.className = "inline-board-form";
  form.style.left = tile.style.left;
  form.style.top = tile.style.top;
  form.style.width = tile.style.width;
  if (!tile.style.left) form.classList.add("is-static");
  form.innerHTML = '<input class="inline-board-input" name="boardName" placeholder="Enter board name..." maxlength="60" autocomplete="off" required><button class="accent-button" type="submit">Add</button><button class="danger-icon-button" type="button" data-cancel-inline-board aria-label="Cancel">&times;</button>';
  nodes.boardGrid.append(form);
  hideBoardInsertionPreview();
  const input = form.querySelector("input");
  input.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!input.value.trim()) return;
    await addBoard(activePage().id, input.value, [], boardInsertionPlacement);
    boardInsertionPlacement = { ...boardInsertionPlacement, order: boardInsertionPlacement.order + 1 };
    await refresh("Board created");
  });
  form.querySelector("[data-cancel-inline-board]").addEventListener("click", () => form.remove());
  form.addEventListener("keydown", (event) => { if (event.key === "Escape") form.remove(); });
}

nodes.boardGrid.addEventListener("click", async (event) => {
  const addBoardButton = event.target.closest("[data-add-board]");
  const addLinkButton = event.target.closest("[data-add-link]");
  const menuButton = event.target.closest("[data-board-menu]");
  const openButton = event.target.closest("[data-open-board]");
  const linkAnchor = event.target.closest("[data-open-link]");
  const editLinkButton = event.target.closest("[data-edit-link]");
  const deleteLinkButton = event.target.closest("[data-delete-link]");

  if (addBoardButton) openInlineBoardEditor(addBoardButton);
  if (addLinkButton) openInlineLinkEditor(addLinkButton.dataset.addLink);
  if (menuButton) {
    const board = appState.boards.find((item) => item.id === menuButton.dataset.boardMenu);
    if (board) showContextMenu(menuButton, boardMenuItems(board));
  }
  if (openButton) {
    const board = appState.boards.find((item) => item.id === openButton.dataset.openBoard);
    if (board) await openBoard(board);
  }
  if (linkAnchor) {
    event.preventDefault();
    const board = appState.boards.find((item) => item.id === linkAnchor.dataset.boardId);
    const link = board?.links.find((item) => item.id === linkAnchor.dataset.openLink);
    if (link) await openSingleLink(link);
  }
  if (editLinkButton) {
    const board = appState.boards.find((item) => item.id === editLinkButton.dataset.boardId);
    const link = board?.links.find((item) => item.id === editLinkButton.dataset.editLink);
    if (link) openLinkDialog(board.id, link);
  }
  if (deleteLinkButton && window.confirm("Delete this link?")) {
    await deleteLink(deleteLinkButton.dataset.boardId, deleteLinkButton.dataset.deleteLink);
    await refresh("Link deleted");
  }
});

nodes.boardForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!nodes.boardName.value.trim()) return;
  const editing = Boolean(nodes.editingBoardId.value);
  if (editing) await renameBoard(nodes.editingBoardId.value, nodes.boardName.value);
  else {
    await addBoard(activePage().id, nodes.boardName.value, [], boardInsertionPlacement);
    boardInsertionPlacement = { ...boardInsertionPlacement, order: boardInsertionPlacement.order + 1 };
  }
  nodes.boardDialog.close();
  await refresh(editing ? "Board renamed" : "Board created");
});

nodes.linkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = { title: nodes.linkTitle.value, url: nodes.linkUrl.value, note: nodes.linkNote.value };
  if (!normalizeUrl(values.url)) { showToast("Enter a valid web address"); return; }
  if (nodes.editingLinkId.value) await updateLink(nodes.linkBoardId.value, nodes.editingLinkId.value, values);
  else await addLink(nodes.linkBoardId.value, values);
  nodes.linkDialog.close();
  await refresh(nodes.editingLinkId.value ? "Link updated" : "Link added");
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => closeDialog(button.dataset.closeDialog));
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
});

document.querySelector("#searchTool").addEventListener("click", () => {
  nodes.searchPanel.hidden = !nodes.searchPanel.hidden;
  if (!nodes.searchPanel.hidden) nodes.globalSearch.focus();
});
nodes.globalSearch.addEventListener("input", renderBoards);
document.querySelector("#clearSearch").addEventListener("click", () => { nodes.globalSearch.value = ""; renderBoards(); nodes.globalSearch.focus(); });

document.querySelector("#incognitoTool").addEventListener("click", async () => {
  await setSetting("incognitoMode", !appState.settings.incognitoMode);
  await refresh(appState.settings.incognitoMode ? "Private opening disabled" : "Private opening enabled");
});

document.querySelector("#organizeTool").addEventListener("click", async () => {
  await setSetting("organizeMode", !appState.settings.organizeMode);
  await refresh(appState.settings.organizeMode ? "Organize mode closed" : "Drag boards and links to rearrange them");
});

document.querySelector("#privacyTool").addEventListener("click", async () => {
  await setSetting("privacyMode", !appState.settings.privacyMode);
  await refresh(appState.settings.privacyMode ? "Privacy mode disabled" : "URLs are now blurred");
});

let appearanceCloseTimer;

async function openAppearancePanel() {
  clearTimeout(appearanceCloseTimer);
  await renderAppearancePanel();
  nodes.appearancePanel.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => nodes.appearancePanel.classList.add("is-open")));
}

function closeAppearancePanel() {
  clearTimeout(appearanceCloseTimer);
  nodes.appearancePanel.classList.remove("is-open");
  appearanceCloseTimer = setTimeout(() => {
    if (!nodes.appearancePanel.classList.contains("is-open")) nodes.appearancePanel.hidden = true;
  }, 280);
}

function toggleAppearancePanel() {
  if (nodes.appearancePanel.hidden || !nodes.appearancePanel.classList.contains("is-open")) openAppearancePanel();
  else closeAppearancePanel();
}

document.querySelector("#wallpaperTool").addEventListener("click", toggleAppearancePanel);
document.querySelector("#settingsTool").addEventListener("click", () => {
  closeAppearancePanel();
  renderSettings();
  nodes.settingsDialog.showModal();
});
document.querySelector("#moreToolsTool").addEventListener("click", () => {
  document.querySelector(".tool-rail").classList.toggle("tools-expanded");
});
document.querySelector("#importTool").addEventListener("click", () => {
  nodes.textImportPanel.hidden = true;
  nodes.importPreview.hidden = true;
  document.querySelector(".import-options").hidden = false;
  pendingImportGroups = [];
  nodes.importDialog.showModal();
});
document.querySelector("#trashTool").addEventListener("click", () => { renderTrash(); nodes.trashDialog.showModal(); });

nodes.boardGrid.addEventListener("dragstart", (event) => {
  if (!appState.settings.organizeMode) return;
  const link = event.target.closest(".bookmark-row");
  const board = event.target.closest(".board-card");
  if (link) draggedItem = { type: "link", id: link.dataset.linkId, boardId: link.dataset.boardId };
  else if (board) draggedItem = { type: "board", id: board.dataset.boardId };
  event.dataTransfer.effectAllowed = "move";
  event.target.classList.add("dragging");
});

nodes.boardGrid.addEventListener("dragend", (event) => { event.target.classList.remove("dragging"); draggedItem = null; });
nodes.boardGrid.addEventListener("dragover", (event) => { if (draggedItem) event.preventDefault(); });
nodes.boardGrid.addEventListener("drop", async (event) => {
  event.preventDefault();
  const targetBoard = event.target.closest(".board-card");
  const targetColumn = event.target.closest("[data-board-column]");
  if (!draggedItem) return;
  if (draggedItem.type === "board" && targetBoard) await reorderBoard(draggedItem.id, targetBoard.dataset.boardId);
  else if (draggedItem.type === "board" && targetColumn) await moveBoardToColumn(draggedItem.id, Number(targetColumn.dataset.boardColumn));
  if (draggedItem.type === "link") {
    if (!targetBoard) return;
    const targetLink = event.target.closest(".bookmark-row");
    await moveLink(draggedItem.id, draggedItem.boardId, targetBoard.dataset.boardId, targetLink?.dataset.linkId || null);
  }
  await refresh("Order updated");
});

let insertionFrame = null;
const insertionSurface = document.querySelector(".workspace-main");

function hideBoardInsertionPreview() {
  const tile = nodes.boardGrid.querySelector(".add-board-tile");
  if (!tile) return;
  tile.classList.remove("is-visible");
  tile.style.left = "";
  tile.style.top = "";
  tile.style.width = "";
}

insertionSurface.addEventListener("pointermove", (event) => {
  if (nodes.boardGrid.querySelector(".inline-board-form")) return;
  if (nodes.globalSearch.value || appState.settings.organizeMode || event.pointerType === "touch") {
    hideBoardInsertionPreview();
    return;
  }
  const pointerX = event.clientX;
  const pointerY = event.clientY;
  cancelAnimationFrame(insertionFrame);
  insertionFrame = requestAnimationFrame(() => {
    const tile = nodes.boardGrid.querySelector(".add-board-tile");
    if (!tile) return;
    const gridRect = nodes.boardGrid.getBoundingClientRect();
    const gridStyles = getComputedStyle(nodes.boardGrid);
    const gap = parseFloat(gridStyles.rowGap) || 14;
    const candidates = [...nodes.boardGrid.querySelectorAll("[data-board-column]")].map((column, columnIndex) => {
      const columnRect = column.getBoundingClientRect();
      const cards = [...column.querySelectorAll(".board-card")];
      const lastCardRect = cards.at(-1)?.getBoundingClientRect();
      return {
        left: columnRect.left,
        top: lastCardRect ? lastCardRect.bottom + gap : gridRect.top,
        width: columnRect.width,
        column: columnIndex,
        order: cards.length
      };
    });

    const hoveredSlot = candidates.find((slot) => (
      pointerX >= slot.left - 8
      && pointerX <= slot.left + slot.width + 8
      && pointerY >= slot.top - 8
      && pointerY <= slot.top + 80
    ));

    if (!hoveredSlot) {
      hideBoardInsertionPreview();
      return;
    }

    boardInsertionPlacement = { column: hoveredSlot.column, order: hoveredSlot.order };
    tile.style.left = `${hoveredSlot.left - gridRect.left}px`;
    tile.style.top = `${hoveredSlot.top - gridRect.top}px`;
    tile.style.width = `${hoveredSlot.width}px`;
    tile.classList.add("is-visible");
  });
});

insertionSurface.addEventListener("pointerleave", () => {
  cancelAnimationFrame(insertionFrame);
  hideBoardInsertionPreview();
});

function parseTextLinks(text) {
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const separator = line.includes("|") ? "|" : line.includes(",") ? "," : null;
    if (!separator) return { title: "", url: line };
    const [title, ...urlParts] = line.split(separator);
    return { title: title.trim().replace(/^['\"]|['\"]$/g, ""), url: urlParts.join(separator).trim().replace(/^['\"]|['\"]$/g, "") };
  }).filter((link) => normalizeUrl(link.url));
}

function prepareImport(groups) {
  const existingUrls = new Set(appState.boards.filter((board) => board.pageId === activePage().id).flatMap((board) => board.links.map((link) => normalizeUrl(link.url))));
  const seen = new Set(existingUrls);
  let duplicates = 0;
  pendingImportGroups = groups.map((group) => ({
    name: cleanName(group.name, "Imported Links"),
    links: group.links.filter((link) => {
      const url = normalizeUrl(link.url);
      if (!url || seen.has(url)) { duplicates += 1; return false; }
      seen.add(url);
      link.url = url;
      return true;
    })
  })).filter((group) => group.links.length);

  const total = pendingImportGroups.reduce((sum, group) => sum + group.links.length, 0);
  if (!total) { showToast("No new links were found; duplicates were skipped"); return; }
  nodes.textImportPanel.hidden = true;
  document.querySelector(".import-options").hidden = true;
  nodes.importPreview.hidden = false;
  document.querySelector("#importPreviewTitle").textContent = `${total} links in ${pendingImportGroups.length} ${pendingImportGroups.length === 1 ? "board" : "boards"}`;
  document.querySelector("#importPreviewDetails").textContent = duplicates ? `${duplicates} duplicate or invalid links will be skipped.` : "No duplicates found.";
  const list = document.querySelector("#importPreviewBoards");
  list.innerHTML = "";
  for (const group of pendingImportGroups) {
    const row = document.createElement("div");
    row.className = "preview-board-row";
    row.innerHTML = "<strong></strong><span></span>";
    setText(row, "strong", group.name);
    setText(row, "span", `${group.links.length} links`);
    list.append(row);
  }
}

async function importBrowserBookmarks() {
  const granted = await chrome.permissions.request({ permissions: ["bookmarks"] });
  if (!granted) { showToast("Bookmark access was not granted"); return; }
  const tree = await chrome.bookmarks.getTree();
  const groups = [];
  const loose = [];
  function walk(node, parentTitle = "") {
    const links = (node.children || []).filter((child) => child.url).map((child) => ({ title: child.title, url: child.url }));
    const title = node.title || parentTitle;
    if (links.length && title) groups.push({ name: title, links });
    else loose.push(...links);
    for (const child of node.children || []) if (child.children) walk(child, child.title || title);
  }
  walk(tree[0]);
  if (loose.length) groups.push({ name: "Imported Bookmarks", links: loose });
  prepareImport(groups);
}

document.querySelector(".import-options").addEventListener("click", async (event) => {
  const option = event.target.closest("[data-import]");
  if (!option) return;
  if (option.dataset.import === "bookmarks") await importBrowserBookmarks();
  if (option.dataset.import === "window") {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const links = tabs.filter((tab) => normalizeUrl(tab.url)).map((tab) => ({ title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl || "" }));
    prepareImport([{ name: "Current Window", links }]);
  }
  if (option.dataset.import === "text") { nodes.textImportPanel.hidden = false; nodes.importText.focus(); }
});

document.querySelector("#confirmTextImport").addEventListener("click", () => prepareImport([{ name: "Imported Links", links: parseTextLinks(nodes.importText.value) }]));

document.querySelector("#importFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  let links = [];
  if (/\.html?$/i.test(file.name)) {
    const doc = new DOMParser().parseFromString(text, "text/html");
    links = [...doc.querySelectorAll("a[href]")].map((anchor) => ({ title: anchor.textContent.trim(), url: anchor.href }));
  } else links = parseTextLinks(text);
  prepareImport([{ name: file.name.replace(/\.[^.]+$/, ""), links }]);
  event.target.value = "";
});

document.querySelector("#cancelImportPreview").addEventListener("click", () => {
  nodes.importPreview.hidden = true;
  document.querySelector(".import-options").hidden = false;
});

document.querySelector("#commitImport").addEventListener("click", async () => {
  if (!pendingImportGroups.length) return;
  await chrome.storage.local.set({ taboraLastImportBackup: structuredClone(appState) });
  const total = pendingImportGroups.reduce((sum, group) => sum + group.links.length, 0);
  for (const group of pendingImportGroups) await addBoard(activePage().id, group.name, group.links);
  pendingImportGroups = [];
  nodes.importDialog.close();
  await refresh(`${total} links imported`);
});

function renderTrash() {
  nodes.trashList.innerHTML = "";
  if (!appState.trash.length) nodes.trashList.innerHTML = '<div class="dialog-empty">Trash is empty.</div>';
  for (const [index, item] of appState.trash.entries()) {
    const row = document.createElement("div");
    row.className = "trash-row";
    row.innerHTML = `<div><strong></strong><span>${item.value.links?.length || 0} links</span></div><button class="secondary-button" data-restore-index="${index}">Restore</button>`;
    setText(row, "strong", item.value.name);
    nodes.trashList.append(row);
  }
}

nodes.trashList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-restore-index]");
  if (!button) return;
  await restoreTrashItem(Number(button.dataset.restoreIndex));
  await refresh("Board restored");
  renderTrash();
});

document.querySelector("#emptyTrash").addEventListener("click", async () => {
  if (!appState.trash.length || !window.confirm("Permanently delete everything in Trash?")) return;
  await emptyTrash();
  await refresh("Trash emptied");
  renderTrash();
});

async function renderAppearancePanel() {
  document.querySelectorAll("[data-theme]").forEach((button) => button.classList.toggle("active", button.dataset.theme === appState.settings.theme));
  wallpaperPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  wallpaperPreviewUrls = [];

  const customWallpapers = await getCustomWallpapers();
  const customSection = document.querySelector("#yourWallpapersSection");
  const customGrid = document.querySelector("#yourWallpaperGrid");
  customSection.hidden = customWallpapers.length === 0;
  document.querySelector("#yourWallpaperCount").textContent = String(customWallpapers.length);
  customGrid.innerHTML = "";
  for (const wallpaper of customWallpapers) {
    const url = URL.createObjectURL(wallpaper.blob);
    wallpaperPreviewUrls.push(url);
    const card = document.createElement("article");
    card.className = "custom-wallpaper-card";
    card.classList.toggle("selected", wallpaper.id === appState.settings.wallpaper);
    card.innerHTML = `
      <button class="custom-wallpaper-preview" type="button" data-wallpaper="${wallpaper.id}" aria-label="Use uploaded wallpaper"></button>
      <strong class="custom-wallpaper-name"></strong>
      <div class="custom-wallpaper-actions">
        <button class="custom-wallpaper-action" type="button" data-rename-wallpaper="${wallpaper.id}" title="Rename wallpaper" aria-label="Rename wallpaper"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"></path><path d="m13.5 6.5 4 4"></path></svg></button>
        <button class="custom-wallpaper-action" type="button" data-download-wallpaper="${wallpaper.id}" title="Download wallpaper" aria-label="Download wallpaper"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 18v3h14v-3"></path></svg></button>
        <button class="custom-wallpaper-action danger" type="button" data-delete-wallpaper="${wallpaper.id}" title="Delete wallpaper" aria-label="Delete wallpaper"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"></path></svg></button>
      </div>`;
    card.querySelector(".custom-wallpaper-preview").style.backgroundImage = `url("${url}")`;
    card.querySelector(".custom-wallpaper-name").textContent = wallpaper.name;
    customGrid.append(card);
  }

  const wallpapers = WALLPAPERS.filter((wallpaper) => wallpaper.theme === appState.settings.theme);
  document.querySelector("#wallpaperCount").textContent = String(wallpapers.length);
  const grid = document.querySelector("#wallpaperGrid");
  grid.innerHTML = "";
  for (const wallpaper of wallpapers) {
    const button = document.createElement("button");
    button.className = "wallpaper-swatch";
    button.dataset.wallpaper = wallpaper.id;
    button.classList.toggle("selected", wallpaper.id === appState.settings.wallpaper);
    if (wallpaper.image) button.style.backgroundImage = `url("${wallpaper.image}")`;
    else button.classList.add("default-swatch");
    const label = document.createElement("span");
    label.textContent = wallpaper.name;
    button.append(label);
    grid.append(button);
  }
}

function renderSettings() {
  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.checked = Boolean(appState.settings[input.dataset.setting]);
  });
  document.querySelector("#quickSaveDestination").value = appState.settings.quickSaveDestination;
  document.querySelector("#languageSelect").value = appState.settings.language;
}

document.querySelectorAll("[data-settings-view]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-settings-view]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".settings-view").forEach((view) => view.classList.toggle("active", view.dataset.view === button.dataset.settingsView));
  });
});

document.querySelectorAll("[data-setting]").forEach((input) => {
  input.addEventListener("change", async () => {
    await setSetting(input.dataset.setting, input.checked);
    await refresh();
    renderSettings();
  });
});

document.querySelector("#quickSaveDestination").addEventListener("change", async (event) => {
  await setSetting("quickSaveDestination", event.target.value);
  await refresh("Quick Save destination updated");
});

document.querySelector("#languageSelect").addEventListener("change", async (event) => {
  await setSetting("language", event.target.value);
  await refresh("Language preference updated");
});

document.querySelector("#changeShortcut").addEventListener("click", async () => {
  try {
    await chrome.tabs.create({ url: "brave://extensions/shortcuts" });
  } catch {
    await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  }
});

function exportTaboraData() {
  const blob = new Blob([JSON.stringify(appState, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tabora-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Tabora backup exported");
}

document.querySelector("#exportTaboraData").addEventListener("click", exportTaboraData);
document.querySelector("#supportExport").addEventListener("click", exportTaboraData);
document.querySelector("#resetPreferences").addEventListener("click", async () => {
  if (!window.confirm("Reset Tabora preferences? Your pages, boards, and links will stay untouched.")) return;
  const defaults = createDefaultState().settings;
  await updateTaboraState((state) => {
    state.settings = { ...defaults, activePageId: state.settings.activePageId };
  });
  nodes.settingsDialog.close();
  await init();
  showToast("Preferences reset");
});

document.querySelector(".segmented-control").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-theme]");
  if (!button) return;
  const nextTheme = button.dataset.theme;
  const currentIsAvailable = WALLPAPERS.some((wallpaper) => wallpaper.id === appState.settings.wallpaper && wallpaper.theme === nextTheme);
  await setSetting("theme", button.dataset.theme);
  if (!currentIsAvailable && !appState.settings.wallpaper.startsWith("custom")) await setSetting("wallpaper", "none");
  await refresh();
  await applyAppearance();
  renderAppearancePanel();
});

document.querySelector("#wallpaperGrid").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-wallpaper]");
  if (!button) return;
  await setSetting("wallpaper", button.dataset.wallpaper);
  await refresh();
  await applyAppearance();
  renderAppearancePanel();
});

document.querySelector("#yourWallpaperGrid").addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-wallpaper]");
  const downloadButton = event.target.closest("[data-download-wallpaper]");
  const renameButton = event.target.closest("[data-rename-wallpaper]");
  const selectButton = event.target.closest("[data-wallpaper]");
  if (deleteButton) {
    const id = deleteButton.dataset.deleteWallpaper;
    await deleteCustomWallpaper(id);
    if (appState.settings.wallpaper === id) await setSetting("wallpaper", "none");
    await refresh("Wallpaper removed");
    await applyAppearance();
    await renderAppearancePanel();
    return;
  }
  if (downloadButton) {
    const wallpaper = (await getCustomWallpapers()).find((item) => item.id === downloadButton.dataset.downloadWallpaper);
    if (wallpaper) downloadWallpaper(wallpaper);
    return;
  }
  if (renameButton) {
    const wallpaper = (await getCustomWallpapers()).find((item) => item.id === renameButton.dataset.renameWallpaper);
    const name = wallpaper && window.prompt("Wallpaper name", wallpaper.name);
    if (name?.trim()) {
      await renameCustomWallpaper(wallpaper.id, name.trim());
      await renderAppearancePanel();
    }
    return;
  }
  if (!selectButton) return;
  await setSetting("wallpaper", selectButton.dataset.wallpaper);
  await refresh();
  await applyAppearance();
  await renderAppearancePanel();
});

document.querySelector("#wallpaperUpload").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 12 * 1024 * 1024) { showToast("Choose an image smaller than 12 MB"); return; }
  const wallpaperId = await saveWallpaperBlob(file);
  await setSetting("wallpaper", wallpaperId);
  await refresh("Custom wallpaper applied");
  await applyAppearance();
  await renderAppearancePanel();
  event.target.value = "";
});

document.querySelector("#moreWallpapers").addEventListener("click", () => showToast("More original Tabora wallpapers are coming next"));

function openWallpaperDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("tabora-assets", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("wallpapers");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveWallpaperBlob(blob) {
  const database = await openWallpaperDatabase();
  const id = `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("wallpapers", "readwrite");
    transaction.objectStore("wallpapers").put({ blob, name: blob.name || "Uploaded wallpaper", createdAt: Date.now() }, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  return id;
}

async function getWallpaperBlob(id = "custom") {
  const database = await openWallpaperDatabase();
  const value = await new Promise((resolve, reject) => {
    const request = database.transaction("wallpapers").objectStore("wallpapers").get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return value instanceof Blob ? value : value?.blob || null;
}

async function getCustomWallpapers() {
  const database = await openWallpaperDatabase();
  const wallpapers = await new Promise((resolve, reject) => {
    const store = database.transaction("wallpapers").objectStore("wallpapers");
    const request = store.openCursor();
    const result = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { resolve(result); return; }
      const value = cursor.value;
      const blob = value instanceof Blob ? value : value?.blob;
      if (blob) result.push({ id: String(cursor.key), blob, name: value?.name || blob.name || "Uploaded wallpaper", createdAt: value?.createdAt || 0 });
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
  database.close();
  return wallpapers.sort((a, b) => b.createdAt - a.createdAt);
}

async function deleteCustomWallpaper(id) {
  const database = await openWallpaperDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("wallpapers", "readwrite");
    transaction.objectStore("wallpapers").delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function renameCustomWallpaper(id, name) {
  const database = await openWallpaperDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("wallpapers", "readwrite");
    const store = transaction.objectStore("wallpapers");
    const request = store.get(id);
    request.onsuccess = () => {
      const value = request.result;
      const blob = value instanceof Blob ? value : value?.blob;
      if (blob) store.put({ blob, name, createdAt: value?.createdAt || Date.now() }, id);
    };
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

function downloadWallpaper(wallpaper) {
  const url = URL.createObjectURL(wallpaper.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = wallpaper.name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function applyAppearance() {
  const backdrop = document.querySelector("#dashboardBackdrop");
  const definition = WALLPAPERS.find((wallpaper) => wallpaper.id === appState.settings.wallpaper && wallpaper.theme === appState.settings.theme)
    || WALLPAPERS.find((wallpaper) => wallpaper.id === "none" && wallpaper.theme === appState.settings.theme);
  const isCustomWallpaper = appState.settings.wallpaper.startsWith("custom");
  document.body.dataset.palette = isCustomWallpaper
    ? (appState.settings.theme === "light" ? "light-default" : "dark-default")
    : definition.palette;
  if (customWallpaperUrl) { URL.revokeObjectURL(customWallpaperUrl); customWallpaperUrl = ""; }
  backdrop.className = `dashboard-backdrop wallpaper-${isCustomWallpaper ? "custom" : appState.settings.wallpaper}`;
  backdrop.style.backgroundImage = "";
  if (isCustomWallpaper) {
    const blob = await getWallpaperBlob(appState.settings.wallpaper);
    if (blob) { customWallpaperUrl = URL.createObjectURL(blob); backdrop.style.backgroundImage = `url("${customWallpaperUrl}")`; }
  }
}

document.querySelector("#skipOnboarding").addEventListener("click", async () => { await setSetting("onboardingComplete", true); await refresh(); });
document.addEventListener("click", (event) => {
  if (!event.target.closest("#contextMenu") && !event.target.closest("[data-board-menu]") && !event.target.closest("[data-page-options]")) nodes.contextMenu.hidden = true;
  if (!event.target.closest("#appearancePanel") && !event.target.closest("#wallpaperTool")) closeAppearancePanel();
});
document.addEventListener("keydown", (event) => { if (event.key === "/" && !event.target.matches("input, textarea")) { event.preventDefault(); nodes.searchPanel.hidden = false; nodes.globalSearch.focus(); } });
chrome.storage.onChanged.addListener((changes) => { if (changes[TABORA_STORAGE_KEY]) init(); });
init();
