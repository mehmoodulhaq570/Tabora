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
  boardIcon: document.querySelector("#boardIcon"),
  boardColor: document.querySelector("#boardColor"),
  boardSize: document.querySelector("#boardSize"),
  boardPinned: document.querySelector("#boardPinned"),
  editingBoardId: document.querySelector("#editingBoardId"),
  linkDialog: document.querySelector("#linkDialog"),
  linkForm: document.querySelector("#linkForm"),
  linkTitle: document.querySelector("#linkTitle"),
  linkUrl: document.querySelector("#linkUrl"),
  linkNote: document.querySelector("#linkNote"),
  linkBoardId: document.querySelector("#linkBoardId"),
  editingLinkId: document.querySelector("#editingLinkId"),
  deleteConfirmDialog: document.querySelector("#deleteConfirmDialog"),
  importDialog: document.querySelector("#importDialog"),
  textImportPanel: document.querySelector("#textImportPanel"),
  importText: document.querySelector("#importText"),
  importPreview: document.querySelector("#importPreview"),
  trashDialog: document.querySelector("#trashDialog"),
  trashList: document.querySelector("#trashList"),
  appearancePanel: document.querySelector("#appearancePanel"),
  settingsDialog: document.querySelector("#settingsDialog"),
  onboardingCard: document.querySelector("#onboardingCard"),
  onboardingProgress: document.querySelector("#onboardingProgress"),
  onboardingTitle: document.querySelector("#onboardingTitle"),
  onboardingDescription: document.querySelector("#onboardingDescription"),
  onboardingBack: document.querySelector("#onboardingBack"),
  onboardingAction: document.querySelector("#onboardingAction"),
  onboardingNext: document.querySelector("#onboardingNext"),
  toast: document.querySelector("#toast")
};

let appState = createDefaultState();
let draggedItem = null;
let customWallpaperUrl = "";
const wallpaperPreviewUrls = new Map();
let toastTimer = null;
let pendingImportGroups = [];
let boardInsertionPlacement = { column: 0, order: 0 };
let organizeSnapshot = null;
let organizeDropTarget = null;
const selectedOrganizeLinks = new Set();
let deleteConfirmationResolve = null;
let contextMenuTrigger = null;
let appliedAppearanceKey = "";
let searchRenderTimer = null;
let organizeDragFrame = null;
let pendingOrganizePointer = null;
let refreshTimer = null;
let refreshChain = Promise.resolve();
let pendingRefreshState = null;
let pendingRefreshAppearance = false;
let pendingRefreshMessage = "";
let pendingRefreshWaiters = [];
const boardCardCache = new Map();
let highlightedTourTarget = null;
let onboardingHasOpened = false;
let onboardingPositionFrame = null;

const ONBOARDING_STEPS = [
  {
    title: "Create your first board",
    description: "Boards keep related links together. Start by creating one for a project, topic, or routine.",
    target: () => nodes.boardGrid.querySelector("[data-add-board]"),
    actionLabel: "Create board",
    action: () => nodes.boardGrid.querySelector("[data-add-board]")?.click(),
    nextLabel: "Continue"
  },
  {
    title: "Save a useful link",
    description: "Use the link button on a board to save a website, note, or resource where you can find it again.",
    target: () => nodes.boardGrid.querySelector("[data-add-link]"),
    actionLabel: "Add link",
    action: () => nodes.boardGrid.querySelector("[data-add-link]")?.click(),
    nextLabel: "Continue"
  },
  {
    title: "Find anything quickly",
    description: "Search looks through board names, saved links, addresses, and notes from anywhere in your workspace.",
    target: () => searchTool,
    actionLabel: "Open search",
    action: () => openSearch(),
    nextLabel: "Finish"
  }
];

const ORGANIZE_TOOL_ICON = '<svg class="rail-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1"></rect><rect x="14" y="3" width="6" height="6" rx="1"></rect><rect x="3" y="14" width="6" height="6" rx="1"></rect><path d="m13.5 17 2.2 2.2 4.8-5"></path></svg>';
const ORGANIZE_DONE_ICON = '<svg class="rail-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"></path></svg>';
const PRIVACY_VISIBLE_ICON = '<svg class="rail-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.7"></circle></svg>';
const PRIVACY_HIDDEN_ICON = '<svg class="rail-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"></path><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8M6.3 6.3C3.9 8 2.5 12 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.4 4-1"></path><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path></svg>';

const WALLPAPERS = [
  { id: "none", name: "Default", theme: "dark", palette: "dark-default", image: "" },
  { id: "digital-ocean", name: "Digital Ocean", theme: "dark", palette: "forest", image: "assets/tabora-background.webp", thumbnail: "assets/wallpaper-thumbs/tabora-background.webp" },
  { id: "crimson-realm", name: "Crimson Realm", theme: "dark", palette: "crimson", image: "assets/crimson-realm.webp", thumbnail: "assets/wallpaper-thumbs/crimson-realm.webp" },
  { id: "aurora-station", name: "Aurora Station", theme: "dark", palette: "aurora", image: "assets/aurora-station.webp" },
  { id: "moonlit-garden", name: "Moonlit Garden", theme: "dark", palette: "garden", image: "assets/moonlit-garden.webp" },
  { id: "eclipse-forge", name: "Eclipse Forge", theme: "dark", palette: "eclipse", image: "assets/eclipse-forge.webp" },
  { id: "abyss-bloom", name: "Abyss Bloom", theme: "dark", palette: "abyss", image: "assets/abyss-bloom.webp" },
  { id: "neon-monsoon", name: "Neon Monsoon", theme: "dark", palette: "monsoon", image: "assets/neon-monsoon.webp" },
  { id: "none", name: "Default", theme: "light", palette: "light-default", image: "" },
  { id: "mist-valley", name: "Mist Valley", theme: "light", palette: "mist", image: "assets/mist-valley.webp", thumbnail: "assets/wallpaper-thumbs/mist-valley.webp" },
  { id: "amber-voyager", name: "Amber Voyager", theme: "light", palette: "amber", image: "assets/amber-voyager.webp", thumbnail: "assets/wallpaper-thumbs/amber-voyager.webp" },
  { id: "alpine-clear", name: "Alpine Clear", theme: "light", palette: "alpine", image: "assets/alpine-clear.webp" },
  { id: "coral-coast", name: "Coral Coast", theme: "light", palette: "coast", image: "assets/coral-coast.webp" },
  { id: "glass-horizon", name: "Glass Horizon", theme: "light", palette: "glass", image: "assets/glass-horizon.webp" },
  { id: "sakura-drift", name: "Sakura Drift", theme: "light", palette: "sakura", image: "assets/sakura-drift.webp" },
  { id: "arctic-prism", name: "Arctic Prism", theme: "light", palette: "arctic", image: "assets/arctic-prism.webp" }
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

const BOARD_ICONS = {
  folder: '<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3V6Z"></path></svg>',
  briefcase: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V4h8v3M3 12h18"></path></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4V4Z"></path><path d="M20 4h-4a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h4V4Z"></path></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"></path></svg>',
  code: '<svg viewBox="0 0 24 24"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"></path></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"></path></svg>'
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
  return ordered(appState.boards.filter((board) => board.pageId === activePage().id))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.order || 0) - (b.order || 0));
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
    options.setAttribute("aria-haspopup", "menu");
    options.setAttribute("aria-controls", "contextMenu");
    options.setAttribute("aria-expanded", "false");
    options.innerHTML = '<svg class="page-chevron-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"></path></svg>';
    item.append(button, options);
    nodes.pageTabs.append(item);
  }
}

