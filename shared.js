const TABORA_STORAGE_KEY = "taboraV2";
const TABORA_UNDO_KEY = "taboraUndo";
const TABORA_SCHEMA_VERSION = 4;
const TABORA_BOARD_COLUMNS = 4;

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultState() {
  return {
    schemaVersion: TABORA_SCHEMA_VERSION,
    pages: [{ id: "home", name: "Home", order: 0, protected: true }],
    boards: [],
    trash: [],
    recentlyOpened: [],
    moods: [],
    vaults: [],
    settings: {
      activePageId: "home",
      theme: "dark",
      wallpaper: "digital-ocean",
      privacyMode: false,
      incognitoMode: false,
      organizeMode: false,
      compactMode: true,
      groupRightTools: false,
      hideExtraBookmarks: false,
      shortenLongTitles: true,
      openLinksInNewTab: false,
      showBookmarkDescriptions: true,
      closeTabsAfterSaveAll: false,
      quickSaveDestination: "current-page",
      language: "en",
      activeMoodId: "",
      onboardingComplete: false
    }
  };
}

function normalizeState(value) {
  const fallback = createDefaultState();
  const state = value && typeof value === "object" ? value : fallback;
  state.schemaVersion = TABORA_SCHEMA_VERSION;
  state.pages = Array.isArray(state.pages) && state.pages.length ? state.pages : fallback.pages;
  state.boards = Array.isArray(state.boards) ? state.boards : [];
  for (const board of state.boards) {
    board.color = board.color || "green";
    board.icon = board.icon || "folder";
    board.size = ["small", "medium", "large"].includes(board.size) ? board.size : "medium";
    board.pinned = Boolean(board.pinned || board.starred);
    board.links = Array.isArray(board.links) ? board.links : [];
    for (const link of board.links) {
      link.health = link.health && typeof link.health === "object" ? link.health : null;
    }
  }
  const boardsByPage = new Map(state.pages.map((page) => [page.id, []]));
  for (const board of state.boards) {
    boardsByPage.get(board.pageId)?.push(board);
  }
  for (const page of state.pages) {
    const pageBoards = (boardsByPage.get(page.id) || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    pageBoards.forEach((board, index) => {
      if (!Number.isInteger(board.column)) board.column = index % TABORA_BOARD_COLUMNS;
      board.column = Math.max(0, Math.min(TABORA_BOARD_COLUMNS - 1, board.column));
      if (!Number.isInteger(board.columnOrder)) {
        board.columnOrder = pageBoards.slice(0, index).filter((item) => item.column === board.column).length;
      }
    });
    for (let column = 0; column < TABORA_BOARD_COLUMNS; column += 1) {
      pageBoards
        .filter((board) => board.column === column)
        .sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0) || (a.order || 0) - (b.order || 0))
        .forEach((board, index) => { board.columnOrder = index; });
    }
  }
  state.trash = Array.isArray(state.trash) ? state.trash : [];
  state.recentlyOpened = Array.isArray(state.recentlyOpened) ? state.recentlyOpened.slice(0, 50) : [];
  state.moods = Array.isArray(state.moods) ? state.moods : [];
  state.vaults = Array.isArray(state.vaults) ? state.vaults : [];
  state.settings = { ...fallback.settings, ...(state.settings || {}) };
  if (!state.pages.some((page) => page.id === state.settings.activePageId)) {
    state.settings.activePageId = state.pages[0].id;
  }
  return state;
}

function migrateV1Data(sessions = [], workspaces = []) {
  const state = createDefaultState();
  const workspacePageIds = new Map();

  for (const [index, workspace] of workspaces.entries()) {
    const page = {
      id: workspace.id || makeId("page"),
      name: workspace.name || `Page ${index + 1}`,
      order: index + 1,
      protected: false
    };
    state.pages.push(page);
    workspacePageIds.set(workspace.id, page.id);
  }

  for (const [index, session] of sessions.entries()) {
    const pageId = workspacePageIds.get(session.workspaceId) || "home";
    state.boards.push({
      id: session.id || makeId("board"),
      pageId,
      name: session.name || "Imported session",
      order: state.boards.filter((board) => board.pageId === pageId).length,
      column: index % TABORA_BOARD_COLUMNS,
      columnOrder: Math.floor(index / TABORA_BOARD_COLUMNS),
      starred: Boolean(session.starred),
      pinned: Boolean(session.starred),
      color: "green",
      icon: "folder",
      size: "medium",
      createdAt: session.createdAt || Date.now() + index,
      links: (session.tabs || []).map((tab, linkIndex) => ({
        id: makeId(`link-${linkIndex}`),
        title: tab.title || tab.url || "Untitled link",
        url: tab.url || "",
        favIconUrl: tab.favIconUrl || "",
        note: "",
        order: linkIndex
      }))
    });
  }

  state.settings.onboardingComplete = state.boards.length > 0;
  return state;
}

