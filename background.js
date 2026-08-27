const V2_KEY = "taboraV2";

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(V2_KEY);
  if (data[V2_KEY]) return;

  // The full V1 migration runs in shared.js when the new-tab page first opens.
  await chrome.storage.local.set({ taboraNeedsMigration: true });
});