function renderBoards() {
  const query = nodes.globalSearch.value.trim();
  const boards = activeBoards().filter((board) => boardMatches(board, query));
  nodes.boardGrid.querySelector(".search-empty")?.remove();
  nodes.boardGrid.querySelector(".add-board-tile")?.remove();
  nodes.boardGrid.querySelector(".organize-drop-indicator")?.remove();
  nodes.boardGrid.querySelector(".inline-board-form")?.remove();
  const columns = Array.from({ length: TABORA_BOARD_COLUMNS }, (_, columnIndex) => {
    let column = nodes.boardGrid.querySelector(`[data-board-column="${columnIndex}"]`);
    if (!column) {
      column = document.createElement("div");
      column.className = "board-column";
      column.dataset.boardColumn = String(columnIndex);
      nodes.boardGrid.append(column);
    }
    column.hidden = false;
    return column;
  });
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const cards = boards
      .filter((board) => board.column === columnIndex)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.columnOrder || 0) - (b.columnOrder || 0))
      .map((board) => {
        const signature = JSON.stringify([board, query, appState.settings.showBookmarkDescriptions, appState.settings.organizeMode]);
        const cached = boardCardCache.get(board.id);
        if (cached?.signature === signature) return cached.card;
        const card = createBoardCard(board, query);
        boardCardCache.set(board.id, { card, signature });
        return card;
      });
    columns[columnIndex].replaceChildren(...cards);
  }
  if (!query) nodes.boardGrid.append(createAddBoardTile());

  if (!boards.length && query) {
    columns.forEach((column) => { column.hidden = true; });
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.innerHTML = "<strong>No matching links</strong><span>Try a different title, domain, or URL.</span>";
    nodes.boardGrid.append(empty);
  }

  const currentBoardIds = new Set(appState.boards.map((board) => board.id));
  for (const boardId of boardCardCache.keys()) {
    if (!currentBoardIds.has(boardId)) boardCardCache.delete(boardId);
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
  card.classList.add(`board-size-${board.size || "medium"}`, `board-color-${board.color || "green"}`);
  card.classList.toggle("pinned", Boolean(board.pinned));
  card.dataset.boardId = board.id;
  card.dataset.column = String(board.column);
  card.dataset.columnOrder = String(board.columnOrder);
  card.draggable = appState.settings.organizeMode;

  const header = document.createElement("header");
  header.className = "board-header";
  header.innerHTML = `
    <div class="board-title"><svg class="drag-grip" viewBox="0 0 18 18" aria-hidden="true"><circle cx="5" cy="4" r="1"></circle><circle cx="13" cy="4" r="1"></circle><circle cx="5" cy="9" r="1"></circle><circle cx="13" cy="9" r="1"></circle><circle cx="5" cy="14" r="1"></circle><circle cx="13" cy="14" r="1"></circle></svg><span class="board-symbol">${BOARD_ICONS[board.icon] || BOARD_ICONS.folder}</span><h2></h2><span class="board-pin" aria-label="Pinned">${board.pinned ? "Pinned" : ""}</span></div>
    <div class="board-actions">
      <button class="board-icon-button" data-add-link="${board.id}" title="Add link" aria-label="Add link"><svg class="board-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a4.5 4.5 0 0 0 6.4.1l2-2a4.5 4.5 0 0 0-6.3-6.4l-1.2 1.2"></path><path d="M14 11a4.5 4.5 0 0 0-6.4-.1l-2 2a4.5 4.5 0 0 0 6.3 6.4l1.2-1.2"></path><path class="icon-accent" d="M19 16v5M16.5 18.5h5"></path></svg></button>
      <button class="board-icon-button" data-board-menu="${board.id}" title="Board options" aria-label="Board options" aria-haspopup="menu" aria-controls="contextMenu" aria-expanded="false"><svg class="board-action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
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
  row.classList.toggle("selected", selectedOrganizeLinks.has(`${board.id}:${link.id}`));

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
  if (link.health?.status && link.health.status !== "ok") {
    const health = document.createElement("i");
    health.className = `link-health link-health-${link.health.status}`;
    health.title = link.health.status === "redirected" ? "This link redirects" : "This link may be unavailable";
    copy.append(health);
  }
  anchor.append(copy);

  const actions = document.createElement("span");
  actions.className = "link-actions";
  actions.innerHTML = `<button data-share-link="${link.id}" data-board-id="${board.id}" title="Copy link" aria-label="Copy link"><svg class="link-action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="m8.3 10.9 7.4-4.4M8.3 13.1l7.4 4.4"></path></svg></button><button data-edit-link="${link.id}" data-board-id="${board.id}" title="Edit link" aria-label="Edit link"><svg class="link-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Z"></path><path d="m13.5 6.5 4 4"></path></svg></button><button data-delete-link="${link.id}" data-board-id="${board.id}" title="Delete link" aria-label="Delete link"><svg class="link-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"></path></svg></button>`;
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
  const privacyTool = document.querySelector("#privacyTool");
  privacyTool.classList.toggle("active", appState.settings.privacyMode);
  privacyTool.innerHTML = appState.settings.privacyMode ? PRIVACY_HIDDEN_ICON : PRIVACY_VISIBLE_ICON;
  privacyTool.title = appState.settings.privacyMode ? "Privacy Blur ON - Click to disable" : "Privacy Blur OFF - Click to enable";
  privacyTool.setAttribute("aria-label", privacyTool.title);
  const organizeTool = document.querySelector("#organizeTool");
  organizeTool.classList.toggle("active", appState.settings.organizeMode);
  organizeTool.innerHTML = appState.settings.organizeMode ? ORGANIZE_DONE_ICON : ORGANIZE_TOOL_ICON;
  document.querySelector("#incognitoTool").classList.toggle("active", appState.settings.incognitoMode);
  renderOrganizeToolbar();
}

