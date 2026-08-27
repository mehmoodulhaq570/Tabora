const V2_KEY = "taboraV2";

importScripts("shared.js");

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(V2_KEY);
  if (data[V2_KEY]) return;

  // The full V1 migration runs in shared.js when the new-tab page first opens.
  await chrome.storage.local.set({ taboraNeedsMigration: true });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "quick-save") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !normalizeUrl(tab.url)) return;

  const state = await getTaboraState();
  const pageId = state.settings.quickSaveDestination === "home"
    ? "home"
    : state.settings.activePageId;
  let board = state.boards.find((item) => item.pageId === pageId && item.name === "Quick Saves");
  if (!board) {
    const created = await addBoard(pageId, "Quick Saves");
    board = created.result;
  }
  await addLink(board.id, { title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl || "" });
});
