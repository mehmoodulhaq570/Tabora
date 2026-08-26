const dashboardSearch = document.querySelector("#dashboardSearch");
const dashboardWorkspaceSelect = document.querySelector("#dashboardWorkspaceSelect");
const dashboardWorkspaceList = document.querySelector("#dashboardWorkspaceList");
const sessionGrid = document.querySelector("#sessionGrid");

let state = { sessions: [], workspaces: [] };
let activeWorkspace = "all";
let starredOnly = false;

async function initDashboard() {
  state = await getState();
  renderDashboardWorkspaceControls();
  renderDashboard();
}

function renderDashboardWorkspaceControls() {
  dashboardWorkspaceSelect.innerHTML = '<option value="all">All Workspaces</option>';
  for (const workspace of state.workspaces) {
    const option = document.createElement("option");
    option.value = workspace.id;
    option.textContent = workspace.name;
    dashboardWorkspaceSelect.append(option);
  }

  dashboardWorkspaceList.innerHTML = "";
  for (const workspace of state.workspaces) {
    const button = document.createElement("button");
    button.className = "workspace-row clickable";
    button.dataset.workspace = workspace.id;
    button.innerHTML = `
      <span class="workspace-color" style="background:${workspace.color}"></span>
      <strong></strong>
      <span></span>
    `;
    setText(button, "strong", workspace.name);
    setText(button, "span:last-child", String(state.sessions.filter((session) => session.workspaceId === workspace.id).length));
    dashboardWorkspaceList.append(button);
  }
}

function getFilteredSessions() {
  return state.sessions
    .filter((session) => sessionMatches(session, dashboardSearch.value))
    .filter((session) => activeWorkspace === "all" || session.workspaceId === activeWorkspace)
    .filter((session) => !starredOnly || session.starred);
}

function renderDashboard() {
  const sessions = getFilteredSessions();
  sessionGrid.innerHTML = "";

  if (!sessions.length) {
    sessionGrid.innerHTML = '<div class="empty-state dashboard-empty">No sessions match your search.</div>';
    return;
  }

  for (const session of sessions) {
    const card = document.createElement("article");
    card.className = "session-card";

    const tabList = document.createElement("div");
    tabList.className = "tab-list";
    for (const tab of session.tabs.slice(0, 5)) {
      const row = document.createElement("a");
      row.className = "tab-row";
      row.href = tab.url;
      row.target = "_blank";
      row.rel = "noreferrer";
      row.append(faviconNode(tab));

      const title = document.createElement("span");
      title.textContent = tab.title || tab.url;
      row.append(title);
      tabList.append(row);
    }

    card.innerHTML = `
      <div class="card-menu">
        <span class="session-dot" style="background:${session.workspaceColor}"></span>
        <button class="icon-button star-button ${session.starred ? "selected" : ""}" data-star="${session.id}" title="Star session" aria-label="Star session">
          <span class="icon-star"></span>
        </button>
      </div>
      <div class="card-meta">${formatRelativeTime(session.createdAt)}</div>
      <h2></h2>
      <div class="workspace-pill" style="--pill-color:${session.workspaceColor}"></div>
      <div class="tab-count"></div>
    `;
    setText(card, "h2", session.name);
    setText(card, ".workspace-pill", session.workspaceName);
    setText(card, ".tab-count", `${session.tabs.length} tabs`);
    card.append(tabList);

    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.innerHTML = `
      <button class="primary-button restore-button" data-restore="${session.id}">Restore</button>
      <button class="ghost-button" data-delete="${session.id}">Delete</button>
    `;
    card.append(actions);
    sessionGrid.append(card);
  }
}

document.querySelector("#saveFromDashboard").addEventListener("click", async () => {
  await saveCurrentWindow("Saved Session", activeWorkspace === "all" ? state.workspaces[0].id : activeWorkspace);
  state = await getState();
  renderDashboardWorkspaceControls();
  renderDashboard();
});

dashboardSearch.addEventListener("input", renderDashboard);
dashboardWorkspaceSelect.addEventListener("change", (event) => {
  activeWorkspace = event.target.value;
  starredOnly = false;
  renderDashboard();
});

dashboardWorkspaceList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-workspace]");
  if (!button) return;
  activeWorkspace = button.dataset.workspace;
  dashboardWorkspaceSelect.value = activeWorkspace;
  starredOnly = false;
  renderDashboard();
});

document.querySelector(".nav-list").addEventListener("click", (event) => {
  const item = event.target.closest("[data-filter]");
  if (!item) return;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.remove("active"));
  item.classList.add("active");
  starredOnly = item.dataset.filter === "starred";
  if (!starredOnly) activeWorkspace = "all";
  dashboardWorkspaceSelect.value = activeWorkspace;
  renderDashboard();
});

sessionGrid.addEventListener("click", async (event) => {
  const restoreId = event.target.dataset.restore;
  const deleteId = event.target.dataset.delete;
  const starId = event.target.closest("[data-star]")?.dataset.star;

  if (restoreId) await restoreSession(restoreId);
  if (deleteId) await deleteSession(deleteId);
  if (starId) await toggleStar(starId);

  if (deleteId || starId) {
    state = await getState();
    renderDashboardWorkspaceControls();
    renderDashboard();
  }
});

chrome.storage.onChanged.addListener(initDashboard);
initDashboard();