async function getTaboraState() {
  const data = await chrome.storage.local.get([
    TABORA_STORAGE_KEY,
    "taboraSessions",
    "taboraWorkspaces"
  ]);

  if (data[TABORA_STORAGE_KEY]) return normalizeState(data[TABORA_STORAGE_KEY]);

  const state = migrateV1Data(data.taboraSessions || [], data.taboraWorkspaces || []);
  await chrome.storage.local.set({
    [TABORA_STORAGE_KEY]: state,
    taboraV1Backup: {
      sessions: data.taboraSessions || [],
      workspaces: data.taboraWorkspaces || [],
      migratedAt: Date.now()
    },
    taboraNeedsMigration: false
  });
  return state;
}

async function saveTaboraState(state) {
  const normalized = normalizeState(state);
  await chrome.storage.local.set({ [TABORA_STORAGE_KEY]: normalized });
  return normalized;
}

async function saveUndoSnapshot(state, label = "Last change") {
  const snapshot = structuredClone(state);
  snapshot.settings.organizeMode = false;
  await chrome.storage.local.set({ [TABORA_UNDO_KEY]: { label, state: snapshot, savedAt: Date.now() } });
}

async function getUndoSnapshot() {
  const data = await chrome.storage.local.get(TABORA_UNDO_KEY);
  return data[TABORA_UNDO_KEY] || null;
}

async function undoLastAction() {
  const snapshot = await getUndoSnapshot();
  if (!snapshot?.state) return null;
  await saveTaboraState(snapshot.state);
  await chrome.storage.local.remove(TABORA_UNDO_KEY);
  return snapshot.label;
}

async function updateTaboraState(updater, options = {}) {
  const state = await getTaboraState();
  if (options.undoLabel) await saveUndoSnapshot(state, options.undoLabel);
  const result = await updater(state);
  await saveTaboraState(state);
  return { state, result };
}

function ordered(items) {
  return [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function cleanName(value, fallback) {
  return String(value || "").trim().slice(0, 60) || fallback;
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function getDomain(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Invalid URL";
  }
}

async function addPage(name) {
  return updateTaboraState((state) => {
    const page = {
      id: makeId("page"),
      name: cleanName(name, "New Page"),
      order: state.pages.length,
      protected: false
    };
    state.pages.push(page);
    state.settings.activePageId = page.id;
    return page;
  });
}

async function renamePage(pageId, name) {
  return updateTaboraState((state) => {
    const page = state.pages.find((item) => item.id === pageId);
    if (page) page.name = cleanName(name, page.name);
  });
}

async function deletePage(pageId) {
  return updateTaboraState((state) => {
    const page = state.pages.find((item) => item.id === pageId);
    if (!page || page.protected) return false;
    const removedBoards = state.boards.filter((board) => board.pageId === pageId);
    for (const board of removedBoards) {
      state.trash.unshift({ type: "board", value: board, pageName: page.name, deletedAt: Date.now() });
    }
    state.boards = state.boards.filter((board) => board.pageId !== pageId);
    state.pages = state.pages.filter((item) => item.id !== pageId);
    state.settings.activePageId = "home";
    return true;
  }, { undoLabel: "Page deletion" });
}

async function addBoard(pageId, name, links = [], placement = null) {
  return updateTaboraState((state) => {
    const page = state.pages.find((item) => item.id === pageId) || state.pages[0];
    const pageBoards = ordered(state.boards.filter((item) => item.pageId === page.id));
    const isFirstBoard = pageBoards.length === 0;
    const requestedColumn = isFirstBoard ? 0 : typeof placement === "object" && placement !== null ? placement.column : pageBoards.length % TABORA_BOARD_COLUMNS;
    const column = Math.max(0, Math.min(TABORA_BOARD_COLUMNS - 1, Number(requestedColumn) || 0));
    const columnBoards = pageBoards.filter((item) => item.column === column).sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
    const requestedOrder = isFirstBoard ? 0 : typeof placement === "object" && placement !== null ? placement.order : columnBoards.length;
    const columnOrder = Math.max(0, Math.min(Number(requestedOrder) || 0, columnBoards.length));
    for (const item of columnBoards) {
      if ((item.columnOrder || 0) >= columnOrder) item.columnOrder += 1;
    }
    const board = {
      id: makeId("board"),
      pageId: page.id,
      name: cleanName(name, "New Board"),
      order: pageBoards.length,
      column,
      columnOrder,
      starred: false,
      pinned: false,
      color: "green",
      icon: "folder",
      size: "medium",
      createdAt: Date.now(),
      links: links.map((link, index) => ({
        id: link.id || makeId("link"),
        title: cleanName(link.title, getDomain(link.url)),
        url: normalizeUrl(link.url),
        favIconUrl: link.favIconUrl || "",
        note: link.note || "",
        order: index
      })).filter((link) => link.url)
    };
    state.boards.push(board);
    return board;
  });
}

async function renameBoard(boardId, name) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (board) board.name = cleanName(name, board.name);
  });
}

