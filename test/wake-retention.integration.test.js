const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const request = require("../fixtures/request.sleeping-counter.json");
const { run } = require("../src");

const corePath = process.env.MORPHTILE_CORE;

function runtime() {
  return require(path.resolve(corePath));
}

function assertReplay(MorphTile, ws) {
  const replay = MorphTile.reconstruct(ws.ledger);
  assert.equal(replay.hash, MorphTile.hashOf(ws.live));
  assert.deepEqual(replay.world, ws.live);
}

test("near wake with sleeps:false stays awake after leaving the hysteresis band and replays", { skip: corePath ? false : "set MORPHTILE_CORE to run cross-repo integration" }, () => {
  const MorphTile = runtime();
  const built = run({
    ...request,
    request_id: "cap-near-retain-runtime",
    intent: {
      kind: "sleeping-counter",
      initial: 2,
      wake: { on: "near", within: 4, hysteresis: 1.5, sleeps: false }
    }
  });

  assert.equal(built.status, "CANDIDATE");
  assert.deepEqual(built.candidate.capabilities[0].wake, {
    on: "near",
    within: 4,
    hysteresis: 1.5,
    sleeps: false
  });

  const tile = MorphTile.createTile({
    id: "counter",
    name: "Retained near-wake counter fixture",
    capabilities: built.candidate.capabilities
  });
  const originalMatter = MorphTile.clone(tile);
  const world = MorphTile.createWorld("Capability machine retained near wake integration");
  world.tiles.counter = tile;
  assert.deepEqual(MorphTile.validateWorld(world), { ok: true, errors: [] });

  const ws = MorphTile.createWorkspace(world);
  let settled = MorphTile.act(ws, { do: "settle", from: [4, 0, 0] }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), true);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 2);

  const incremented = MorphTile.act(ws, { do: "signal", tile: "counter", name: "increment" }, "capability-machine-integration");
  assert.equal(incremented.ok, true);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 3);

  settled = MorphTile.act(ws, { do: "settle", from: [7, 0, 0] }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), true, "sleeps:false suppresses automatic sleep when the near condition becomes false");
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 3);
  assert.deepEqual(ws.live.tiles.counter, originalMatter, "retention changes runtime activation only, never authored matter");

  assertReplay(MorphTile, ws);
});

test("value wake accepts the documented empty self tile reference and wakes from the carrier state", { skip: corePath ? false : "set MORPHTILE_CORE to run cross-repo integration" }, () => {
  const MorphTile = runtime();
  const built = run({
    ...request,
    request_id: "cap-value-self-runtime",
    intent: {
      kind: "sleeping-counter",
      wake: { on: "value", tile: "", var: "trigger", over: 2, sleeps: false }
    }
  });

  assert.equal(built.status, "CANDIDATE");
  assert.deepEqual(built.candidate.capabilities[0].wake, {
    on: "value",
    tile: "",
    var: "trigger",
    over: 2,
    sleeps: false
  });

  const tile = MorphTile.createTile({
    id: "counter",
    name: "Self-relative value wake fixture",
    facets: {
      logic: {
        type: "rule",
        data: {
          vars: { trigger: 3 },
          rules: []
        }
      }
    },
    capabilities: built.candidate.capabilities
  });
  const originalMatter = MorphTile.clone(tile);
  const world = MorphTile.createWorld("Capability machine self-relative value wake integration");
  world.tiles.counter = tile;
  assert.deepEqual(MorphTile.validateWorld(world), { ok: true, errors: [] });

  const ws = MorphTile.createWorkspace(world);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), false);
  assert.equal(MorphTile.getVar(ws.live, "counter", "trigger", ws.live.time), 3);

  const settled = MorphTile.act(ws, { do: "settle" }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), true, "empty wake.tile means the capability carrier itself");
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 0);
  assert.deepEqual(ws.live.tiles.counter, originalMatter, "self-relative wake does not rewrite authored matter");

  assertReplay(MorphTile, ws);
});
