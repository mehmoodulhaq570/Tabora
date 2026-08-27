const TABORA_STORAGE_KEY = "taboraV2";
const TABORA_SCHEMA_VERSION = 2;

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultState() {
  return {
    schemaVersion: TABORA_SCHEMA_VERSION,
    pages: [{ id: "home", name: "Home", order: 0, protected: true }],
    boards: [],
    trash: [],
    settings: {
      activePageId: "home",
      theme: "dark",
      wallpaper: "digital-ocean",
      privacyMode: false,
      incognitoMode: false,
      organizeMode: false,
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
  state.trash = Array.isArray(state.trash) ? state.trash : [];
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
      starred: Boolean(session.starred),
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

async function updateTaboraState(updater) {
  const state = await getTaboraState();
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
      state.trash.unshift({ type: "board", value: board, deletedAt: Date.now() });
    }
    state.boards = state.boards.filter((board) => board.pageId !== pageId);
    state.pages = state.pages.filter((item) => item.id !== pageId);
    state.settings.activePageId = "home";
    return true;
  });
}

async function addBoard(pageId, name, links = [], insertAt = null) {
  return updateTaboraState((state) => {
    const page = state.pages.find((item) => item.id === pageId) || state.pages[0];
    const pageBoards = ordered(state.boards.filter((item) => item.pageId === page.id));
    const boardOrder = Number.isInteger(insertAt) ? Math.max(0, Math.min(insertAt, pageBoards.length)) : pageBoards.length;
    for (const item of pageBoards) {
      if ((item.order || 0) >= boardOrder) item.order += 1;
    }
    const board = {
      id: makeId("board"),
      pageId: page.id,
      name: cleanName(name, "New Board"),
      order: boardOrder,
      starred: false,
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
    state.settings.onboardingComplete = true;
    return board;
  });
}

async function renameBoard(boardId, name) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (board) board.name = cleanName(name, board.name);
  });
}

async function moveBoard(boardId, pageId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board || !state.pages.some((page) => page.id === pageId)) return;
    board.pageId = pageId;
    board.order = state.boards.filter((item) => item.pageId === pageId).length;
  });
}

async function deleteBoard(boardId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return;
    state.trash.unshift({ type: "board", value: structuredClone(board), deletedAt: Date.now() });
    state.boards = state.boards.filter((item) => item.id !== boardId);
  });
}

async function restoreTrashItem(index) {
  return updateTaboraState((state) => {
    const [item] = state.trash.splice(index, 1);
    if (!item || item.type !== "board") return;
    const board = item.value;
    if (!state.pages.some((page) => page.id === board.pageId)) board.pageId = "home";
    board.order = state.boards.filter((entry) => entry.pageId === board.pageId).length;
    state.boards.push(board);
  });
}

async function emptyTrash() {
  return updateTaboraState((state) => {
    state.trash = [];
  });
}

async function addLink(boardId, values) {
  const url = normalizeUrl(values.url);
  if (!url) return { state: await getTaboraState(), result: null };
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return null;
    const link = {
      id: makeId("link"),
      title: cleanName(values.title, getDomain(url)),
      url,
      favIconUrl: values.favIconUrl || "",
      note: String(values.note || "").trim().slice(0, 180),
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
    if (url) link.url = url;
    link.title = cleanName(values.title, link.title);
    link.note = String(values.note || "").trim().slice(0, 180);
  });
}

async function deleteLink(boardId, linkId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    if (board) board.links = board.links.filter((item) => item.id !== linkId);
  });
}

async function reorderBoard(boardId, beforeBoardId) {
  return updateTaboraState((state) => {
    const board = state.boards.find((item) => item.id === boardId);
    const target = state.boards.find((item) => item.id === beforeBoardId);
    if (!board || !target || board.pageId !== target.pageId || board.id === target.id) return;
    const list = ordered(state.boards.filter((item) => item.pageId === board.pageId && item.id !== board.id));
    const targetIndex = list.findIndex((item) => item.id === target.id);
    list.splice(targetIndex, 0, board);
    list.forEach((item, index) => { item.order = index; });
  });
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
  });
}

async function setSetting(key, value) {
  return updateTaboraState((state) => {
    state.settings[key] = value;
  });
}

async function saveCurrentWindowAsBoard(pageId, name) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const links = tabs
    .filter((tab) => normalizeUrl(tab.url))
    .map((tab) => ({ title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl || "" }));
  if (!links.length) return null;
  return addBoard(pageId, name || "Current Window", links);
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

function boardMatches(board, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  return [board.name, ...board.links.flatMap((link) => [link.title, link.url, link.note])]
    .some((value) => String(value || "").toLowerCase().includes(normalized));
}

function faviconNode(link) {
  if (link.favIconUrl) {
    const image = document.createElement("img");
    image.className = "favicon";
    image.src = link.favIconUrl;
    image.alt = "";
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