function renderOrganizeToolbar() {
  const toolbar = document.querySelector("#organizeToolbar");
  const count = selectedOrganizeLinks.size;
  toolbar.hidden = !appState.settings.organizeMode;
  document.querySelector("#organizeSelectionCount").textContent = `${count} selected`;
  document.querySelector("#organizeDelete").disabled = count === 0;
}

function renderOnboarding() {
  if (appState.settings.onboardingComplete) {
    hideOnboardingCard();
    return;
  }

  let stepIndex = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, Number(appState.settings.onboardingStep) || 0));
  if (stepIndex === 0 && appState.boards.length) {
    stepIndex = 1;
    void setOnboardingStep(stepIndex);
  } else if (stepIndex === 1 && !appState.boards.length) {
    stepIndex = 0;
    void setOnboardingStep(stepIndex);
  }
  const step = ONBOARDING_STEPS[stepIndex];
  const target = step.target();
  const needsBoard = stepIndex === 0 && appState.boards.length === 0;

  clearOnboardingTarget();
  if (target) {
    target.classList.add("tour-target");
    highlightedTourTarget = target;
  }

  nodes.onboardingProgress.textContent = `Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`;
  nodes.onboardingTitle.textContent = step.title;
  nodes.onboardingDescription.textContent = step.description;
  nodes.onboardingBack.hidden = stepIndex === 0;
  nodes.onboardingAction.hidden = !target;
  nodes.onboardingAction.textContent = step.actionLabel;
  nodes.onboardingNext.textContent = step.nextLabel;
  nodes.onboardingNext.disabled = needsBoard;
  nodes.onboardingNext.title = needsBoard ? "Create a board to continue" : "";
  document.querySelectorAll(".onboarding-steps i").forEach((item, index) => item.classList.toggle("active", index <= stepIndex));

  nodes.onboardingCard.classList.add("is-open");
  if (typeof nodes.onboardingCard.showPopover === "function" && !nodes.onboardingCard.matches(":popover-open")) {
    nodes.onboardingCard.showPopover();
  }
  requestAnimationFrame(() => {
    positionOnboardingCard(target);
    if (!onboardingHasOpened) {
      onboardingHasOpened = true;
      (nodes.onboardingNext.disabled ? nodes.onboardingAction : nodes.onboardingNext).focus({ preventScroll: true });
    }
  });
}

function clearOnboardingTarget() {
  highlightedTourTarget?.classList.remove("tour-target");
  highlightedTourTarget = null;
}

function hideOnboardingCard() {
  clearOnboardingTarget();
  if (onboardingPositionFrame) cancelAnimationFrame(onboardingPositionFrame);
  onboardingPositionFrame = null;
  if (typeof nodes.onboardingCard.hidePopover === "function" && nodes.onboardingCard.matches(":popover-open")) {
    nodes.onboardingCard.hidePopover();
  }
  nodes.onboardingCard.classList.remove("is-open");
  nodes.onboardingCard.style.left = "";
  nodes.onboardingCard.style.top = "";
}

