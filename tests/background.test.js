const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync("background.js", "utf8");

function loadBackground({ useBrowserNamespace = false, workerContext = true } = {}) {
  const listeners = {};
  const chrome = {
    action: {
      setBadgeBackgroundColor: async () => {},
      setBadgeText: async () => {},
      setTitle: async () => {}
    },
    commands: { onCommand: { addListener: (listener) => { listeners.command = listener; } } },
    tabs: { query: async () => [] }
  };
  const context = {
    addBoard: async () => ({ result: null }),
    addLink: async () => ({ result: null }),
    console,
    findDuplicateLink: () => null,
    getTaboraState: async () => ({ boards: [], settings: {} }),
    normalizeUrl: () => "",
    setTimeout
  };
  if (workerContext) context.importScripts = () => {};
  context[useBrowserNamespace ? "browser" : "chrome"] = chrome;
  vm.runInNewContext(source, context, { filename: "background.js" });
  return listeners;
}

test("background starts without installation or alarms APIs", () => {
  const listeners = loadBackground();
  assert.equal(typeof listeners.command, "function");
  assert.doesNotMatch(source, /chrome\.alarms|onInstalled/);
});

test("background starts with Firefox's browser namespace", () => {
  const listeners = loadBackground({ useBrowserNamespace: true, workerContext: false });
  assert.equal(typeof listeners.command, "function");
});
