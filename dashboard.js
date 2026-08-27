const nodes = {
  pageTabs: document.querySelector("#pageTabs"),
  pageDialog: document.querySelector("#pageDialog"),
  pageForm: document.querySelector("#pageForm"),
  pageName: document.querySelector("#pageName"),
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
let toastTimer = null;
let pendingImportGroups = [];
let boardInsertionIndex = Number.MAX_SAFE_INTEGER;

const WALLPAPERS = [
  { id: "none", name: "Default", theme: "dark", palette: "dark-default", image: "" },
  { id: "digital-ocean", name: "Digital Ocean", theme: "dark", palette: "forest", image: "assets/tabora-background.png" },
  { id: "crimson-realm", name: "Crimson Realm", theme: "dark", palette: "crimson", image: "assets/crimson-realm.png" },
  { id: "none", name: "Default", theme: "light", palette: "light-default", image: "" },
  { id: "mist-valley", name: "Mist Valley", theme: "light", palette: "mist", image: "assets/mist-valley.png" },
  { id: "amber-voyager", name: "Amber Voyager", theme: "light", palette: "amber", image: "assets/amber-voyager.png" }
];

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
    const button = document.createElement("button");
    button.className = "page-tab";
    button.dataset.pageId = page.id;
    button.textContent = page.name;
    button.classList.toggle("active", page.id === activePage().id);
    nodes.pageTabs.append(button);
  }
}

function renderBoards() {
  const query = nodes.globalSearch.value.trim();
  const boards = activeBoards().filter((board) => boardMatches(board, query));
  nodes.boardGrid.innerHTML = "";
  const insertionIndex = Math.min(boardInsertionIndex, boards.length);
  for (let index = 0; index <= boards.length; index += 1) {
    if (!query && index === insertionIndex) nodes.boardGrid.append(createAddBoardTile());
    if (index < boards.length) nodes.boardGrid.append(createBoardCard(boards[index], query));
  }

  if (!query && !nodes.boardGrid.querySelector(".add-board-tile")) {
    nodes.boardGrid.append(createAddBoardTile());
  }

  if (!boards.length && query) {
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
    addTile.innerHTML = '<span class="add-circle"><span class="icon-plus"></span></span><strong>Add Board</strong>';
    return addTile;
}

function createBoardCard(board, query) {
  const card = document.createElement("article");
  card.className = "board-card";
  card.dataset.boardId = board.id;
  card.draggable = appState.settings.organizeMode;

  const header = document.createElement("header");
  header.className = "board-header";
  header.innerHTML = `
    <div class="board-title"><span class="drag-grip" aria-hidden="true">&#8942;&#8942;</span><h2></h2></div>
    <div class="board-actions">
      <button class="board-icon-button" data-add-link="${board.id}" title="Add link" aria-label="Add link"><span class="icon-link-plus"></span></button>
      <button class="board-icon-button" data-board-menu="${board.id}" title="Board options" aria-label="Board options">&vellip;</button>
    </div>`;
  setText(header, "h2", board.name);
  card.append(header);

  const list = document.createElement("div");
  list.className = "board-links";
  list.dataset.dropBoard = board.id;
  const normalizedQuery = query.toLowerCase();
  const links = ordered(board.links).filter((link) => !normalizedQuery || [link.title, link.url, link.note].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)));

  if (!links.length) {
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
  actions.innerHTML = `<button data-edit-link="${link.id}" data-board-id="${board.id}" title="Edit link" aria-label="Edit link">&#9998;</button><button data-delete-link="${link.id}" data-board-id="${board.id}" title="Delete link" aria-label="Delete link">&times;</button>`;
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

function showToast(message) {
  clearTimeout(toastTimer);
  nodes.toast.textContent = message;
  nodes.toast.hidden = false;
  toastTimer = setTimeout(() => { nodes.toast.hidden = true; }, 2800);
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
    { icon: "&#8599;", label: "Open all links", action: () => openBoard(board) },
    { icon: "+", label: "Add link", action: () => openLinkDialog(board.id) },
    { icon: "&#9998;", label: "Rename board", action: () => openBoardDialog(board) },
    { icon: "&#128203;", label: "Share / copy links", action: () => copyBoardLinks(board) }
  ];
  const otherPages = ordered(appState.pages).filter((page) => page.id !== board.pageId);
  for (const page of otherPages) {
    items.push({ icon: "&#8594;", label: `Move to ${page.name}`, action: async () => { await moveBoard(board.id, page.id); await refresh("Board moved"); } });
  }
  items.push({ separator: true }, { icon: "&#128465;", label: "Delete board", danger: true, action: async () => { await deleteBoard(board.id); await refresh("Board moved to Trash"); } });
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

async function refresh(message = "") {
  appState = await getTaboraState();
  render();
  if (message) showToast(message);
}

nodes.pageTabs.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-page-id]");
  if (!button) return;
  boardInsertionIndex = Number.MAX_SAFE_INTEGER;
  await setSetting("activePageId", button.dataset.pageId);
  await refresh();
});