function positionOnboardingCard(target = highlightedTourTarget) {
  if (!nodes.onboardingCard.classList.contains("is-open")) return;
  const card = nodes.onboardingCard;
  const padding = 16;
  const cardRect = card.getBoundingClientRect();
  const width = cardRect.width;
  const height = cardRect.height;
  let left = Math.max(padding, (window.innerWidth - width) / 2);
  let top = Math.max(padding, window.innerHeight - height - 28);

  if (target?.isConnected) {
    const targetRect = target.getBoundingClientRect();
    left = targetRect.right + 16;
    if (left + width > window.innerWidth - padding) left = targetRect.left - width - 16;
    if (left < padding || left + width > window.innerWidth - padding) {
      left = Math.max(padding, Math.min(window.innerWidth - width - padding, targetRect.left));
      top = targetRect.bottom + 16;
    } else {
      top = targetRect.top;
    }
    top = Math.max(padding, Math.min(window.innerHeight - height - padding, top));
  }

  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(top)}px`;
}

function scheduleOnboardingPosition() {
  if (!nodes.onboardingCard.classList.contains("is-open")) return;
  if (onboardingPositionFrame) cancelAnimationFrame(onboardingPositionFrame);
  onboardingPositionFrame = requestAnimationFrame(() => {
    onboardingPositionFrame = null;
    positionOnboardingCard();
  });
}

async function setOnboardingStep(stepIndex) {
  await setSetting("onboardingStep", Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, stepIndex)));
  await refresh();
}

async function completeOnboarding() {
  await setSetting("onboardingComplete", true);
  await setSetting("onboardingStep", ONBOARDING_STEPS.length - 1);
  await refresh();
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

function requestDeleteConfirmation({ title, prompt, warning = "", caution = "This action cannot be undone.", compact = false, submitLabel = "Delete" }) {
  if (deleteConfirmationResolve) settleDeleteConfirmation(false);
  nodes.deleteConfirmDialog.classList.toggle("compact", compact);
  document.querySelector("#deleteConfirmTitle").textContent = title;
  document.querySelector("#deleteConfirmPrompt").textContent = prompt;
  const warningNode = document.querySelector("#deleteConfirmWarning");
  warningNode.textContent = warning;
  warningNode.hidden = !warning;
  const cautionNode = document.querySelector("#deleteConfirmCaution");
  cautionNode.textContent = caution;
  cautionNode.hidden = !caution;
  document.querySelector("#deleteConfirmSubmit").textContent = submitLabel;
  nodes.deleteConfirmDialog.showModal();
  return new Promise((resolve) => { deleteConfirmationResolve = resolve; });
}

function settleDeleteConfirmation(confirmed) {
  const resolve = deleteConfirmationResolve;
  deleteConfirmationResolve = null;
  if (nodes.deleteConfirmDialog.open) nodes.deleteConfirmDialog.close();
  resolve?.(confirmed);
}

document.querySelector("#deleteConfirmCancel").addEventListener("click", () => settleDeleteConfirmation(false));
document.querySelector("#deleteConfirmSubmit").addEventListener("click", () => settleDeleteConfirmation(true));
nodes.deleteConfirmDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  settleDeleteConfirmation(false);
});

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
  nodes.boardIcon.value = board?.icon || "folder";
  nodes.boardColor.value = board?.color || "green";
  nodes.boardSize.value = board?.size || "medium";
  nodes.boardPinned.checked = Boolean(board?.pinned);
  document.querySelector("#boardDialogTitle").textContent = board ? "Customize board" : "Add board";
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
    const added = await addLink(editor.dataset.boardId, {
      url: normalizedUrl,
      title: titleInput.value,
      note: noteInput.value,
      favIconUrl: metadata.favIconUrl
    });
    if (added.result?.duplicate) {
      submitButton.disabled = false;
      showToast(`Already saved in ${added.result.page?.name || "Home"} / ${added.result.board.name}`, "warning");
      return;
    }
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

function hideContextMenu({ restoreFocus = false } = {}) {
  nodes.contextMenu.hidden = true;
  if (contextMenuTrigger) {
    contextMenuTrigger.setAttribute("aria-expanded", "false");
    if (restoreFocus && contextMenuTrigger.isConnected) contextMenuTrigger.focus();
  }
  contextMenuTrigger = null;
}

function showContextMenu(anchor, items) {
  hideContextMenu();
  contextMenuTrigger = anchor;
  if (anchor.matches("[data-board-menu], [data-page-options]")) anchor.setAttribute("aria-expanded", "true");
  nodes.contextMenu.innerHTML = "";
  for (const item of items) {
    if (item.separator) {
      nodes.contextMenu.append(document.createElement("hr"));
      continue;
    }
    const button = document.createElement("button");
    button.className = item.danger ? "danger-menu-item" : "";
    button.setAttribute("role", "menuitem");
    button.tabIndex = -1;
    button.innerHTML = `<span>${item.icon || ""}</span><span></span>`;
    setText(button, "span:last-child", item.label);
    button.addEventListener("click", async () => {
      hideContextMenu();
      await item.action();
    });
    nodes.contextMenu.append(button);
  }
  nodes.contextMenu.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const width = 230;
  nodes.contextMenu.style.left = `${Math.min(rect.left, window.innerWidth - width - 16)}px`;
  nodes.contextMenu.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - nodes.contextMenu.offsetHeight - 16)}px`;
  const firstItem = nodes.contextMenu.querySelector('[role="menuitem"]');
  if (firstItem) {
    firstItem.tabIndex = 0;
    firstItem.focus({ preventScroll: true });
  }
}

nodes.contextMenu.addEventListener("keydown", (event) => {
  const items = [...nodes.contextMenu.querySelectorAll('[role="menuitem"]')];
  if (!items.length) return;
  const currentIndex = Math.max(0, items.indexOf(document.activeElement));
  let nextIndex = currentIndex;
  if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
  else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = items.length - 1;
  else if (event.key === "Escape") {
    event.preventDefault();
    hideContextMenu({ restoreFocus: true });
    return;
  } else if (event.key === "Tab") {
    hideContextMenu();
    return;
  } else return;

  event.preventDefault();
  items.forEach((item, index) => { item.tabIndex = index === nextIndex ? 0 : -1; });
  items[nextIndex].focus();
});

