const assert = require("node:assert/strict");
const fs = require("node:fs");

const port = Number(process.env.TABORA_DEBUG_PORT || 9333);
const screenshotPath = process.env.TABORA_SCREENSHOT || "";
const searchScreenshotPath = process.env.TABORA_SEARCH_SCREENSHOT || "";
const lightMenuScreenshotPath = process.env.TABORA_LIGHT_MENU_SCREENSHOT || "";
const lightDialogScreenshotPath = process.env.TABORA_LIGHT_DIALOG_SCREENSHOT || "";
const popupScreenshotPath = process.env.TABORA_POPUP_SCREENSHOT || "";

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) { this.events.push(message); return; }
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  close() { this.socket.close(); }
}

async function waitForTargets() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Brave DevTools endpoint did not become ready");
}

(async () => {
  const target = await waitForTargets();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Page.navigate", { url: "chrome://newtab" });
  await new Promise((resolve) => setTimeout(resolve, 2200));

  const page = await client.evaluate(`({
    title: document.title,
    url: location.href,
    tool: Boolean(document.querySelector("#featureTool")),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth
  })`);
  assert.equal(page.title, "Tabora");
  assert.match(page.url, /^chrome-extension:\/\//);
  assert.equal(page.tool, true);
  assert.equal(page.horizontalOverflow, false);

  const manifest = await client.evaluate(`chrome.runtime.getManifest()`);
  assert.equal(manifest.manifest_version, 3);
  assert.ok(!manifest.permissions.includes("alarms"));
  assert.equal(manifest.host_permissions, undefined);
  assert.deepEqual(manifest.optional_host_permissions, ["http://*/*", "https://*/*"]);

  const accessibility = await client.evaluate(`(() => {
    const dialogs = [...document.querySelectorAll("dialog")];
    const namedDialogs = dialogs.every((dialog) => {
      const labelId = dialog.getAttribute("aria-labelledby");
      return Boolean(labelId && document.getElementById(labelId)?.textContent.trim());
    });
    const trigger = document.querySelector('[data-page-options="home"]');
    trigger.click();
    const menu = document.querySelector("#contextMenu");
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    const firstLabel = document.activeElement?.textContent.trim();
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const secondLabel = document.activeElement?.textContent.trim();
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return {
      namedDialogs,
      menuRole: menu.getAttribute("role"),
      itemCount: items.length,
      firstLabel,
      secondLabel,
      menuClosed: menu.hidden,
      focusRestored: document.activeElement === trigger,
      expanded: trigger.getAttribute("aria-expanded")
    };
  })()`);
  assert.equal(accessibility.namedDialogs, true);
  assert.equal(accessibility.menuRole, "menu");
  assert.ok(accessibility.itemCount >= 2);
  assert.notEqual(accessibility.firstLabel, accessibility.secondLabel);
  assert.equal(accessibility.menuClosed, true);
  assert.equal(accessibility.focusRestored, true);
  assert.equal(accessibility.expanded, "false");

  const sharing = await client.evaluate(`(async () => {
    const page = activePage();
    let board = appState.boards.find((item) => item.name === "Share Test");
    if (!board) {
      const added = await addBoard(page.id, "Share Test", [{ title: "Example", url: "https://example.com" }], { column: 0, order: 0 });
      board = added.result;
      await refresh();
    }
    const toastText = () => document.querySelector("#toast .toast-copy")?.textContent || "";
    const chooseMenuItem = async (anchor, label) => {
      anchor.click();
      await new Promise((resolve) => setTimeout(resolve, 40));
      const item = [...document.querySelectorAll("#contextMenu button")].find((button) => button.textContent.trim() === label);
      if (!item) return "missing";
      item.click();
      await new Promise((resolve) => setTimeout(resolve, 140));
      return toastText();
    };
    const pageResult = await chooseMenuItem(document.querySelector('[data-page-options="home"]'), "Share Page");
    const boardResult = await chooseMenuItem(document.querySelector('[data-board-menu="' + board.id + '"]'), "Share / copy links");
    document.querySelector('[data-share-link][data-board-id="' + board.id + '"]').click();
    await new Promise((resolve) => setTimeout(resolve, 140));
    return { pageResult, boardResult, linkResult: toastText(), shareButton: Boolean(document.querySelector("[data-share-link]")) };
  })()`);
  assert.equal(sharing.pageResult, "Page links copied");
  assert.equal(sharing.boardResult, "Board links copied");
  assert.equal(sharing.linkResult, "Link copied");
  assert.equal(sharing.shareButton, true);

  const search = await client.evaluate(`(async () => {
    const tool = document.querySelector("#searchTool");
    tool.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const panel = document.querySelector("#searchPanel");
    const rect = panel.getBoundingClientRect();
    const opened = {
      visible: !panel.hidden,
      active: document.body.classList.contains("search-active"),
      expanded: tool.getAttribute("aria-expanded"),
      focused: document.activeElement === document.querySelector("#globalSearch"),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
    document.querySelector(".workspace-main").click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { ...opened, closedOutside: panel.hidden, inactive: !document.body.classList.contains("search-active") };
  })()`);
  assert.equal(search.visible, true);
  assert.equal(search.active, true);
  assert.equal(search.expanded, "true");
  assert.equal(search.focused, true);
  assert.ok(search.width > 900 && search.height >= 70);
  assert.equal(search.closedOutside, true);
  assert.equal(search.inactive, true);

  if (searchScreenshotPath) {
    await client.evaluate(`document.querySelector("#searchTool").click()`);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(searchScreenshotPath, Buffer.from(screenshot.data, "base64"));
    await client.evaluate(`document.querySelector("#searchTool").click()`);
  }

  const themes = await client.evaluate(`(async () => {
    document.querySelector("#wallpaperTool").click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    document.querySelector('#appearancePanel [data-theme="dark"]').click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const count = document.querySelectorAll("#wallpaperGrid [data-wallpaper]").length;
    document.querySelector('[data-wallpaper="eclipse-forge"]').click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const darkPalette = document.body.dataset.palette;
    const darkImage = getComputedStyle(document.querySelector("#dashboardBackdrop")).backgroundImage;
    document.querySelector('#appearancePanel [data-theme="light"]').click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    document.querySelector('[data-wallpaper="sakura-drift"]').click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      darkCount: count,
      lightCount: document.querySelectorAll("#wallpaperGrid [data-wallpaper]").length,
      darkPalette,
      darkImage,
      lightPalette: document.body.dataset.palette,
      lightImage: getComputedStyle(document.querySelector("#dashboardBackdrop")).backgroundImage
    };
  })()`);
  assert.equal(themes.darkCount, 8);
  assert.equal(themes.lightCount, 8);
  assert.equal(themes.darkPalette, "eclipse");
  assert.match(themes.darkImage, /eclipse-forge\.webp/);
  assert.equal(themes.lightPalette, "sakura");
  assert.match(themes.lightImage, /sakura-drift\.webp/);

  const lightSurfaces = await client.evaluate(`(async () => {
    const luminance = (value) => {
      const channels = value.match(/[\\d.]+/g).slice(0, 3).map(Number);
      const scale = Math.max(...channels) <= 1 ? 255 : 1;
      return (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) * scale;
    };
    document.querySelector("#appearancePanel").hidden = true;
    document.querySelector("[data-page-options]").click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const menu = document.querySelector("#contextMenu");
    const menuButton = menu.querySelector("button");
    const result = {
      menuBackground: luminance(getComputedStyle(menu).backgroundColor),
      menuText: luminance(getComputedStyle(menuButton).color)
    };
    document.querySelector("#addPageButton").click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const dialog = document.querySelector("#pageDialog");
    const input = document.querySelector("#pageName");
    result.dialogOpen = dialog.open;
    result.dialogBackground = luminance(getComputedStyle(dialog).backgroundColor);
    result.inputBackground = luminance(getComputedStyle(input).backgroundColor);
    result.inputText = luminance(getComputedStyle(input).color);
    dialog.close();
    return result;
  })()`);
  assert.ok(lightSurfaces.menuBackground > 180 && lightSurfaces.menuText < 120);
  assert.equal(lightSurfaces.dialogOpen, true);
  assert.ok(lightSurfaces.dialogBackground > 180);
  assert.ok(lightSurfaces.inputBackground > 180 && lightSurfaces.inputText < 120);

  if (lightMenuScreenshotPath) {
    await client.evaluate(`document.querySelector("[data-page-options]").click()`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(lightMenuScreenshotPath, Buffer.from(screenshot.data, "base64"));
  }
  if (lightDialogScreenshotPath) {
    await client.evaluate(`document.querySelector("#addPageButton").click()`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(lightDialogScreenshotPath, Buffer.from(screenshot.data, "base64"));
    await client.evaluate(`document.querySelector("#pageDialog").close()`);
  }

  const hub = await client.evaluate(`(async () => {
    document.querySelector("#appearancePanel").hidden = true;
    document.querySelector("#featureTool").click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const dialog = document.querySelector("#featureDialog");
    return {
      open: dialog.open,
      views: dialog.querySelectorAll("[data-feature-section]").length,
      width: Math.round(dialog.getBoundingClientRect().width),
      height: Math.round(dialog.getBoundingClientRect().height),
      clipped: dialog.scrollWidth > dialog.clientWidth
    };
  })()`);
  assert.equal(hub.open, true);
  assert.equal(hub.views, 7);
  assert.equal(hub.clipped, false);
  assert.ok(hub.width > 700 && hub.height > 500);

  const persistenceId = await client.evaluate(`(async () => {
    let board = appState.boards.find((item) => item.name === "Persistence Test");
    if (!board) {
      const added = await addBoard(activePage().id, "Persistence Test", [{ title: "Persistent Example", url: "https://example.com/persist" }]);
      board = added.result;
    }
    return board.id;
  })()`);
  await client.send("Page.reload", { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const persisted = await client.evaluate(`(async () => {
    const state = await getTaboraState();
    const board = state.boards.find((item) => item.id === ${JSON.stringify(persistenceId)});
    return Boolean(board && board.links.some((link) => link.url === "https://example.com/persist"));
  })()`);
  assert.equal(persisted, true);

  if (screenshotPath) {
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
  }

  const popupUrl = new URL("popup.html", page.url).href;
  await client.send("Page.navigate", { url: popupUrl });
  await new Promise((resolve) => setTimeout(resolve, 800));
  const lightPopup = await client.evaluate(`({
    palette: document.body.dataset.palette,
    light: document.body.classList.contains("light-theme"),
    wallpaper: getComputedStyle(document.body).backgroundImage,
    font: getComputedStyle(document.body).fontFamily,
    fontLoaded: document.fonts.check('14px "Nunito Sans"'),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth
  })`);
  assert.equal(lightPopup.palette, "sakura");
  assert.equal(lightPopup.light, true);
  assert.match(lightPopup.wallpaper, /sakura-drift\.webp/);
  assert.match(lightPopup.font, /Nunito Sans/);
  assert.equal(lightPopup.fontLoaded, true);
  assert.equal(lightPopup.horizontalOverflow, false);

  if (popupScreenshotPath) {
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(popupScreenshotPath, Buffer.from(screenshot.data, "base64"));
  }

  await client.evaluate(`(async () => {
    await setSetting("theme", "dark");
    await setSetting("wallpaper", "digital-ocean");
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const darkPopup = await client.evaluate(`({
    palette: document.body.dataset.palette,
    light: document.body.classList.contains("light-theme"),
    wallpaper: getComputedStyle(document.body).backgroundImage
  })`);
  assert.equal(darkPopup.palette, "forest");
  assert.equal(darkPopup.light, false);
  assert.match(darkPopup.wallpaper, /tabora-background\.webp/);

  await client.evaluate(`(async () => {
    await setSetting("theme", "light");
    await setSetting("wallpaper", "sakura-drift");
  })()`);

  const exceptions = client.events.filter((event) => event.method === "Runtime.exceptionThrown");
  assert.equal(exceptions.length, 0, exceptions.map((event) => event.params.exceptionDetails.text).join("\n"));
  client.close();
  console.log(`browser smoke test passed (${page.url}, ${hub.width}x${hub.height})`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