async function customizeBoard(boardId, values = {}) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return null;
    if (values.name !== undefined) board.name = cleanName(values.name, board.name);
    if (["green", "blue", "amber", "rose", "violet", "slate"].includes(values.color)) board.color = values.color;
    if (["folder", "briefcase", "book", "star", "code", "spark"].includes(values.icon)) board.icon = values.icon;
    if (["small", "medium", "large"].includes(values.size)) board.size = values.size;
    if (values.pinned !== undefined) board.pinned = Boolean(values.pinned);
    return board;
  }, { undoLabel: "Board customization" });
}

async function moveBoard(boardId, pageId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board || !state.pages.some((page) => page.id === pageId)) return;
    board.pageId = pageId;
    board.order = state.boards.filter((item) => item.pageId === pageId).length;
    const destinationBoards = state.boards.filter((item) => item.pageId === pageId && item.id !== board.id);
    board.column = destinationBoards.length % TABORA_BOARD_COLUMNS;
    board.columnOrder = destinationBoards.filter((item) => item.column === board.column).length;
  }, { undoLabel: "Board move" });
}

async function deleteBoard(boardId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return;
    const page = state.pages.find((item) => item.id === board.pageId);
    state.trash.unshift({ type: "board", value: structuredClone(board), pageName: page?.name || "Home", deletedAt: Date.now() });
    state.boards = state.boards.filter((item) => item.id !== boardId);
  }, { undoLabel: "Board deletion" });
}

async function restoreTrashItem(index) {
  return updateTaboraState((state) => {
    const [item] = state.trash.splice(index, 1);
    if (!item) return;
    if (item.type === "link") {
      let board = state.boards.find((entry) => entry.id === item.boardId);
      if (!board) {
        const pageId = state.pages.some((page) => page.id === item.pageId) ? item.pageId : "home";
        const pageBoards = state.boards.filter((entry) => entry.pageId === pageId);
        board = {
          id: makeId("board"),
          pageId,
          name: cleanName(item.boardName, "Restored bookmarks"),
          order: pageBoards.length,
          column: pageBoards.length % TABORA_BOARD_COLUMNS,
          columnOrder: pageBoards.filter((entry) => entry.column === pageBoards.length % TABORA_BOARD_COLUMNS).length,
          starred: false,
          pinned: false,
          color: "green",
          icon: "folder",
          size: "medium",
          createdAt: Date.now(),
          links: []
        };
        state.boards.push(board);
      }
      const link = structuredClone(item.value);
      link.order = board.links.length;
      board.links.push(link);
      return;
    }
    if (item.type !== "board") return;
    const board = item.value;
    if (!state.pages.some((page) => page.id === board.pageId)) board.pageId = "home";
    board.order = state.boards.filter((entry) => entry.pageId === board.pageId).length;
    const destinationBoards = state.boards.filter((entry) => entry.pageId === board.pageId);
    board.column = destinationBoards.length % TABORA_BOARD_COLUMNS;
    board.columnOrder = destinationBoards.filter((entry) => entry.column === board.column).length;
    state.boards.push(board);
  });
}

