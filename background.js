chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["taboraSessions", "taboraWorkspaces"]);

  if (!existing.taboraWorkspaces) {
    await chrome.storage.local.set({
      taboraWorkspaces: [
        { id: "work", name: "Work", color: "#d68a00" },
        { id: "study", name: "Study", color: "#2f8bc9" },
        { id: "reading", name: "Reading", color: "#4c9a61" }
      ]
    });
  }

  if (!existing.taboraSessions) {
    await chrome.storage.local.set({ taboraSessions: [] });
  }
});