nodes.pageTabs.addEventListener("contextmenu", (event) => {
  const button = event.target.closest("[data-page-id]");
  const page = appState.pages.find((item) => item.id === button?.dataset.pageId);
  if (!button || !page || page.protected) return;
  event.preventDefault();
  showContextMenu(button, [
    { icon: "&#9998;", label: "Rename page", action: async () => { const name = window.prompt("Page name", page.name); if (name) { await renamePage(page.id, name); await refresh("Page renamed"); } } },
    { separator: true },
    { icon: "&#128465;", label: "Delete page", danger: true, action: async () => { if (window.confirm(`Delete ${page.name} and move its boards to Trash?`)) { await deletePage(page.id); boardInsertionIndex = Number.MAX_SAFE_INTEGER; await refresh("Page deleted"); } } }
  ]);
});

document.querySelector("#addPageButton").addEventListener("click", () => {
  nodes.pageName.value = "";
  nodes.pageDialog.showModal();
  nodes.pageName.focus();
});

nodes.pageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!nodes.pageName.value.trim()) return;
  await addPage(nodes.pageName.value);
  nodes.pageName.value = "";
  nodes.pageDialog.close();
  await refresh("Page created");
});

nodes.boardGrid.addEventListener("click", async (event) => {
  const addBoardButton = event.target.closest("[data-add-board]");
  const addLinkButton = event.target.closest("[data-add-link]");
  const menuButton = event.target.closest("[data-board-menu]");
  const openButton = event.target.closest("[data-open-board]");
  const linkAnchor = event.target.closest("[data-open-link]");
  const editLinkButton = event.target.closest("[data-edit-link]");
  const deleteLinkButton = event.target.closest("[data-delete-link]");

  if (addBoardButton) openBoardDialog();
  if (addLinkButton) openLinkDialog(addLinkButton.dataset.addLink);
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
    const insertionIndex = Math.min(boardInsertionIndex, activeBoards().length);
    await addBoard(activePage().id, nodes.boardName.value, [], insertionIndex);
    boardInsertionIndex = insertionIndex + 1;
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

function toggleAppearancePanel() {
  nodes.appearancePanel.hidden = !nodes.appearancePanel.hidden;
  if (!nodes.appearancePanel.hidden) renderAppearancePanel();
}

document.querySelector("#wallpaperTool").addEventListener("click", toggleAppearancePanel);
document.querySelector("#settingsTool").addEventListener("click", () => {
  nodes.appearancePanel.hidden = true;
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
  if (!draggedItem || !targetBoard) return;
  if (draggedItem.type === "board") await reorderBoard(draggedItem.id, targetBoard.dataset.boardId);
  if (draggedItem.type === "link") {
    const targetLink = event.target.closest(".bookmark-row");
    await moveLink(draggedItem.id, draggedItem.boardId, targetBoard.dataset.boardId, targetLink?.dataset.linkId || null);
  }
  await refresh("Order updated");
});

let insertionFrame = null;
nodes.boardGrid.addEventListener("pointermove", (event) => {
  if (nodes.globalSearch.value || appState.settings.organizeMode || event.pointerType === "touch") return;
  cancelAnimationFrame(insertionFrame);
  insertionFrame = requestAnimationFrame(() => {
    const tile = nodes.boardGrid.querySelector(".add-board-tile");
    const cards = [...nodes.boardGrid.querySelectorAll(".board-card")];
    if (!tile || !cards.length) return;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const nearestRect = cards[nearestIndex].getBoundingClientRect();
    const withinRow = event.clientY >= nearestRect.top - 18 && event.clientY <= nearestRect.bottom + 18;
    const insertAfter = withinRow
      ? event.clientX >= nearestRect.left + nearestRect.width / 2
      : event.clientY >= nearestRect.top + nearestRect.height / 2;
    const nextIndex = Math.max(0, Math.min(nearestIndex + (insertAfter ? 1 : 0), cards.length));
    if (nextIndex === boardInsertionIndex) return;
    boardInsertionIndex = nextIndex;
    nodes.boardGrid.insertBefore(tile, cards[nextIndex] || null);
  });
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

function renderAppearancePanel() {
  document.querySelectorAll("[data-theme]").forEach((button) => button.classList.toggle("active", button.dataset.theme === appState.settings.theme));
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
  if (!currentIsAvailable && appState.settings.wallpaper !== "custom") await setSetting("wallpaper", "none");
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

document.querySelector("#wallpaperUpload").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 12 * 1024 * 1024) { showToast("Choose an image smaller than 12 MB"); return; }
  await saveWallpaperBlob(file);
  await setSetting("customWallpaperTheme", appState.settings.theme);
  await setSetting("wallpaper", "custom");
  await refresh("Custom wallpaper applied");
  await applyAppearance();
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
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("wallpapers", "readwrite");
    transaction.objectStore("wallpapers").put(blob, "custom");
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function getWallpaperBlob() {
  const database = await openWallpaperDatabase();
  const blob = await new Promise((resolve, reject) => {
    const request = database.transaction("wallpapers").objectStore("wallpapers").get("custom");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return blob;
}

async function applyAppearance() {
  const backdrop = document.querySelector("#dashboardBackdrop");
  const definition = WALLPAPERS.find((wallpaper) => wallpaper.id === appState.settings.wallpaper && wallpaper.theme === appState.settings.theme)
    || WALLPAPERS.find((wallpaper) => wallpaper.id === "none" && wallpaper.theme === appState.settings.theme);
  document.body.dataset.palette = appState.settings.wallpaper === "custom"
    ? (appState.settings.theme === "light" ? "light-default" : "dark-default")
    : definition.palette;
  if (customWallpaperUrl) { URL.revokeObjectURL(customWallpaperUrl); customWallpaperUrl = ""; }
  backdrop.className = `dashboard-backdrop wallpaper-${appState.settings.wallpaper}`;
  backdrop.style.backgroundImage = "";
  if (appState.settings.wallpaper === "custom") {
    const blob = await getWallpaperBlob();
    if (blob) { customWallpaperUrl = URL.createObjectURL(blob); backdrop.style.backgroundImage = `url("${customWallpaperUrl}")`; }
  }
}

document.querySelector("#skipOnboarding").addEventListener("click", async () => { await setSetting("onboardingComplete", true); await refresh(); });
document.addEventListener("click", (event) => { if (!event.target.closest("#contextMenu") && !event.target.closest("[data-board-menu]")) nodes.contextMenu.hidden = true; });
document.addEventListener("keydown", (event) => { if (event.key === "/" && !event.target.matches("input, textarea")) { event.preventDefault(); nodes.searchPanel.hidden = false; nodes.globalSearch.focus(); } });
chrome.storage.onChanged.addListener((changes) => { if (changes[TABORA_STORAGE_KEY]) init(); });
init();