async function emptyTrash() {
  return updateTaboraState((state) => {
    state.trash = [];
  });
}

async function deleteTrashItem(index) {
  return updateTaboraState((state) => {
    state.trash.splice(index, 1);
  });
}

async function addLink(boardId, values) {
  const url = normalizeUrl(values.url);
  if (!url) return { state: await getTaboraState(), result: null };
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return null;
    const duplicate = findDuplicateLink(state, url);
    if (duplicate) return { duplicate: true, ...duplicate };
    const link = {
      id: makeId("link"),
      title: cleanName(values.title, getDomain(url)),
      url,
      favIconUrl: values.favIconUrl || "",
      note: String(values.note || "").trim().slice(0, 2000),
      order: board.links.length
    };
    board.links.push(link);
    return link;
  });
}

async function updateLink(boardId, linkId, values) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    const link = board?.links.find((item) => item.id === linkId);
    if (!link) return;
    const url = normalizeUrl(values.url);
    const duplicate = url ? findDuplicateLink(state, url, linkId) : null;
    if (duplicate) return { duplicate: true, ...duplicate };
    if (url) link.url = url;
    link.title = cleanName(values.title, link.title);
    link.note = String(values.note || "").trim().slice(0, 2000);
    if (Object.hasOwn(values, "favIconUrl")) link.favIconUrl = values.favIconUrl || "";
  });
}

async function deleteLink(boardId, linkId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    const link = board?.links.find((item) => item.id === linkId);
    if (!board || !link) return;
    const page = state.pages.find((item) => item.id === board.pageId);
    state.trash.unshift({
      type: "link",
      value: structuredClone(link),
      boardId: board.id,
      boardName: board.name,
      pageId: board.pageId,
      pageName: page?.name || "Home",
      deletedAt: Date.now()
    });
    board.links = board.links.filter((item) => item.id !== linkId);
    board.links.forEach((item, index) => { item.order = index; });
  }, { undoLabel: "Bookmark deletion" });
}

function findDuplicateLink(state, value, excludeLinkId = "") {
  const url = normalizeUrl(value);
  if (!url) return null;
  for (const board of state.boards) {
    const link = board.links.find((item) => item.id !== excludeLinkId && normalizeUrl(item.url) === url);
    if (!link) continue;
    const page = state.pages.find((item) => item.id === board.pageId);
    return { link, board, page };
  }
  return null;
}

async function recordLinkOpened(boardId, linkId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    const link = board?.links.find((item) => item.id === linkId);
    if (!board || !link) return;
    const page = state.pages.find((item) => item.id === board.pageId);
    state.recentlyOpened = state.recentlyOpened.filter((item) => item.linkId !== linkId);
    state.recentlyOpened.unshift({
      linkId,
      boardId,
      pageId: board.pageId,
      title: link.title,
      url: link.url,
      boardName: board.name,
      pageName: page?.name || "Home",
      openedAt: Date.now()
    });
    state.recentlyOpened = state.recentlyOpened.slice(0, 50);
  });
}

async function setLinkHealth(boardId, linkId, health) {
  return updateTaboraState((state) => {
    const link = state.boards.find((board) => board.id === boardId)?.links.find((item) => item.id === linkId);
    if (link) link.health = health;
  });
}

async function reorderBoard(boardId, beforeBoardId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    const target = state.boards.find((item) => item.id === beforeBoardId);
    if (!board || !target || board.pageId !== target.pageId || board.id === target.id) return;
    const sourceColumn = board.column;
    const list = state.boards
      .filter((item) => item.pageId === board.pageId && item.column === target.column && item.id !== board.id)
      .sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
    const targetIndex = list.findIndex((item) => item.id === target.id);
    list.splice(targetIndex, 0, board);
    board.column = target.column;
    list.forEach((item, index) => { item.columnOrder = index; });
    state.boards
      .filter((item) => item.pageId === board.pageId && item.column === sourceColumn && item.id !== board.id)
      .sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0))
      .forEach((item, index) => { item.columnOrder = index; });
  }, { undoLabel: "Board reorder" });
}

