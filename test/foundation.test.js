const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("../fixtures/request.sleeping-counter.json");
const { run } = require("../src");

test("returns the same stateful sleeping capability for the same request", () => {
  const first = run(request), second = run(request);
  assert.deepEqual(first, second);
  assert.equal(first.status, "CANDIDATE");
  assert.deepEqual(first.candidate.capabilities[0].wake, { on: "signal", name: "increment" });
  assert.equal(first.candidate.capabilities[0].grants.facets.logic.data.vars.count, 0);
  assert.deepEqual(first.evidence, [{
    kind: "DETERMINISTIC_OUTPUT",
    status: "PASS",
    check: "same validated request maps to the same candidate bytes"
  }]);
});

test("holds a capability outside the proven vocabulary", () => {
  assert.equal(run({ ...request, request_id: "cap-held", intent: { kind: "telepathy" } }).status, "HOLD");
});

test("holds wake modes that are representable by MorphTile but not yet proven by this machine", () => {
  const held = run({
    ...request,
    request_id: "cap-near-wake-held",
    intent: { kind: "sleeping-counter", wake: { on: "near", within: 4 } }
  });
  assert.equal(held.status, "HOLD");
  assert.equal(held.candidate, null);
  assert.deepEqual(held.holds, [{
    code: "HOLD_WAKE_RULE_NOT_PROVEN",
    on: "near",
    supported: ["manual", "signal"]
  }]);
  assert.equal(held.suggested_missing_capability, "wake:near");
});

test("holds malformed and unknown wake fields instead of silently ignoring authored meaning", () => {
  const malformed = run({
    ...request,
    request_id: "cap-signal-name-held",
    intent: { kind: "sleeping-counter", wake: { on: "signal", name: "" } }
  });
  assert.deepEqual(malformed.holds, [{
    code: "HOLD_WAKE_RULE_INVALID",
    reason: "signal wake requires a non-empty name"
  }]);

  const unknown = run({
    ...request,
    request_id: "cap-wake-fields-held",
    intent: { kind: "sleeping-counter", wake: { on: "signal", name: "increment", zeta: true, typo: 1 } }
  });
  assert.deepEqual(unknown.holds, [{
    code: "HOLD_WAKE_RULE_FIELD_UNKNOWN",
    on: "signal",
    fields: ["typo", "zeta"]
  }]);
});

test("holds wake configuration on a non-sleeping counter instead of dropping it", () => {
  const held = run({
    ...request,
    request_id: "cap-counter-wake-held",
    intent: { kind: "counter", wake: { on: "manual" } }
  });
  assert.equal(held.status, "HOLD");
  assert.deepEqual(held.holds, [{ code: "HOLD_WAKE_RULE_NOT_APPLICABLE", kind: "counter" }]);
});

test("emits the only additionally proven manual wake shape exactly", () => {
  const manual = run({
    ...request,
    request_id: "cap-manual-wake",
    intent: { kind: "sleeping-counter", wake: { on: "manual" } }
  });
  assert.equal(manual.status, "CANDIDATE");
  assert.deepEqual(manual.candidate.capabilities[0].wake, { on: "manual" });
});
