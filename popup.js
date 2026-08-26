const sessionName = document.querySelector("#sessionName");
const workspaceSelect = document.querySelector("#workspaceSelect");
const searchInput = document.querySelector("#searchInput");
const recentSessions = document.querySelector("#recentSessions");
const workspaceList = document.querySelector("#workspaceList");

let state = { sessions: [], workspaces: [] };

async function init() {
  state = await getState();
  renderWorkspaceOptions();
  render();
}

function renderWorkspaceOptions() {
  workspaceSelect.innerHTML = "";
  for (const workspace of state.workspaces) {
    const option = document.createElement("option");
    option.value = workspace.id;
    option.textContent = workspace.name;
    workspaceSelect.append(option);
  }
}

function render() {
  const query = searchInput.value;
  const sessions = state.sessions.filter((session) => sessionMatches(session, query)).slice(0, 5);
  recentSessions.innerHTML = "";

  if (!sessions.length) {
    recentSessions.innerHTML = '<div class="empty-state">No saved sessions yet.</div>';
  }

  for (const session of sessions) {
    const item = document.createElement("article");
    item.className = "session-row";
    item.innerHTML = `
      <div class="session-dot" style="background:${session.workspaceColor}"></div>
      <div class="session-row-main">
        <strong></strong>
        <span></span>
      </div>
      <button class="small-button" data-restore="${session.id}">Restore</button>
    `;
    setText(item, "strong", session.name);
    setText(item, ".session-row-main span", `${session.tabs.length} tabs - ${formatRelativeTime(session.createdAt)}`);
    recentSessions.append(item);
  }

  workspaceList.innerHTML = "";
  for (const workspace of state.workspaces) {
    const count = state.sessions.filter((session) => session.workspaceId === workspace.id).length;
    const row = document.createElement("div");
    row.className = "workspace-row";
    row.innerHTML = `
      <span class="workspace-color" style="background:${workspace.color}"></span>
      <strong></strong>
      <span></span>
    `;
    setText(row, "strong", workspace.name);
    setText(row, "span:last-child", `${count} sessions`);
    workspaceList.append(row);
  }
}

document.querySelector("#saveCurrent").addEventListener("click", async () => {
  const saved = await saveCurrentWindow(sessionName.value, workspaceSelect.value);
  if (saved) {
    sessionName.value = "";
    state = await getState();
    render();
  }
});

document.querySelector("#openDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

recentSessions.addEventListener("click", async (event) => {
  const restoreId = event.target.dataset.restore;
  if (restoreId) {
    await restoreSession(restoreId);
  }
});

searchInput.addEventListener("input", render);
chrome.storage.onChanged.addListener(init);
init();