async function moveBoardToColumn(boardId, column) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return;
    const sourceColumn = board.column;
    const destinationColumn = Math.max(0, Math.min(TABORA_BOARD_COLUMNS - 1, Number(column) || 0));
    const destination = state.boards.filter((item) => item.pageId === board.pageId && item.column === destinationColumn && item.id !== board.id);
    board.column = destinationColumn;
    board.columnOrder = destination.length;
    state.boards
      .filter((item) => item.pageId === board.pageId && item.column === sourceColumn && item.id !== board.id)
      .sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0))
      .forEach((item, index) => { item.columnOrder = index; });
  }, { undoLabel: "Board move" });
}

async function moveLink(linkId, fromBoardId, toBoardId, beforeLinkId = null) {
  return updateTaboraState((state) => {
    const source = state.boards.find((board) => board.id === fromBoardId);
    const target = state.boards.find((board) => board.id === toBoardId);
    const link = source?.links.find((item) => item.id === linkId);
    if (!source || !target || !link) return;
    source.links = source.links.filter((item) => item.id !== linkId);
    const targetLinks = ordered(target.links.filter((item) => item.id !== linkId));
    const targetIndex = beforeLinkId ? targetLinks.findIndex((item) => item.id === beforeLinkId) : targetLinks.length;
    targetLinks.splice(targetIndex < 0 ? targetLinks.length : targetIndex, 0, link);
    source.links.forEach((item, index) => { item.order = index; });
    target.links = targetLinks.map((item, index) => ({ ...item, order: index }));
  }, { undoLabel: "Bookmark move" });
}

async function setSetting(key, value) {
  return updateTaboraState((state) => {
    state.settings[key] = value;
  });
}

async function saveCurrentWindowAsBoard(pageId, name) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const savableTabs = tabs.filter((tab) => normalizeUrl(tab.url));
  const state = await getTaboraState();
  const existingUrls = new Set(state.boards.flatMap((board) => board.links.map((link) => normalizeUrl(link.url))));
  const seenUrls = new Set(existingUrls);
  const uniqueTabs = savableTabs.filter((tab) => {
    const url = normalizeUrl(tab.url);
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
  const links = uniqueTabs
    .map((tab) => ({ title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl || "" }));
  const duplicateCount = savableTabs.length - uniqueTabs.length;
  if (!links.length) return { board: null, duplicateCount };
  const board = await addBoard(pageId, name || "Current Window", links);
  const latestState = await getTaboraState();
  if (latestState.settings.closeTabsAfterSaveAll && uniqueTabs.length) {
    await chrome.tabs.remove(uniqueTabs.map((tab) => tab.id));
  }
  return { board: board.result, duplicateCount };
}

async function openLinks(links, incognito = false) {
  const urls = links.map((link) => normalizeUrl(link.url)).filter(Boolean);
  if (!urls.length) return;
  if (incognito) {
    await chrome.windows.create({ url: urls, incognito: true, focused: true });
    return;
  }
  for (const [index, url] of urls.entries()) {
    await chrome.tabs.create({ url, active: index === 0 });
  }
}

const boardSearchTextCache = new WeakMap();

function boardMatches(board, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  let searchText = boardSearchTextCache.get(board);
  if (!searchText) {
    searchText = [board.name, ...board.links.flatMap((link) => [link.title, link.url, link.note])]
      .map((value) => String(value || "").toLowerCase())
      .join("\n");
    boardSearchTextCache.set(board, searchText);
  }
  return searchText.includes(normalized);
}

function faviconNode(link) {
  if (link.favIconUrl) {
    const image = document.createElement("img");
    image.className = "favicon";
    image.src = link.favIconUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    return image;
  }
  const fallback = document.createElement("span");
  fallback.className = "favicon fallback";
  fallback.textContent = (link.title || getDomain(link.url) || "?").slice(0, 1).toUpperCase();
  return fallback;
}

function setText(parent, selector, value) {
  const node = parent.querySelector(selector);
  if (node) node.textContent = value;
}
