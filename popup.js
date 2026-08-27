const captureName = document.querySelector("#captureName");
const capturePage = document.querySelector("#capturePage");
const targetBoard = document.querySelector("#targetBoard");
const popupSearch = document.querySelector("#popupSearch");
const recentBoards = document.querySelector("#recentBoards");

let popupState = createDefaultState();

async function initPopup() {
  popupState = await getTaboraState();
  renderSelectors();
  renderRecentBoards();
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
  if (!saved) return;
  captureName.value = "";
  await initPopup();
});

document.querySelector("#addCurrentTab").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !normalizeUrl(tab.url) || !targetBoard.value) return;
  await addLink(targetBoard.value, { title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl || "" });
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
