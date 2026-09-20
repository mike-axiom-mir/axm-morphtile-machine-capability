const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const request = require("../fixtures/request.sleeping-counter.json");
const { run } = require("../src");

const corePath = process.env.MORPHTILE_CORE;

test("custom signal wake matches exactly, wakes without inventing an action, then preserves normal counter behavior", { skip: corePath ? false : "set MORPHTILE_CORE to run cross-repo integration" }, () => {
  const MorphTile = require(path.resolve(corePath));
  const built = run({
    ...request,
    request_id: "cap-custom-signal-runtime",
    intent: {
      kind: "sleeping-counter",
      initial: 2,
      wake: { on: "signal", name: "activate" }
    }
  });

  assert.equal(built.status, "CANDIDATE");
  assert.deepEqual(built.candidate.capabilities[0].wake, { on: "signal", name: "activate" });

  const tile = MorphTile.createTile({
    id: "counter",
    name: "Custom-signal sleeping counter integration fixture",
    capabilities: built.candidate.capabilities
  });
  const originalMatter = MorphTile.clone(tile);
  const world = MorphTile.createWorld("Capability machine custom signal integration");
  world.tiles.counter = tile;
  assert.deepEqual(MorphTile.validateWorld(world), { ok: true, errors: [] });

  const ws = MorphTile.createWorkspace(world);

  const wrongSignal = MorphTile.act(ws, { do: "signal", tile: "counter", name: "increment" }, "capability-machine-integration");
  assert.equal(wrongSignal.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), false, "a different signal must not wake the capability");
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), undefined);

  const wakeSignal = MorphTile.act(ws, { do: "signal", tile: "counter", name: "activate" }, "capability-machine-integration");
  assert.equal(wakeSignal.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), true);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 2, "wake-only signal must not be reinterpreted as increment");
  assert.deepEqual(ws.live.vars, {}, "waking onto authored initial state must not create sparse mutation state");
  assert.deepEqual(ws.live.tiles.counter, originalMatter, "custom signal wake must not rewrite canonical matter");

  const incremented = MorphTile.act(ws, { do: "signal", tile: "counter", name: "increment" }, "capability-machine-integration");
  assert.equal(incremented.ok, true);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 3);
  assert.equal(ws.live.vars.counter.count, 3);

  const replay = MorphTile.reconstruct(ws.ledger);
  assert.equal(replay.hash, MorphTile.hashOf(ws.live));
  assert.deepEqual(replay.world, ws.live);
});
