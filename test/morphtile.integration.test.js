const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const request = require("../fixtures/request.sleeping-counter.json");
const { run } = require("../src");

const corePath = process.env.MORPHTILE_CORE;

test("sleeping counter executes, sleeps, wakes and replays in pinned MorphTile", { skip: corePath ? false : "set MORPHTILE_CORE to run cross-repo integration" }, () => {
  const MorphTile = require(path.resolve(corePath));
  const built = run(request);

  assert.equal(built.status, "CANDIDATE");
  assert.equal(built.candidate.schema, "morphtile.capability-candidate/v0.4");
  assert.equal(built.candidate.capabilities.length, 1);

  const tile = MorphTile.createTile({
    id: "counter",
    name: "Sleeping counter integration fixture",
    capabilities: built.candidate.capabilities
  });
  const originalMatter = MorphTile.clone(tile);
  const world = MorphTile.createWorld("Capability machine integration");
  world.tiles.counter = tile;

  const valid = MorphTile.validateWorld(world);
  assert.deepEqual(valid, { ok: true, errors: [] });

  const ws = MorphTile.createWorkspace(world);
  assert.deepEqual(MorphTile.sleepingReport(ws.live), { carriers: 1, awake: 0, asleep: 1 });
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), undefined);

  const firstSignal = MorphTile.act(ws, { do: "signal", tile: "counter", name: "increment" }, "capability-machine-integration");
  assert.equal(firstSignal.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), true);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 1);
  assert.deepEqual(ws.live.tiles.counter, originalMatter, "wake and signal must not rewrite canonical tile matter");

  const active = MorphTile.activeTile(ws.live, "counter");
  assert.equal(active.facets.logic.type, "rule");
  assert.ok(active.facets.connect.sockets.some((socket) => socket.id === "increment" && socket.signal === "increment"));

  const slept = MorphTile.act(ws, { do: "sleep", tile: "counter", capability: "counter" }, "capability-machine-integration");
  assert.equal(slept.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), false);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 1, "sleep preserves sparse runtime state unless forget is explicitly requested");
  assert.deepEqual(MorphTile.sleepingReport(ws.live), { carriers: 1, awake: 0, asleep: 1 });

  const secondSignal = MorphTile.act(ws, { do: "signal", tile: "counter", name: "increment" }, "capability-machine-integration");
  assert.equal(secondSignal.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), true);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 2);
  assert.deepEqual(ws.live.tiles.counter, originalMatter, "re-wake must still leave matter byte-equivalent");

  const replay = MorphTile.reconstruct(ws.ledger);
  assert.equal(replay.hash, MorphTile.hashOf(ws.live));
  assert.deepEqual(replay.world, ws.live);
});