function boardMenuItems(board) {
  const items = [
    { icon: BOARD_MENU_ICONS.open, label: "Open all links", action: () => openBoard(board) },
    { icon: BOARD_MENU_ICONS.add, label: "Add link", action: () => openInlineLinkEditor(board.id) },
    { icon: PAGE_MENU_ICONS.rename, label: "Customize board", action: () => openBoardDialog(board) },
    { icon: BOARD_ICONS.star.replace("<svg", '<svg class="menu-icon"'), label: board.pinned ? "Unpin board" : "Pin board", action: async () => { await customizeBoard(board.id, { pinned: !board.pinned }); await refresh(board.pinned ? "Board unpinned" : "Board pinned"); } },
    { icon: PAGE_MENU_ICONS.share, label: "Share / copy links", action: () => copyBoardLinks(board) }
  ];
  const otherPages = ordered(appState.pages).filter((page) => page.id !== board.pageId);
  for (const page of otherPages) {
    items.push({ icon: BOARD_MENU_ICONS.move, label: `Move to ${page.name}`, action: async () => { await moveBoard(board.id, page.id); await refresh("Board moved"); } });
  }
  items.push({ separator: true }, { icon: PAGE_MENU_ICONS.delete, label: "Delete board", danger: true, action: async () => {
    const confirmed = await requestDeleteConfirmation({
      title: "Move to Trash",
      prompt: `Move "${board.name}" to trash?`,
      warning: `The board and its ${board.links.length} ${board.links.length === 1 ? "bookmark" : "bookmarks"} will be moved to trash. You can restore them within 30 days.`
    });
    if (!confirmed) return;
    await deleteBoard(board.id);
    await refresh("Board moved to Trash");
  } });
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
    const board = appState.boards.find((item) => item.links.some((candidate) => candidate.id === link.id));
    if (board) await recordLinkOpened(board.id, link.id);
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

async function writeClipboardText(text) {
  const value = String(text || "");
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch (error) {
    console.warn("Clipboard API unavailable, trying document copy", error);
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.append(textarea);
  let copied = false;
  try {
    textarea.focus();
    textarea.select();
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
  }
  if (!copied) throw new Error("Clipboard copy failed");
}

async function copyShareText(text, successMessage) {
  try {
    await writeClipboardText(text);
    showToast(successMessage);
    return true;
  } catch (error) {
    console.error("Could not copy shared content", error);
    showToast("Could not copy. Check Tabora clipboard permission.", "warning");
    return false;
  }
}

function boardShareText(board) {
  const links = ordered(board.links).map((link) => `${link.title} | ${link.url}`).join("\n");
  return `${board.name}\n${links}`.trim();
}

async function copyBoardLinks(board) {
  await copyShareText(boardShareText(board), "Board links copied");
}

async function copyPageLinks(page) {
  const boards = appState.boards
    .filter((board) => board.pageId === page.id)
    .sort((a, b) => a.column - b.column || a.columnOrder - b.columnOrder);
  const text = boards.map(boardShareText).join("\n\n");
  await copyShareText(text || page.name, "Page links copied");
}

async function copySingleLink(link) {
  await copyShareText(`${link.title} | ${link.url}`, "Link copied");
}

function pageMenuItems(page) {
  return [
    { icon: PAGE_MENU_ICONS.rename, label: "Rename", action: () => openPageDialog(page) },
    { icon: PAGE_MENU_ICONS.share, label: "Share Page", action: () => copyPageLinks(page) },
    { separator: true },
    { icon: PAGE_MENU_ICONS.delete, label: "Delete", danger: true, action: async () => {
      if (page.protected) { showToast("The Home page cannot be deleted"); return; }
      const boardCount = appState.boards.filter((board) => board.pageId === page.id).length;
      const confirmed = await requestDeleteConfirmation({
        title: `Delete "${page.name}"?`,
        prompt: `This will move the page and all ${boardCount} ${boardCount === 1 ? "board" : "boards"} to trash. You can restore them within 30 days.`,
        warning: "",
        caution: "",
        compact: true
      });
      if (!confirmed) return;
      await deletePage(page.id);
      boardInsertionPlacement = { column: 0, order: 0 };
      await refresh("Page deleted");
    } }
  ];
}

function queueRefresh({ message = "", state = null, appearance = false } = {}) {
  if (state) pendingRefreshState = state;
  if (message) pendingRefreshMessage = message;
  pendingRefreshAppearance ||= appearance;

  const promise = new Promise((resolve, reject) => pendingRefreshWaiters.push({ resolve, reject }));
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    const nextState = pendingRefreshState;
    const shouldApplyAppearance = pendingRefreshAppearance;
    const nextMessage = pendingRefreshMessage;
    const waiters = pendingRefreshWaiters;
    pendingRefreshState = null;
    pendingRefreshAppearance = false;
    pendingRefreshMessage = "";
    pendingRefreshWaiters = [];

    refreshChain = refreshChain.catch(() => {}).then(async () => {
      appState = nextState || await getTaboraState();
      if (shouldApplyAppearance) await applyAppearance();
      render();
      if (nextMessage) showToast(nextMessage);
    });
    refreshChain.then(
      () => waiters.forEach(({ resolve }) => resolve()),
      (error) => waiters.forEach(({ reject }) => reject(error))
    );
  }, 24);
  return promise;
}

function refresh(message = "", options = {}) {
  return queueRefresh({ message, appearance: Boolean(options.appearance) });
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
  const shareLinkButton = event.target.closest("[data-share-link]");
  const editLinkButton = event.target.closest("[data-edit-link]");
  const deleteLinkButton = event.target.closest("[data-delete-link]");

  if (appState.settings.organizeMode && linkAnchor) {
    event.preventDefault();
    const key = `${linkAnchor.dataset.boardId}:${linkAnchor.dataset.openLink}`;
    if (selectedOrganizeLinks.has(key)) selectedOrganizeLinks.delete(key);
    else selectedOrganizeLinks.add(key);
    linkAnchor.closest(".bookmark-row")?.classList.toggle("selected", selectedOrganizeLinks.has(key));
    renderOrganizeToolbar();
    return;
  }

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
  if (shareLinkButton) {
    const board = appState.boards.find((item) => item.id === shareLinkButton.dataset.boardId);
    const link = board?.links.find((item) => item.id === shareLinkButton.dataset.shareLink);
    if (link) await copySingleLink(link);
  }
  if (editLinkButton) {
    const board = appState.boards.find((item) => item.id === editLinkButton.dataset.boardId);
    const link = board?.links.find((item) => item.id === editLinkButton.dataset.editLink);
    if (link) openLinkDialog(board.id, link);
  }
  if (deleteLinkButton) {
    const board = appState.boards.find((item) => item.id === deleteLinkButton.dataset.boardId);
    const link = board?.links.find((item) => item.id === deleteLinkButton.dataset.deleteLink);
    if (!board || !link) return;
    const confirmed = await requestDeleteConfirmation({
      title: "Move to Trash",
      prompt: `Move "${link.title}" to trash?`,
      warning: "This bookmark will be moved to trash. You can restore it within 30 days."
    });
    if (!confirmed) return;
    await deleteLink(deleteLinkButton.dataset.boardId, deleteLinkButton.dataset.deleteLink);
    await refresh("Bookmark moved to Trash");
  }
});

nodes.boardForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!nodes.boardName.value.trim()) return;
  const editing = Boolean(nodes.editingBoardId.value);
  if (editing) await customizeBoard(nodes.editingBoardId.value, {
    name: nodes.boardName.value,
    icon: nodes.boardIcon.value,
    color: nodes.boardColor.value,
    size: nodes.boardSize.value,
    pinned: nodes.boardPinned.checked
  });
  else {
    const created = await addBoard(activePage().id, nodes.boardName.value, [], boardInsertionPlacement);
    await customizeBoard(created.result.id, {
      icon: nodes.boardIcon.value,
      color: nodes.boardColor.value,
      size: nodes.boardSize.value,
      pinned: nodes.boardPinned.checked
    });
    boardInsertionPlacement = { ...boardInsertionPlacement, order: boardInsertionPlacement.order + 1 };
  }
  nodes.boardDialog.close();
  await refresh(editing ? "Board updated" : "Board created");
});

