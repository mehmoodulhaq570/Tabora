const assert = require("node:assert/strict");
const fs = require("node:fs");

const port = Number(process.env.TABORA_DEBUG_PORT || 9333);
const screenshotPath = process.env.TABORA_SCREENSHOT || "";
const searchScreenshotPath = process.env.TABORA_SEARCH_SCREENSHOT || "";

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

  const exceptions = client.events.filter((event) => event.method === "Runtime.exceptionThrown");
  assert.equal(exceptions.length, 0, exceptions.map((event) => event.params.exceptionDetails.text).join("\n"));

  if (screenshotPath) {
    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
  }
  client.close();
  console.log(`browser smoke test passed (${page.url}, ${hub.width}x${hub.height})`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
