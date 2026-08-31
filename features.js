const featureNodes = {
  dialog: document.querySelector("#featureDialog"),
  recent: document.querySelector("#recentActivity"),
  organizeResults: document.querySelector("#organizeResults"),
  moodList: document.querySelector("#moodList"),
  graph: document.querySelector("#knowledgeGraph"),
  vaultPage: document.querySelector("#vaultPage"),
  vaultList: document.querySelector("#vaultList"),
  roomCode: document.querySelector("#roomCode")
};

const SMART_CATEGORIES = [
  { name: "Development", match: /github|gitlab|stackoverflow|developer|docs|npm|code|programming|vercel|netlify/i },
  { name: "Videos", match: /youtube|vimeo|netflix|video|stream|movie/i },
  { name: "Shopping", match: /amazon|ebay|shop|store|product|cart|etsy/i },
  { name: "Social", match: /facebook|instagram|linkedin|reddit|twitter|x\.com|threads|discord/i },
  { name: "Reading", match: /medium|substack|article|blog|news|wikipedia/i },
  { name: "Productivity", match: /notion|trello|asana|calendar|drive|docs|slack|zoom/i }
];

function formatFeatureTime(timestamp) {
  const elapsed = Date.now() - timestamp;
  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function featureRow(title, meta, actions = []) {
  const row = document.createElement("article");
  row.className = "feature-list-row";
  const copy = document.createElement("span");
  copy.className = "feature-row-copy";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const small = document.createElement("small");
  small.textContent = meta;
  copy.append(strong, small);
  const controls = document.createElement("span");
  controls.className = "feature-row-actions";
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.className = action.danger ? "danger" : "";
    button.addEventListener("click", action.run);
    controls.append(button);
  }
  row.append(copy, controls);
  return row;
}

async function renderFeatureCenter() {
  appState = await getTaboraState();
  await renderUndoStatus();
  renderRecentActivity();
  renderMoods();
  renderVaults();
  renderVaultPages();
  renderKnowledgeGraph();
}

async function openFeatureCenter(view = "overview") {
  document.querySelectorAll("[data-feature-view]").forEach((button) => button.classList.toggle("active", button.dataset.featureView === view));
  document.querySelectorAll("[data-feature-section]").forEach((section) => section.classList.toggle("active", section.dataset.featureSection === view));
  featureNodes.dialog.showModal();
  await renderFeatureCenter();
}

async function renderUndoStatus() {
  const snapshot = await getUndoSnapshot();
  const button = document.querySelector("#featureUndo");
  button.disabled = !snapshot;
  document.querySelector("#featureUndoLabel").textContent = snapshot ? snapshot.label : "Nothing to undo";
}

function renderRecentActivity() {
  featureNodes.recent.replaceChildren();
  if (!appState.recentlyOpened.length) {
    featureNodes.recent.innerHTML = '<div class="feature-empty">No recently opened bookmarks.</div>';
    return;
  }
  for (const item of appState.recentlyOpened.slice(0, 20)) {
    featureNodes.recent.append(featureRow(item.title, `${item.pageName} / ${item.boardName} · ${formatFeatureTime(item.openedAt)}`, [{
      label: "Open",
      run: async () => chrome.tabs.create({ url: item.url })
    }]));
  }
}

function categorizeLink(link) {
  const source = `${link.title} ${link.url} ${link.note || ""}`;
  return SMART_CATEGORIES.find((category) => category.match.test(source))?.name || "Other";
}

async function checkAllLinks() {
  const links = appState.boards.flatMap((board) => board.links.map((link) => ({ board, link })));
  featureNodes.organizeResults.innerHTML = '<div class="feature-progress"><span></span><strong>Checking links...</strong></div>';
  const results = [];
  async function checkEntry(entry) {
    if (entry.link.url.startsWith("http:")) return { ...entry, health: { status: "insecure", checkedAt: Date.now(), finalUrl: entry.link.url } };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      let response = await fetch(entry.link.url, { method: "HEAD", redirect: "follow", cache: "no-store", signal: controller.signal });
      if (response.status === 405) response = await fetch(entry.link.url, { method: "GET", redirect: "follow", cache: "no-store", signal: controller.signal });
      return { ...entry, health: { status: !response.ok ? "broken" : response.url !== entry.link.url ? "redirected" : "ok", code: response.status, finalUrl: response.url, checkedAt: Date.now() } };
    } catch {
      return { ...entry, health: { status: "broken", code: 0, finalUrl: entry.link.url, checkedAt: Date.now() } };
    } finally {
      clearTimeout(timeout);
    }
  }
  for (let index = 0; index < links.length; index += 6) {
    results.push(...await Promise.all(links.slice(index, index + 6).map(checkEntry)));
  }
  await updateTaboraState((state) => {
    for (const result of results) {
      const link = state.boards.find((board) => board.id === result.board.id)?.links.find((item) => item.id === result.link.id);
      if (link) link.health = result.health;
    }
  });
  appState = await getTaboraState();
  featureNodes.organizeResults.replaceChildren();
  const problemLinks = results.filter((result) => result.health.status !== "ok");
  if (!problemLinks.length) featureNodes.organizeResults.innerHTML = '<div class="feature-empty">All checked links are healthy.</div>';
  for (const result of problemLinks) {
    const meta = result.health.status === "redirected" ? `Redirects to ${getDomain(result.health.finalUrl)}` : result.health.status === "insecure" ? "Uses an insecure HTTP address" : "Could not be reached";
    featureNodes.organizeResults.append(featureRow(result.link.title, meta, result.health.status === "redirected" ? [{
      label: "Update",
      run: async () => {
        await updateLink(result.board.id, result.link.id, { ...result.link, url: result.health.finalUrl });
        await refresh("Bookmark URL updated");
        await renderFeatureCenter();
      }
    }] : []));
  }
  await refresh(`${links.length} links checked`);
}

