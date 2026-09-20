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

test("preserves the historical eager counter default only when kind is actually omitted", () => {
  const built = run({
    ...request,
    request_id: "cap-kind-omitted-default",
    intent: { initial: 4 }
  });
  assert.equal(built.status, "CANDIDATE");
  assert.equal(built.candidate.capabilities, undefined);
  assert.equal(built.candidate.facets.logic.data.vars.count, 4);
});

test("holds a capability outside the proven vocabulary", () => {
  const held = run({ ...request, request_id: "cap-held", intent: { kind: "telepathy" } });
  assert.equal(held.status, "HOLD");
  assert.equal(held.candidate, null);
  assert.deepEqual(held.holds, [{ code: "HOLD_CAPABILITY_NOT_EXPRESSIBLE", kind: "telepathy" }]);
  assert.equal(held.suggested_missing_capability, "capability:telepathy");
});

test("holds malformed intent instead of silently compiling the default counter", () => {
  const values = ["sleeping-counter", ["sleeping-counter"], null];
  for (const [index, intent] of values.entries()) {
    const held = run({ ...request, request_id: `cap-malformed-intent-${index}`, intent });
    assert.equal(held.status, "HOLD");
    assert.equal(held.candidate, null);
    assert.deepEqual(held.holds, [{
      code: "HOLD_CAPABILITY_INTENT_INVALID",
      reason: "intent must be an object"
    }]);
  }
});

test("holds malformed capability kind instead of treating falsey authored values as default counter", () => {
  const values = ["", "   ", 0, false, null, [], {}];
  for (const [index, kind] of values.entries()) {
    const held = run({
      ...request,
      request_id: `cap-malformed-kind-${index}`,
      intent: { kind }
    });
    assert.equal(held.status, "HOLD");
    assert.equal(held.candidate, null);
    assert.deepEqual(held.holds, [{
      code: "HOLD_CAPABILITY_KIND_INVALID",
      reason: "kind must be a non-empty, non-whitespace string when supplied"
    }]);
    assert.equal(held.suggested_missing_capability, null);
  }
});

test("holds unknown capability intent fields instead of dropping authored meaning", () => {
  const held = run({
    ...request,
    request_id: "cap-intent-fields-held",
    intent: { kind: "sleeping-counter", wake: { on: "manual" }, zeta: true, typo: 1 }
  });
  assert.equal(held.status, "HOLD");
  assert.equal(held.candidate, null);
  assert.deepEqual(held.holds, [{
    code: "HOLD_CAPABILITY_INTENT_FIELD_UNKNOWN",
    fields: ["typo", "zeta"]
  }]);
});

test("compiles explicit safe-integer initial state into both counter shapes", () => {
  const sleeping = run({
    ...request,
    request_id: "cap-initial-sleeping",
    intent: { kind: "sleeping-counter", wake: { on: "manual" }, initial: 7 }
  });
  assert.equal(sleeping.status, "CANDIDATE");
  assert.equal(sleeping.candidate.capabilities[0].grants.facets.logic.data.vars.count, 7);

  const eager = run({
    ...request,
    request_id: "cap-initial-eager",
    intent: { kind: "counter", initial: -3 }
  });
  assert.equal(eager.status, "CANDIDATE");
  assert.equal(eager.candidate.facets.logic.data.vars.count, -3);
});

test("holds invalid initial state rather than coercing authored values", () => {
  const values = [1.5, "5", null, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN];
  for (const [index, initial] of values.entries()) {
    const held = run({
      ...request,
      request_id: `cap-invalid-initial-${index}`,
      intent: { kind: "counter", initial }
    });
    assert.equal(held.status, "HOLD");
    assert.equal(held.candidate, null);
    assert.deepEqual(held.holds, [{
      code: "HOLD_COUNTER_INITIAL_INVALID",
      reason: "initial must be a safe integer"
    }]);
  }
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
