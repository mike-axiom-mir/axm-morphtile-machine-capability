const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const request = require("../fixtures/request.sleeping-counter.json");
const { run, DEFAULT_WAKE_WARNING } = require("../src");

const corePath = process.env.MORPHTILE_CORE;
const clone = (value) => JSON.parse(JSON.stringify(value));

function omittedWakeRequest(requestId) {
  return {
    ...request,
    request_id: requestId,
    intent: { kind: "sleeping-counter" }
  };
}

function assertReplay(MorphTile, ws) {
  const replay = MorphTile.reconstruct(ws.ledger);
  assert.equal(replay.hash, MorphTile.hashOf(ws.live));
  assert.deepEqual(replay.world, ws.live);
}

test("discloses the historical sleeping-counter wake default instead of hiding the MorphTile semantic difference", () => {
  const built = run(omittedWakeRequest("cap-default-wake-warning"));
  assert.equal(built.status, "CANDIDATE");
  assert.deepEqual(built.candidate.capabilities[0].wake, { on: "signal", name: "increment" });
  assert.deepEqual(built.warnings, [DEFAULT_WAKE_WARNING]);

  const manual = run({
    ...request,
    request_id: "cap-explicit-manual-no-warning",
    intent: { kind: "sleeping-counter", wake: { on: "manual" } }
  });
  assert.equal(manual.status, "CANDIDATE");
  assert.deepEqual(manual.warnings, []);

  const signal = run({
    ...request,
    request_id: "cap-explicit-signal-no-warning",
    intent: { kind: "sleeping-counter", wake: { on: "signal", name: "increment" } }
  });
  assert.equal(signal.status, "CANDIDATE");
  assert.deepEqual(signal.warnings, []);
});

test("runtime proof distinguishes the machine compatibility default from raw MorphTile wake omission", { skip: corePath ? false : "set MORPHTILE_CORE to run cross-repo integration" }, () => {
  const MorphTile = require(path.resolve(corePath));
  const built = run(omittedWakeRequest("cap-default-wake-runtime"));
  assert.equal(built.status, "CANDIDATE");
  assert.deepEqual(built.warnings, [DEFAULT_WAKE_WARNING]);

  const machineTile = MorphTile.createTile({
    id: "machine-counter",
    name: "Machine compatibility wake fixture",
    capabilities: built.candidate.capabilities
  });
  const originalMachineMatter = MorphTile.clone(machineTile);
  const machineWorld = MorphTile.createWorld("Capability Machine omitted wake compatibility proof");
  machineWorld.tiles["machine-counter"] = machineTile;
  assert.deepEqual(MorphTile.validateWorld(machineWorld), { ok: true, errors: [] });

  const machineWs = MorphTile.createWorkspace(machineWorld);
  const incremented = MorphTile.act(machineWs, { do: "signal", tile: "machine-counter", name: "increment" }, "capability-machine-integration");
  assert.equal(incremented.ok, true);
  assert.equal(MorphTile.isAwake(machineWs.live, "machine-counter", "counter"), true, "machine v0.1 omitted wake compiles to explicit signal/increment wake");
  assert.equal(MorphTile.getVar(machineWs.live, "machine-counter", "count", machineWs.live.time), 1);
  assert.deepEqual(machineWs.live.tiles["machine-counter"], originalMachineMatter);
  assertReplay(MorphTile, machineWs);

  const rawCapability = clone(built.candidate.capabilities[0]);
  delete rawCapability.wake;
  const rawTile = MorphTile.createTile({
    id: "raw-counter",
    name: "Raw MorphTile omitted wake fixture",
    capabilities: [rawCapability]
  });
  const originalRawMatter = MorphTile.clone(rawTile);
  const rawWorld = MorphTile.createWorld("Raw MorphTile omitted wake proof");
  rawWorld.tiles["raw-counter"] = rawTile;
  assert.deepEqual(MorphTile.validateWorld(rawWorld), { ok: true, errors: [] });

  const rawWs = MorphTile.createWorkspace(rawWorld);
  const ignored = MorphTile.act(rawWs, { do: "signal", tile: "raw-counter", name: "increment" }, "capability-machine-integration");
  assert.equal(ignored.ok, true);
  assert.equal(MorphTile.isAwake(rawWs.live, "raw-counter", "counter"), false, "raw MorphTile wake omission remains manual");
  assert.equal(MorphTile.getVar(rawWs.live, "raw-counter", "count", rawWs.live.time), undefined);

  const manuallyWoke = MorphTile.act(rawWs, { do: "wake", tile: "raw-counter", capability: "counter" }, "capability-machine-integration");
  assert.equal(manuallyWoke.ok, true);
  assert.equal(MorphTile.isAwake(rawWs.live, "raw-counter", "counter"), true);
  assert.equal(MorphTile.getVar(rawWs.live, "raw-counter", "count", rawWs.live.time), 0);
  assert.deepEqual(rawWs.live.tiles["raw-counter"], originalRawMatter);
  assertReplay(MorphTile, rawWs);
});