async function smartOrganizeCurrentPage() {
  const page = activePage();
  const sourceBoards = appState.boards.filter((board) => board.pageId === page.id);
  const counts = new Map();
  for (const board of sourceBoards) for (const link of board.links) counts.set(categorizeLink(link), (counts.get(categorizeLink(link)) || 0) + 1);
  if (!counts.size) { showToast("No bookmarks to organize", "warning"); return; }
  const summary = [...counts].map(([name, count]) => `${name}: ${count}`).join(" · ");
  const confirmed = await requestDeleteConfirmation({
    title: "Smart Organization",
    prompt: summary,
    warning: "Bookmarks will be regrouped into category boards. Empty boards will remain available.",
    caution: "You can undo this change.",
    submitLabel: "Organize"
  });
  if (!confirmed) return;
  await updateTaboraState((state) => {
    const boards = state.boards.filter((board) => board.pageId === page.id);
    const categorized = boards.flatMap((board) => board.links.map((link) => ({ link, category: categorizeLink(link) })));
    for (const board of boards) board.links = [];
    for (const [category] of counts) {
      let target = boards.find((board) => board.name.toLowerCase() === category.toLowerCase());
      if (!target) {
        const column = state.boards.filter((board) => board.pageId === page.id).length % TABORA_BOARD_COLUMNS;
        target = { id: makeId("board"), pageId: page.id, name: category, order: state.boards.length, column, columnOrder: state.boards.filter((board) => board.pageId === page.id && board.column === column).length, pinned: false, color: "green", icon: "folder", size: "medium", createdAt: Date.now(), links: [] };
        state.boards.push(target);
      }
      target.links = categorized.filter((item) => item.category === category).map((item, index) => ({ ...item.link, order: index }));
    }
  }, { undoLabel: "Smart organization" });
  await refresh("Page organized");
  await renderFeatureCenter();
}

function renderMoods() {
  featureNodes.moodList.replaceChildren();
  if (!appState.moods.length) featureNodes.moodList.innerHTML = '<div class="feature-empty">No mood spaces saved.</div>';
  for (const mood of appState.moods) {
    featureNodes.moodList.append(featureRow(mood.name, `${appState.pages.find((page) => page.id === mood.pageId)?.name || "Home"} · ${mood.theme}`, [
      { label: "Apply", run: async () => applyMood(mood.id) },
      { label: "Delete", danger: true, run: async () => { await updateTaboraState((state) => { state.moods = state.moods.filter((item) => item.id !== mood.id); }); await renderFeatureCenter(); } }
    ]));
  }
}

async function applyMood(moodId) {
  await updateTaboraState((state) => {
    const mood = state.moods.find((item) => item.id === moodId);
    if (!mood) return;
    state.settings.activeMoodId = mood.id;
    state.settings.activePageId = state.pages.some((page) => page.id === mood.pageId) ? mood.pageId : "home";
    state.settings.theme = mood.theme;
    state.settings.wallpaper = mood.wallpaper;
    state.settings.privacyMode = mood.privacyMode;
    state.settings.incognitoMode = mood.incognitoMode;
  }, { undoLabel: "Mood change" });
  await refresh("Mood space applied");
  await applyAppearance();
  await renderFeatureCenter();
}

