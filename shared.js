const STORAGE_KEYS = {
  sessions: "taboraSessions",
  workspaces: "taboraWorkspaces"
};

const DEFAULT_WORKSPACES = [
  { id: "work", name: "Work", color: "#d68a00" },
  { id: "study", name: "Study", color: "#2f8bc9" },
  { id: "reading", name: "Reading", color: "#4c9a61" }
];

async function getState() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.sessions, STORAGE_KEYS.workspaces]);
  const workspaces = data[STORAGE_KEYS.workspaces] || DEFAULT_WORKSPACES;
  const sessions = data[STORAGE_KEYS.sessions] || [];
  return { sessions, workspaces };
}

async function setSessions(sessions) {
  await chrome.storage.local.set({ [STORAGE_KEYS.sessions]: sessions });
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return minutes === 1 ? "Just now" : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function sessionMatches(session, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    session.name,
    session.workspaceName,
    ...session.tabs.flatMap((tab) => [tab.title, tab.url])
  ].some((value) => (value || "").toLowerCase().includes(normalized));
}

function setText(parent, selector, value) {
  parent.querySelector(selector).textContent = value;
}

async function saveCurrentWindow(name, workspaceId) {
  const { sessions, workspaces } = await getState();
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const workspace = workspaces.find((item) => item.id === workspaceId) || workspaces[0];
  const filteredTabs = tabs.filter((tab) => tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("brave://"));

  if (!filteredTabs.length) {
    return null;
  }

  const session = {
    id: makeId("session"),
    name: name.trim() || "Saved Session",
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceColor: workspace.color,
    createdAt: Date.now(),
    starred: false,
    tabs: filteredTabs.map((tab) => ({
      title: tab.title || tab.url,
      url: tab.url,
      favIconUrl: tab.favIconUrl || ""
    }))
  };

  await setSessions([session, ...sessions]);
  return session;
}

async function restoreSession(sessionId) {
  const { sessions } = await getState();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return;

  const windowInfo = await chrome.windows.create({ url: session.tabs[0].url, focused: true });
  const firstTabId = windowInfo.tabs && windowInfo.tabs[0] ? windowInfo.tabs[0].id : null;

  for (const tab of session.tabs.slice(1)) {
    await chrome.tabs.create({ windowId: windowInfo.id, url: tab.url, active: false });
  }

  if (firstTabId) {
    await chrome.tabs.update(firstTabId, { active: true });
  }
}

async function deleteSession(sessionId) {
  const { sessions } = await getState();
  await setSessions(sessions.filter((item) => item.id !== sessionId));
}

async function toggleStar(sessionId) {
  const { sessions } = await getState();
  await setSessions(sessions.map((item) => item.id === sessionId ? { ...item, starred: !item.starred } : item));
}

function faviconNode(tab) {
  if (tab.favIconUrl) {
    const img = document.createElement("img");
    img.className = "favicon";
    img.src = tab.favIconUrl;
    img.alt = "";
    return img;
  }

  const fallback = document.createElement("span");
  fallback.className = "favicon fallback";
  fallback.textContent = (tab.title || "?").slice(0, 1).toUpperCase();
  return fallback;
}
