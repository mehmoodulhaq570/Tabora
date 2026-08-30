const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const storage = {};
const chrome = {
  storage: {
    local: {
      async get(keys) {
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.filter((key) => key in storage).map((key) => [key, storage[key]]));
      },
      async set(values) { Object.assign(storage, structuredClone(values)); },
      async remove(key) { delete storage[key]; }
    }
  }
};

const context = vm.createContext({ chrome, console, structuredClone, URL, setTimeout, clearTimeout });
const source = `${fs.readFileSync("shared.js", "utf8")}
globalThis.tabora = { createDefaultState, getTaboraState, saveTaboraState, addBoard, addLink, customizeBoard, deleteBoard, undoLastAction };`;
vm.runInContext(source, context);

(async () => {
  const api = context.tabora;
  const initial = await api.getTaboraState();
  assert.equal(initial.schemaVersion, 4);
  assert.equal(initial.recentlyOpened.length, 0);

  const created = await api.addBoard("home", "Research");
  const boardId = created.result.id;
  await api.customizeBoard(boardId, { color: "blue", icon: "book", size: "large", pinned: true });
  let state = await api.getTaboraState();
  assert.equal(state.boards[0].color, "blue");
  assert.equal(state.boards[0].pinned, true);

  const first = await api.addLink(boardId, { title: "Example", url: "https://example.com" });
  assert.equal(first.result.title, "Example");
  const duplicate = await api.addLink(boardId, { title: "Duplicate", url: "https://example.com/" });
  assert.equal(duplicate.result.duplicate, true);
  state = await api.getTaboraState();
  assert.equal(state.boards[0].links.length, 1);

  await api.deleteBoard(boardId);
  state = await api.getTaboraState();
  assert.equal(state.boards.length, 0);
  assert.equal(state.trash.length, 1);
  assert.equal(await api.undoLastAction(), "Board deletion");
  state = await api.getTaboraState();
  assert.equal(state.boards.length, 1);
  assert.equal(state.trash.length, 0);

  console.log("shared state tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