function renderKnowledgeGraph() {
  featureNodes.graph.replaceChildren();
  const page = activePage();
  const boards = appState.boards.filter((board) => board.pageId === page.id).slice(0, 12);
  if (!boards.length) { featureNodes.graph.innerHTML = '<div class="feature-empty">Add boards to build a knowledge graph.</div>'; return; }
  const domains = [...new Set(boards.flatMap((board) => board.links.map((link) => getDomain(link.url))))].slice(0, 16);
  const map = document.createElement("div");
  map.className = "graph-map";
  const pageNode = document.createElement("strong");
  pageNode.className = "graph-node graph-page-node";
  pageNode.textContent = page.name;
  map.append(pageNode);
  for (const board of boards) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "graph-node graph-board-node";
    node.textContent = board.name;
    node.addEventListener("click", () => { featureNodes.dialog.close(); nodes.globalSearch.value = board.name; renderBoards(); });
    map.append(node);
  }
  for (const domain of domains) {
    const node = document.createElement("span");
    node.className = "graph-node graph-domain-node";
    node.textContent = domain;
    map.append(node);
  }
  featureNodes.graph.append(map);
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveVaultKey(password, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 180000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptWithPassword(value, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(password, salt);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { salt: bytesToBase64(salt), iv: bytesToBase64(iv), cipher: bytesToBase64(new Uint8Array(cipher)) };
}

async function decryptWithPassword(value, password) {
  const key = await deriveVaultKey(password, base64ToBytes(value.salt));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(value.iv) }, key, base64ToBytes(value.cipher));
  return JSON.parse(new TextDecoder().decode(plain));
}

function renderVaultPages() {
  featureNodes.vaultPage.replaceChildren();
  for (const page of ordered(appState.pages).filter((item) => !item.protected)) {
    const option = document.createElement("option");
    option.value = page.id;
    option.textContent = page.name;
    featureNodes.vaultPage.append(option);
  }
  document.querySelector("#vaultForm").querySelector("button").disabled = !featureNodes.vaultPage.options.length;
}

function renderVaults() {
  featureNodes.vaultList.replaceChildren();
  if (!appState.vaults.length) featureNodes.vaultList.innerHTML = '<div class="feature-empty">No locked pages.</div>';
  for (const vault of appState.vaults) {
    const row = featureRow("Encrypted page", `Locked ${formatFeatureTime(vault.createdAt)}`);
    const controls = row.querySelector(".feature-row-actions");
    const password = document.createElement("input");
    password.type = "password";
    password.placeholder = "Password";
    password.className = "vault-unlock-input";
    const unlock = document.createElement("button");
    unlock.type = "button";
    unlock.textContent = "Unlock";
    unlock.addEventListener("click", async () => {
      try {
        const payload = await decryptWithPassword(vault, password.value);
        await updateTaboraState((state) => {
          state.pages.push(payload.page);
          state.boards.push(...payload.boards);
          state.vaults = state.vaults.filter((item) => item.id !== vault.id);
          state.settings.activePageId = payload.page.id;
        });
        await refresh("Private page unlocked");
        await renderFeatureCenter();
      } catch {
        showToast("Incorrect vault password", "warning");
      }
    });
    controls.append(password, unlock);
    featureNodes.vaultList.append(row);
  }
}

async function createRoomPackage() {
  const page = structuredClone(activePage());
  const boards = structuredClone(appState.boards.filter((board) => board.pageId === page.id));
  const password = bytesToBase64(crypto.getRandomValues(new Uint8Array(18)));
  const encrypted = await encryptWithPassword({ page, boards, expiresAt: Date.now() + 86_400_000 }, password);
  const packageValue = `TABORA1.${password}.${btoa(JSON.stringify(encrypted))}`;
  featureNodes.roomCode.value = packageValue;
  await copyShareText(packageValue, "Room package copied");
}

async function joinRoomPackage() {
  try {
    const [prefix, password, encoded] = featureNodes.roomCode.value.trim().split(".");
    if (prefix !== "TABORA1" || !password || !encoded) throw new Error("Invalid package");
    const encrypted = JSON.parse(atob(encoded));
    const payload = await decryptWithPassword(encrypted, password);
    if (payload.expiresAt < Date.now()) throw new Error("Expired package");
    await updateTaboraState((state) => {
      const pageId = makeId("page");
      state.pages.push({ id: pageId, name: cleanName(`${payload.page?.name || "Shared"} Room`, "Shared Room"), protected: false, order: state.pages.length });
      for (const [index, board] of (Array.isArray(payload.boards) ? payload.boards : []).slice(0, 100).entries()) {
        const column = Math.max(0, Math.min(TABORA_BOARD_COLUMNS - 1, Number(board.column) || index % TABORA_BOARD_COLUMNS));
        const links = (Array.isArray(board.links) ? board.links : []).slice(0, 500).map((link, linkIndex) => ({
          id: makeId("link"),
          title: cleanName(link.title, getDomain(link.url)),
          url: normalizeUrl(link.url),
          favIconUrl: normalizeUrl(link.favIconUrl) || "",
          note: String(link.note || "").slice(0, 2000),
          order: linkIndex
        })).filter((link) => link.url);
        state.boards.push({
          id: makeId("board"),
          pageId,
          name: cleanName(board.name, `Shared Board ${index + 1}`),
          order: index,
          column,
          columnOrder: state.boards.filter((item) => item.pageId === pageId && item.column === column).length,
          pinned: Boolean(board.pinned),
          color: ["green", "blue", "amber", "rose", "violet", "slate"].includes(board.color) ? board.color : "green",
          icon: ["folder", "briefcase", "book", "star", "code", "spark"].includes(board.icon) ? board.icon : "folder",
          size: ["small", "medium", "large"].includes(board.size) ? board.size : "medium",
          createdAt: Date.now(),
          links
        });
      }
      state.settings.activePageId = pageId;
    }, { undoLabel: "Room import" });
    featureNodes.roomCode.value = "";
    featureNodes.dialog.close();
    await refresh("Room joined");
  } catch (error) {
    showToast(error.message === "Expired package" ? "This room package has expired" : "Enter a valid Tabora room package", "warning");
  }
}

