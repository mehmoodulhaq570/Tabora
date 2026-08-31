/* global chrome, importScripts, normalizeUrl, getTaboraState, findDuplicateLink, addBoard, addLink */

const DEFAULT_ACTION_TITLE = "Tabora";

importScripts("shared.js");

async function resetActionFeedback() {
  await Promise.all([
    chrome.action.setBadgeText({ text: "" }),
    chrome.action.setTitle({ title: DEFAULT_ACTION_TITLE })
  ]);
}

function isWorkerShutdownError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /\bNo SW\b|Extension context invalidated/i.test(message);
}

function resetActionFeedbackLater() {
  setTimeout(() => {
    void resetActionFeedback().catch((error) => {
      if (!isWorkerShutdownError(error)) console.error("Tabora action feedback reset failed", error);
    });
  }, 3000);
}

async function showActionFeedback(text, title, color) {
  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ color }),
    chrome.action.setBadgeText({ text }),
    chrome.action.setTitle({ title })
  ]);
  resetActionFeedbackLater();
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