nodes.linkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = { title: nodes.linkTitle.value, url: nodes.linkUrl.value, note: nodes.linkNote.value };
  if (!normalizeUrl(values.url)) { showToast("Enter a valid web address"); return; }
  const saved = nodes.editingLinkId.value
    ? await updateLink(nodes.linkBoardId.value, nodes.editingLinkId.value, values)
    : await addLink(nodes.linkBoardId.value, values);
  if (saved.result?.duplicate) {
    showToast(`Already saved in ${saved.result.page?.name || "Home"} / ${saved.result.board.name}`, "warning");
    return;
  }
  nodes.linkDialog.close();
  await refresh(nodes.editingLinkId.value ? "Link updated" : "Link added");
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => closeDialog(button.dataset.closeDialog));
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
});

const searchTool = document.querySelector("#searchTool");
const clearSearchButton = document.querySelector("#clearSearch");

function syncSearchState() {
  const isOpen = !nodes.searchPanel.hidden;
  document.body.classList.toggle("search-active", isOpen);
  searchTool.classList.toggle("active", isOpen);
  searchTool.setAttribute("aria-expanded", String(isOpen));
  clearSearchButton.hidden = !nodes.globalSearch.value;
}

function openSearch() {
  closeAppearancePanel();
  hideContextMenu();
  nodes.searchPanel.hidden = false;
  syncSearchState();
  nodes.globalSearch.focus({ preventScroll: true });
  requestAnimationFrame(() => nodes.globalSearch.focus({ preventScroll: true }));
}

function closeSearch() {
  if (nodes.searchPanel.hidden) return;
  if (searchRenderTimer) clearTimeout(searchRenderTimer);
  searchRenderTimer = null;
  nodes.searchPanel.hidden = true;
  nodes.globalSearch.value = "";
  syncSearchState();
  renderBoards();
}

searchTool.addEventListener("click", () => {
  if (nodes.searchPanel.hidden) openSearch();
  else closeSearch();
});
nodes.globalSearch.addEventListener("input", () => {
  syncSearchState();
  if (searchRenderTimer) clearTimeout(searchRenderTimer);
  searchRenderTimer = setTimeout(() => {
    searchRenderTimer = null;
    renderBoards();
  }, 140);
});
clearSearchButton.addEventListener("click", () => {
  if (searchRenderTimer) clearTimeout(searchRenderTimer);
  searchRenderTimer = null;
  nodes.globalSearch.value = "";
  syncSearchState();
  renderBoards();
  nodes.globalSearch.focus();
});

document.querySelector("#incognitoTool").addEventListener("click", async () => {
  await setSetting("incognitoMode", !appState.settings.incognitoMode);
  await refresh(appState.settings.incognitoMode ? "Private opening disabled" : "Private opening enabled");
});

async function finishOrganizeMode() {
  organizeSnapshot = null;
  organizeDropTarget = null;
  selectedOrganizeLinks.clear();
  await setSetting("organizeMode", false);
  await refresh("Organization saved");
}

async function cancelOrganizeMode() {
  if (organizeSnapshot) {
    organizeSnapshot.settings.organizeMode = false;
    await saveTaboraState(organizeSnapshot);
  } else {
    await setSetting("organizeMode", false);
  }
  organizeSnapshot = null;
  organizeDropTarget = null;
  selectedOrganizeLinks.clear();
  appState = await getTaboraState();
  render();
  showToast("Organization cancelled");
}

document.querySelector("#organizeTool").addEventListener("click", async () => {
  if (appState.settings.organizeMode) {
    await finishOrganizeMode();
    return;
  }
  organizeSnapshot = structuredClone(appState);
  selectedOrganizeLinks.clear();
  await setSetting("organizeMode", true);
  await refresh();
});

document.querySelector("#organizeDone").addEventListener("click", finishOrganizeMode);
document.querySelector("#organizeCancel").addEventListener("click", cancelOrganizeMode);
document.querySelector("#organizeDelete").addEventListener("click", async () => {
  if (!selectedOrganizeLinks.size) return;
  const selectedCount = selectedOrganizeLinks.size;
  const confirmed = await requestDeleteConfirmation({
    title: "Move to Trash",
    prompt: `Move ${selectedCount} selected ${selectedCount === 1 ? "bookmark" : "bookmarks"} to trash?`,
    warning: `${selectedCount === 1 ? "This bookmark" : "These bookmarks"} will be moved to trash. You can restore ${selectedCount === 1 ? "it" : "them"} within 30 days.`
  });
  if (!confirmed) return;
  await updateTaboraState((state) => {
    for (const board of state.boards) {
      const page = state.pages.find((item) => item.id === board.pageId);
      for (const link of board.links) {
        if (!selectedOrganizeLinks.has(`${board.id}:${link.id}`)) continue;
        state.trash.unshift({
          type: "link",
          value: structuredClone(link),
          boardId: board.id,
          boardName: board.name,
          pageId: board.pageId,
          pageName: page?.name || "Home",
          deletedAt: Date.now()
        });
      }
      board.links = board.links.filter((link) => !selectedOrganizeLinks.has(`${board.id}:${link.id}`));
      board.links.forEach((link, index) => { link.order = index; });
    }
  }, { undoLabel: "Bookmark deletion" });
  const deletedCount = selectedOrganizeLinks.size;
  selectedOrganizeLinks.clear();
  await refresh(`${deletedCount} ${deletedCount === 1 ? "bookmark" : "bookmarks"} deleted`);
});