document.querySelector("#featureTool").addEventListener("click", () => openFeatureCenter());
document.querySelectorAll("[data-feature-view]").forEach((button) => button.addEventListener("click", async () => {
  document.querySelectorAll("[data-feature-view]").forEach((item) => item.classList.toggle("active", item === button));
  document.querySelectorAll("[data-feature-section]").forEach((section) => section.classList.toggle("active", section.dataset.featureSection === button.dataset.featureView));
  if (button.dataset.featureView === "knowledge") renderKnowledgeGraph();
}));

document.querySelector("#featureSaveSession").addEventListener("click", async () => {
  const date = new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const result = await saveCurrentWindowAsBoard(activePage().id, `Session · ${date}`);
  if (!result?.board) { showToast(result?.duplicateCount ? "All open tabs are already saved" : "No browser tabs are available to save", "warning"); return; }
  featureNodes.dialog.close();
  await refresh(result.duplicateCount ? `Session saved · ${result.duplicateCount} duplicates skipped` : "Current session saved");
});

document.querySelector("#featureUndo").addEventListener("click", async () => {
  const label = await undoLastAction();
  if (!label) return;
  featureNodes.dialog.close();
  await refresh(`${label} undone`);
  await applyAppearance();
});

document.querySelector("#checkLinks").addEventListener("click", async () => {
  try {
    const granted = await chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] });
    if (!granted) {
      showToast("Site access is required to check bookmark health", "warning");
      return;
    }
    await checkAllLinks();
  } catch (error) {
    console.error("Tabora link permission request failed", error);
    showToast("Could not request site access", "warning");
  }
});
document.querySelector("#smartOrganize").addEventListener("click", smartOrganizeCurrentPage);

document.querySelector("#moodForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#moodName").value.trim();
  if (!name) return;
  await updateTaboraState((state) => {
    state.moods.push({ id: makeId("mood"), name: cleanName(name, "New Mood"), pageId: state.settings.activePageId, theme: state.settings.theme, wallpaper: state.settings.wallpaper, privacyMode: state.settings.privacyMode, incognitoMode: state.settings.incognitoMode, createdAt: Date.now() });
  });
  document.querySelector("#moodName").value = "";
  await renderFeatureCenter();
  showToast("Mood space saved");
});

document.querySelector("#vaultForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const pageId = featureNodes.vaultPage.value;
  const password = document.querySelector("#vaultPassword").value;
  const page = appState.pages.find((item) => item.id === pageId);
  if (!page || password.length < 8) return;
  const boards = appState.boards.filter((board) => board.pageId === pageId);
  const encrypted = await encryptWithPassword({ page, boards }, password);
  await chrome.storage.local.remove(TABORA_UNDO_KEY);
  await updateTaboraState((state) => {
    state.vaults.push({ id: makeId("vault"), createdAt: Date.now(), ...encrypted });
    state.pages = state.pages.filter((item) => item.id !== pageId);
    state.boards = state.boards.filter((board) => board.pageId !== pageId);
    state.settings.activePageId = "home";
  });
  document.querySelector("#vaultPassword").value = "";
  await refresh("Page locked in private vault");
  await renderFeatureCenter();
});

document.querySelector("#createRoom").addEventListener("click", createRoomPackage);
document.querySelector("#joinRoom").addEventListener("click", joinRoomPackage);

document.addEventListener("keydown", async (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.target.matches("input, textarea, select")) {
    event.preventDefault();
    const label = await undoLastAction();
    if (label) { await refresh(`${label} undone`); await applyAppearance(); }
  }
});
