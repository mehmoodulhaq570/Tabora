const captureName = document.querySelector("#captureName");
const capturePage = document.querySelector("#capturePage");
const targetBoard = document.querySelector("#targetBoard");
const popupSearch = document.querySelector("#popupSearch");
const recentBoards = document.querySelector("#recentBoards");
const popupStatus = document.querySelector("#popupStatus");

let popupState = createDefaultState();
let popupWallpaperUrl = "";

const POPUP_APPEARANCES = {
  "digital-ocean": ["forest", "assets/tabora-background.png"],
  "crimson-realm": ["crimson", "assets/crimson-realm.png"],
  "aurora-station": ["aurora", "assets/aurora-station.webp"],
  "moonlit-garden": ["garden", "assets/moonlit-garden.webp"],
  "eclipse-forge": ["eclipse", "assets/eclipse-forge.webp"],
  "abyss-bloom": ["abyss", "assets/abyss-bloom.webp"],
  "neon-monsoon": ["monsoon", "assets/neon-monsoon.webp"],
  "mist-valley": ["mist", "assets/mist-valley.png"],
  "amber-voyager": ["amber", "assets/amber-voyager.png"],
  "alpine-clear": ["alpine", "assets/alpine-clear.webp"],
  "coral-coast": ["coast", "assets/coral-coast.webp"],
  "glass-horizon": ["glass", "assets/glass-horizon.webp"],
  "sakura-drift": ["sakura", "assets/sakura-drift.webp"],
  "arctic-prism": ["arctic", "assets/arctic-prism.webp"]
};

function showPopupStatus(message, warning = false) {
  popupStatus.textContent = message;
  popupStatus.classList.toggle("warning", warning);
  popupStatus.hidden = false;
  setTimeout(() => { popupStatus.hidden = true; }, 3200);
}

async function initPopup() {
  popupState = await getTaboraState();
  await applyPopupAppearance();
  renderSelectors();
  renderRecentBoards();
}

async function applyPopupAppearance() {
  const { theme, wallpaper } = popupState.settings;
  const appearance = POPUP_APPEARANCES[wallpaper];
  document.body.classList.toggle("light-theme", theme === "light");
  document.body.dataset.palette = appearance?.[0] || `${theme}-default`;

  if (popupWallpaperUrl) {
    URL.revokeObjectURL(popupWallpaperUrl);
    popupWallpaperUrl = "";
  }

  let image = appearance?.[1] ? chrome.runtime.getURL(appearance[1]) : "";
  if (wallpaper.startsWith("custom")) {
    try {
      const blob = await getWallpaperBlob(wallpaper);
      if (blob) {
        popupWallpaperUrl = URL.createObjectURL(blob);
        image = popupWallpaperUrl;
      }
    } catch {
      image = "";
    }
  }
  document.body.style.setProperty("--popup-wallpaper", image ? `url("${image}")` : "none");
}

function renderSelectors() {
  const selectedPage = capturePage.value || popupState.settings.activePageId;
  capturePage.innerHTML = "";
  for (const page of ordered(popupState.pages)) {
    const option = document.createElement("option");
    option.value = page.id;
    option.textContent = page.name;
    capturePage.append(option);
  }
  capturePage.value = popupState.pages.some((page) => page.id === selectedPage) ? selectedPage : popupState.pages[0].id;

  targetBoard.innerHTML = "";
  for (const board of ordered(popupState.boards)) {
    const page = popupState.pages.find((item) => item.id === board.pageId);
    const option = document.createElement("option");
    option.value = board.id;
    option.textContent = `${page?.name || "Home"} / ${board.name}`;
    targetBoard.append(option);
  }
  document.querySelector("#addCurrentTab").disabled = !popupState.boards.length;
}

function renderRecentBoards() {
  const query = popupSearch.value;
  const boards = [...popupState.boards]
    .filter((board) => boardMatches(board, query))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 6);
  recentBoards.innerHTML = "";

  if (!boards.length) {
    recentBoards.innerHTML = '<div class="popup-empty">No boards match your search.</div>';
    return;
  }

  for (const board of boards) {
    const row = document.createElement("article");
    row.className = "popup-board-row";
    row.innerHTML = `<span></span><div class="popup-board-copy"><strong></strong><span></span></div><button class="popup-open-button" data-open-board="${board.id}">Open all</button>`;
    setText(row, "strong", board.name);
    const page = popupState.pages.find((item) => item.id === board.pageId);
    setText(row, ".popup-board-copy span", `${page?.name || "Home"} · ${board.links.length} links`);
    recentBoards.append(row);
  }
}

document.querySelector("#saveWindow").addEventListener("click", async () => {
  const saved = await saveCurrentWindowAsBoard(capturePage.value, captureName.value || "Current Window");
  if (!saved?.board) { showPopupStatus(saved?.duplicateCount ? "All open tabs are already saved" : "No tabs are available to save", true); return; }
  captureName.value = "";
  showPopupStatus(saved.duplicateCount ? `Session saved · ${saved.duplicateCount} duplicates skipped` : "Session saved");
  await initPopup();
});

document.querySelector("#addCurrentTab").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !normalizeUrl(tab.url) || !targetBoard.value) return;
  const added = await addLink(targetBoard.value, { title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl || "" });
  if (added.result?.duplicate) {
    showPopupStatus(`Already saved in ${added.result.page?.name || "Home"} / ${added.result.board.name}`, true);
    return;
  }
  showPopupStatus("Tab saved");
  await initPopup();
});

document.querySelector("#openDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

recentBoards.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-open-board]");
  if (!button) return;
  const board = popupState.boards.find((item) => item.id === button.dataset.openBoard);
  if (board) await openLinks(ordered(board.links), popupState.settings.incognitoMode);
});

popupSearch.addEventListener("input", renderRecentBoards);
chrome.storage.onChanged.addListener(initPopup);
initPopup();
