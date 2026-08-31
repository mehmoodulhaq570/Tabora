const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync("background.js", "utf8");

function loadBackground() {
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
    chrome,
    console,
    findDuplicateLink: () => null,
    getTaboraState: async () => ({ boards: [], settings: {} }),
    importScripts: () => {},
    normalizeUrl: () => "",
    setTimeout
  };
  vm.runInNewContext(source, context, { filename: "background.js" });
  return listeners;
}

test("background starts without installation or alarms APIs", () => {
  const listeners = loadBackground();
  assert.equal(typeof listeners.command, "function");
  assert.doesNotMatch(source, /chrome\.alarms|onInstalled/);
});
