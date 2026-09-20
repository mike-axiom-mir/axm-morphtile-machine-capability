const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const request = require("../fixtures/request.sleeping-counter.json");
const { run } = require("../src");

const corePath = process.env.MORPHTILE_CORE;

function runtime() {
  return require(path.resolve(corePath));
}

function buildSleeping(wake, initial = 0, requestId = "cap-wake-runtime") {
  return run({
    ...request,
    request_id: requestId,
    intent: { kind: "sleeping-counter", wake, initial }
  });
}

function assertReplay(MorphTile, ws) {
  const replay = MorphTile.reconstruct(ws.ledger);
  assert.equal(replay.hash, MorphTile.hashOf(ws.live));
  assert.deepEqual(replay.world, ws.live);
}

test("near wake uses explicit radius + hysteresis, sleeps outside the band, preserves state and replays", { skip: corePath ? false : "set MORPHTILE_CORE to run cross-repo integration" }, () => {
  const MorphTile = runtime();
  const built = buildSleeping({ on: "near", within: 4, hysteresis: 1.5 }, 2, "cap-near-runtime");
  assert.equal(built.status, "CANDIDATE");
  assert.deepEqual(built.candidate.capabilities[0].wake, { on: "near", within: 4, hysteresis: 1.5 });

  const tile = MorphTile.createTile({
    id: "counter",
    name: "Near-woken counter integration fixture",
    capabilities: built.candidate.capabilities
  });
  const originalMatter = MorphTile.clone(tile);
  const world = MorphTile.createWorld("Capability machine near wake integration");
  world.tiles.counter = tile;
  assert.deepEqual(MorphTile.validateWorld(world), { ok: true, errors: [] });

  const ws = MorphTile.createWorkspace(world);
  let settled = MorphTile.act(ws, { do: "settle", from: [7, 0, 0] }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), false);
  assert.deepEqual(ws.live.vars, {});

  settled = MorphTile.act(ws, { do: "settle", from: [4, 0, 0] }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), true, "at the authored radius the capability wakes");
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 2);
  assert.deepEqual(ws.live.vars, {}, "wake exposes authored state without materializing sparse state");

  settled = MorphTile.act(ws, { do: "settle", from: [5, 0, 0] }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), true, "inside hysteresis band the existing wake state is preserved");

  const incremented = MorphTile.act(ws, { do: "signal", tile: "counter", name: "increment" }, "capability-machine-integration");
  assert.equal(incremented.ok, true);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 3);

  settled = MorphTile.act(ws, { do: "settle", from: [7, 0, 0] }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), false, "beyond radius times hysteresis the capability sleeps again");
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 3, "automatic sleep preserves sparse state");
  assert.deepEqual(ws.live.tiles.counter, originalMatter, "near wake/sleep never rewrites canonical tile matter");

  assertReplay(MorphTile, ws);
});

test("value wake observes existing canonical logic state, wakes only after threshold crossing and replays", { skip: corePath ? false : "set MORPHTILE_CORE to run cross-repo integration" }, () => {
  const MorphTile = runtime();
  const built = buildSleeping({ on: "value", var: "trigger", over: 2 }, 0, "cap-value-runtime");
  assert.equal(built.status, "CANDIDATE");
  assert.deepEqual(built.candidate.capabilities[0].wake, { on: "value", var: "trigger", over: 2 });

  const tile = MorphTile.createTile({
    id: "counter",
    name: "Value-woken counter integration fixture",
    facets: {
      logic: {
        type: "rule",
        data: {
          vars: { trigger: 0 },
          rules: [{ on: "arm", do: [{ set: ["trigger", 3] }] }]
        }
      }
    },
    capabilities: built.candidate.capabilities
  });
  const originalMatter = MorphTile.clone(tile);
  const world = MorphTile.createWorld("Capability machine value wake integration");
  world.tiles.counter = tile;
  assert.deepEqual(MorphTile.validateWorld(world), { ok: true, errors: [] });

  const ws = MorphTile.createWorkspace(world);
  let settled = MorphTile.act(ws, { do: "settle" }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), false);
  assert.equal(MorphTile.getVar(ws.live, "counter", "trigger", ws.live.time), 0);

  const armed = MorphTile.act(ws, { do: "signal", tile: "counter", name: "arm" }, "capability-machine-integration");
  assert.equal(armed.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), false, "changing the watched value is not itself hidden wake authority");
  assert.equal(MorphTile.getVar(ws.live, "counter", "trigger", ws.live.time), 3);

  settled = MorphTile.act(ws, { do: "settle" }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), true, "settle records the threshold-derived wake event");
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 0);

  const incremented = MorphTile.act(ws, { do: "signal", tile: "counter", name: "increment" }, "capability-machine-integration");
  assert.equal(incremented.ok, true);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 1);
  assert.deepEqual(ws.live.tiles.counter, originalMatter, "value wake and capability action never rewrite canonical tile matter");

  assertReplay(MorphTile, ws);
});

test("time wake remains inert before its threshold, wakes on settle at threshold and replays", { skip: corePath ? false : "set MORPHTILE_CORE to run cross-repo integration" }, () => {
  const MorphTile = runtime();
  const built = buildSleeping({ on: "time", after: 5 }, 4, "cap-time-runtime");
  assert.equal(built.status, "CANDIDATE");
  assert.deepEqual(built.candidate.capabilities[0].wake, { on: "time", after: 5 });

  const tile = MorphTile.createTile({
    id: "counter",
    name: "Time-woken counter integration fixture",
    capabilities: built.candidate.capabilities
  });
  const originalMatter = MorphTile.clone(tile);
  const world = MorphTile.createWorld("Capability machine time wake integration");
  world.tiles.counter = tile;
  assert.deepEqual(MorphTile.validateWorld(world), { ok: true, errors: [] });

  const ws = MorphTile.createWorkspace(world);
  let ticked = MorphTile.act(ws, { do: "tick", to: 4 }, "capability-machine-integration");
  assert.equal(ticked.ok, true);
  let settled = MorphTile.act(ws, { do: "settle" }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), false);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), undefined);

  ticked = MorphTile.act(ws, { do: "tick", to: 5 }, "capability-machine-integration");
  assert.equal(ticked.ok, true);
  settled = MorphTile.act(ws, { do: "settle" }, "capability-machine-integration");
  assert.equal(settled.ok, true);
  assert.equal(MorphTile.isAwake(ws.live, "counter", "counter"), true);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 4);
  assert.deepEqual(ws.live.vars, {}, "time wake exposes authored defaults without creating sparse state");

  const incremented = MorphTile.act(ws, { do: "signal", tile: "counter", name: "increment" }, "capability-machine-integration");
  assert.equal(incremented.ok, true);
  assert.equal(MorphTile.getVar(ws.live, "counter", "count", ws.live.time), 5);
  assert.deepEqual(ws.live.tiles.counter, originalMatter, "time wake/action never rewrites canonical tile matter");

  assertReplay(MorphTile, ws);
});