document.querySelector("#privacyTool").addEventListener("click", async () => {
  await setSetting("privacyMode", !appState.settings.privacyMode);
  await refresh(appState.settings.privacyMode ? "Privacy blur disabled" : "Boards are now blurred");
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
document.querySelector("#trashTool").addEventListener("click", async () => {
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
  if (appState.trash.some((item) => item.deletedAt && item.deletedAt < cutoff)) {
    await updateTaboraState((state) => { state.trash = state.trash.filter((item) => !item.deletedAt || item.deletedAt >= cutoff); });
    await refresh();
  }
  renderTrash();
  nodes.trashDialog.showModal();
});

nodes.boardGrid.addEventListener("dragstart", (event) => {
  if (!appState.settings.organizeMode) return;
  const link = event.target.closest(".bookmark-row");
  const board = event.target.closest(".board-card");
  if (link) draggedItem = { type: "link", id: link.dataset.linkId, boardId: link.dataset.boardId };
  else if (board) draggedItem = { type: "board", id: board.dataset.boardId };
  event.dataTransfer.effectAllowed = "move";
  event.target.classList.add("dragging");
});

function clearOrganizeDropIndicator() {
  nodes.boardGrid.querySelector(".organize-drop-indicator")?.remove();
  organizeDropTarget = null;
}

function captureBoardRects() {
  return new Map([...nodes.boardGrid.querySelectorAll(".board-card")].map((card) => [card.dataset.boardId, card.getBoundingClientRect()]));
}

function animateBoardReflow(previousRects) {
  for (const card of nodes.boardGrid.querySelectorAll(".board-card")) {
    const previous = previousRects.get(card.dataset.boardId);
    if (!previous) continue;
    const current = card.getBoundingClientRect();
    const deltaX = previous.left - current.left;
    const deltaY = previous.top - current.top;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) continue;
    card.animate(
      [
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: "translate(0, 0)" }
      ],
      { duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
  }
}

function showOrganizeDropIndicator(event) {
  if (draggedItem?.type !== "board") { clearOrganizeDropIndicator(); return; }
  const columns = [...nodes.boardGrid.querySelectorAll("[data-board-column]")];
  const columnRects = new Map(columns.map((item) => [item, item.getBoundingClientRect()]));
  const column = event.target.closest("[data-board-column]") || columns.reduce((nearest, item) => {
    const rect = columnRects.get(item);
    const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
    return !nearest || distance < nearest.distance ? { item, distance } : nearest;
  }, null)?.item;
  if (!column) { clearOrganizeDropIndicator(); return; }

  const cards = [...column.querySelectorAll(".board-card:not(.dragging)")];
  const cardRects = cards.map((card) => ({ card, rect: card.getBoundingClientRect() }));
  const beforeEntry = cardRects.find(({ rect }) => event.clientY < rect.top + rect.height / 2) || null;
  const beforeCard = beforeEntry?.card || null;
  const gridRect = nodes.boardGrid.getBoundingClientRect();
  const columnRect = columnRects.get(column);
  const lastCardRect = cardRects.at(-1)?.rect;
  const top = beforeCard
    ? beforeEntry.rect.top - gridRect.top - 12
    : lastCardRect
      ? lastCardRect.bottom - gridRect.top + 12
      : columnRect.top - gridRect.top + 3;
  let indicator = nodes.boardGrid.querySelector(".organize-drop-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "organize-drop-indicator";
    nodes.boardGrid.append(indicator);
  }
  indicator.style.left = `${columnRect.left - gridRect.left}px`;
  indicator.style.top = `${top}px`;
  indicator.style.width = `${columnRect.width}px`;
  organizeDropTarget = {
    column: Number(column.dataset.boardColumn),
    beforeBoardId: beforeCard?.dataset.boardId || null
  };
}

nodes.boardGrid.addEventListener("dragend", (event) => {
  event.target.classList.remove("dragging");
  draggedItem = null;
  pendingOrganizePointer = null;
  if (organizeDragFrame) cancelAnimationFrame(organizeDragFrame);
  organizeDragFrame = null;
  clearOrganizeDropIndicator();
});
nodes.boardGrid.addEventListener("dragover", (event) => {
  if (!draggedItem) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  pendingOrganizePointer = { clientX: event.clientX, clientY: event.clientY, target: event.target };
  if (organizeDragFrame) return;
  organizeDragFrame = requestAnimationFrame(() => {
    organizeDragFrame = null;
    if (pendingOrganizePointer) showOrganizeDropIndicator(pendingOrganizePointer);
  });
});
nodes.boardGrid.addEventListener("drop", async (event) => {
  event.preventDefault();
  pendingOrganizePointer = null;
  if (organizeDragFrame) cancelAnimationFrame(organizeDragFrame);
  organizeDragFrame = null;
  const droppedItem = draggedItem;
  const previousBoardRects = captureBoardRects();
  const targetBoard = event.target.closest(".board-card");
  const targetColumn = event.target.closest("[data-board-column]");
  if (!droppedItem) return;
  if (droppedItem.type === "board" && organizeDropTarget?.beforeBoardId) await reorderBoard(droppedItem.id, organizeDropTarget.beforeBoardId);
  else if (droppedItem.type === "board" && organizeDropTarget) await moveBoardToColumn(droppedItem.id, organizeDropTarget.column);
  else if (droppedItem.type === "board" && targetBoard) await reorderBoard(droppedItem.id, targetBoard.dataset.boardId);
  else if (droppedItem.type === "board" && targetColumn) await moveBoardToColumn(droppedItem.id, Number(targetColumn.dataset.boardColumn));
  if (droppedItem.type === "link") {
    if (!targetBoard) return;
    const targetLink = event.target.closest(".bookmark-row");
    await moveLink(droppedItem.id, droppedItem.boardId, targetBoard.dataset.boardId, targetLink?.dataset.linkId || null);
  }
  clearOrganizeDropIndicator();
  await refresh();
  animateBoardReflow(previousBoardRects);
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
  nodes.trashList.replaceChildren();
  if (!appState.trash.length) {
    nodes.trashList.innerHTML = '<div class="dialog-empty">Trash is empty.</div>';
    return;
  }

  const groups = [
    { type: "link", label: "Bookmarks" },
    { type: "board", label: "Boards" }
  ];
  for (const groupDefinition of groups) {
    const items = appState.trash.map((item, index) => ({ item, index })).filter(({ item }) => item.type === groupDefinition.type);
    if (!items.length) continue;
    const group = document.createElement("section");
    group.className = "trash-group";
    const heading = document.createElement("h3");
    heading.textContent = groupDefinition.label;
    group.append(heading);
    for (const { item, index } of items) {
      const deletedAt = item.deletedAt || Date.now();
      const age = Date.now() - deletedAt;
      const remaining = Math.max(0, 30 - Math.floor(age / (24 * 60 * 60 * 1000)));
      const row = document.createElement("div");
      row.className = "trash-row";
      row.innerHTML = `
        <div class="trash-copy"><strong></strong><span class="trash-date"></span><span class="trash-location"></span></div>
        <div class="trash-row-actions"><button class="trash-restore-button" type="button" data-restore-index="${index}">Restore</button><button class="trash-delete-button" type="button" data-delete-trash-index="${index}">Delete</button></div>`;
      row.querySelector("strong").textContent = item.type === "link" ? item.value.title : item.value.name;
      row.querySelector(".trash-date").textContent = `Deleted ${new Date(deletedAt).toLocaleDateString()} · ${remaining} days remaining`;
      row.querySelector(".trash-location").textContent = item.type === "link"
        ? `Board: ${item.boardName || "Unknown"} · Page: ${item.pageName || "Home"}`
        : `${item.value.links?.length || 0} bookmarks · Page: ${item.pageName || "Home"}`;
      group.append(row);
    }
    nodes.trashList.append(group);
  }
}

nodes.trashList.addEventListener("click", async (event) => {
  const restoreButton = event.target.closest("[data-restore-index]");
  const deleteButton = event.target.closest("[data-delete-trash-index]");
  if (restoreButton) {
    const item = appState.trash[Number(restoreButton.dataset.restoreIndex)];
    await restoreTrashItem(Number(restoreButton.dataset.restoreIndex));
    await refresh(item?.type === "link" ? "Bookmark restored" : "Board restored");
    renderTrash();
  }
  if (deleteButton) {
    const index = Number(deleteButton.dataset.deleteTrashIndex);
    const item = appState.trash[index];
    if (!item) return;
    const itemName = item.type === "link" ? item.value.title : item.value.name;
    const confirmed = await requestDeleteConfirmation({
      title: "Permanently Delete",
      prompt: `Permanently delete "${itemName}" from trash? You cannot undo this action.`,
      warning: "",
      caution: "",
      compact: true,
      submitLabel: "Delete"
    });
    if (!confirmed) return;
    await deleteTrashItem(index);
    await refresh("Item permanently deleted");
    renderTrash();
  }
});

document.querySelector("#emptyTrash").addEventListener("click", async () => {
  if (!appState.trash.length) return;
  const confirmed = await requestDeleteConfirmation({
    title: "Empty Trash",
    prompt: "Permanently delete all items in trash? You cannot undo this action.",
    warning: "",
    caution: "",
    compact: true,
    submitLabel: "Empty Trash"
  });
  if (!confirmed) return;
  await emptyTrash();
  await refresh("Trash emptied");
  renderTrash();
});

async function renderAppearancePanel() {
  document.querySelectorAll("[data-theme]").forEach((button) => button.classList.toggle("active", button.dataset.theme === appState.settings.theme));
  const customWallpapers = await getCustomWallpapers();
  const customWallpaperIds = new Set(customWallpapers.map((wallpaper) => wallpaper.id));
  for (const [id, url] of wallpaperPreviewUrls) {
    if (!customWallpaperIds.has(id)) {
      URL.revokeObjectURL(url);
      wallpaperPreviewUrls.delete(id);
    }
  }
  const customSection = document.querySelector("#yourWallpapersSection");
  const customGrid = document.querySelector("#yourWallpaperGrid");
  customSection.hidden = customWallpapers.length === 0;
  document.querySelector("#yourWallpaperCount").textContent = String(customWallpapers.length);
  customGrid.innerHTML = "";
  for (const wallpaper of customWallpapers) {
    let url = wallpaperPreviewUrls.get(wallpaper.id);
    if (!url) {
      url = URL.createObjectURL(wallpaper.blob);
      wallpaperPreviewUrls.set(wallpaper.id, url);
    }
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
    if (wallpaper.image) {
      const thumbnail = wallpaper.thumbnail || wallpaper.image.replace("assets/", "assets/wallpaper-thumbs/");
      button.style.backgroundImage = `url("${thumbnail}")`;
    }
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

document.querySelector("#moreWallpapers").addEventListener("click", () => showToast("More original Tabora themes are coming next"));

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
  const appearanceKey = `${appState.settings.theme}:${appState.settings.wallpaper}`;
  if (appearanceKey === appliedAppearanceKey) return;
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
  appliedAppearanceKey = appearanceKey;
}

document.querySelector("#skipOnboarding").addEventListener("click", () => { void completeOnboarding(); });
nodes.onboardingBack.addEventListener("click", () => {
  void setOnboardingStep((Number(appState.settings.onboardingStep) || 0) - 1);
});
nodes.onboardingAction.addEventListener("click", () => {
  const stepIndex = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, Number(appState.settings.onboardingStep) || 0));
  ONBOARDING_STEPS[stepIndex].action();
});
nodes.onboardingNext.addEventListener("click", () => {
  const stepIndex = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, Number(appState.settings.onboardingStep) || 0));
  if (stepIndex === ONBOARDING_STEPS.length - 1) {
    void completeOnboarding();
    return;
  }
  void setOnboardingStep(stepIndex + 1);
});
nodes.onboardingCard.addEventListener("toggle", (event) => {
  if (event.newState === "closed") nodes.onboardingCard.classList.remove("is-open");
});
window.addEventListener("resize", scheduleOnboardingPosition);
window.addEventListener("scroll", scheduleOnboardingPosition, { passive: true });
document.addEventListener("click", (event) => {
  if (!event.target.closest("#contextMenu") && !event.target.closest("[data-board-menu]") && !event.target.closest("[data-page-options]")) hideContextMenu();
  if (!event.target.closest("#appearancePanel") && !event.target.closest("#wallpaperTool")) closeAppearancePanel();
  if (!event.target.closest("#searchPanel") && !event.target.closest("#searchTool")) closeSearch();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !nodes.contextMenu.hidden) { event.preventDefault(); hideContextMenu({ restoreFocus: true }); return; }
  if (event.key === "Escape" && !nodes.searchPanel.hidden) { event.preventDefault(); closeSearch(); return; }
  if (event.key === "Escape" && nodes.onboardingCard.classList.contains("is-open")) { event.preventDefault(); void completeOnboarding(); return; }
  if (event.key === "/" && !event.target.matches("input, textarea")) { event.preventDefault(); openSearch(); }
});
chrome.storage.onChanged.addListener((changes) => {
  const change = changes[TABORA_STORAGE_KEY];
  if (!change?.newValue) return;
  const nextState = normalizeState(change.newValue);
  const appearanceChanged = nextState.settings.theme !== appState.settings.theme
    || nextState.settings.wallpaper !== appState.settings.wallpaper;
  void queueRefresh({ state: nextState, appearance: appearanceChanged })
    .catch((error) => console.error("Tabora could not refresh after a storage change", error));
});
init();
