const V2_KEY = "taboraV2";
const ACTION_RESET_ALARM = "tabora-reset-action-feedback";
const DEFAULT_ACTION_TITLE = "Tabora";

importScripts("shared.js");

async function initializeStorage() {
  const data = await chrome.storage.local.get(V2_KEY);
  if (data[V2_KEY]) return;

  // The full V1 migration runs in shared.js when the new-tab page first opens.
  await chrome.storage.local.set({ taboraNeedsMigration: true });
}

async function resetActionFeedback() {
  await Promise.all([
    chrome.action.setBadgeText({ text: "" }),
    chrome.action.setTitle({ title: DEFAULT_ACTION_TITLE })
  ]);
}

async function showActionFeedback(text, title, color) {
  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ color }),
    chrome.action.setBadgeText({ text }),
    chrome.action.setTitle({ title })
  ]);
  await chrome.alarms.clear(ACTION_RESET_ALARM);
  await chrome.alarms.create(ACTION_RESET_ALARM, { when: Date.now() + 3000 });
}

async function handleQuickSave(command) {
  if (command !== "quick-save") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !normalizeUrl(tab.url)) return;

  const state = await getTaboraState();
  const pageId = state.settings.quickSaveDestination === "home"
    ? "home"
    : state.settings.activePageId;
  const duplicate = findDuplicateLink(state, tab.url);
  if (duplicate) {
    await showActionFeedback("!", `Already saved in ${duplicate.page?.name || "Home"} / ${duplicate.board.name}`, "#f5bd48");
    return;
  }
  let board = state.boards.find((item) => item.pageId === pageId && item.name === "Quick Saves");
  if (!board) {
    const created = await addBoard(pageId, "Quick Saves");
    board = created.result;
  }
  const added = await addLink(board.id, { title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl || "" });
  if (added.result?.duplicate) {
    await showActionFeedback("!", `Already saved in ${added.result.page?.name || "Home"} / ${added.result.board.name}`, "#f5bd48");
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void initializeStorage().catch((error) => console.error("Tabora installation setup failed", error));
});

chrome.commands.onCommand.addListener((command) => {
  void handleQuickSave(command).catch(async (error) => {
    console.error("Tabora quick save failed", error);
    try {
      await showActionFeedback("ERR", "Tabora could not save this tab", "#d94b5c");
    } catch (feedbackError) {
      console.error("Tabora could not display quick-save feedback", feedbackError);
    }
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ACTION_RESET_ALARM) return;
  void resetActionFeedback().catch((error) => console.error("Tabora action feedback reset failed", error));
});
