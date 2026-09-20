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

test("compiles the full currently proven MorphTile wake vocabulary exactly", () => {
  const cases = [
    ["manual", { on: "manual" }, { on: "manual" }],
    ["signal", { on: "signal", name: "activate" }, { on: "signal", name: "activate" }],
    ["near-defaults", { on: "near" }, { on: "near", within: 8, hysteresis: 1.25 }],
    ["near-explicit", { on: "near", within: 4, hysteresis: 1.5 }, { on: "near", within: 4, hysteresis: 1.5 }],
    ["near-retain", { on: "near", within: 4, sleeps: false }, { on: "near", within: 4, hysteresis: 1.25, sleeps: false }],
    ["value-over", { on: "value", var: "armed", over: 2 }, { on: "value", var: "armed", over: 2 }],
    ["value-under-child", { on: "value", tile: "sensor/inner", var: "heat", under: 10 }, { on: "value", tile: "sensor/inner", var: "heat", under: 10 }],
    ["value-self-retain", { on: "value", tile: "", var: "armed", over: 2, sleeps: false }, { on: "value", tile: "", var: "armed", over: 2, sleeps: false }],
    ["time", { on: "time", after: 12, sleeps: true }, { on: "time", after: 12, sleeps: true }]
  ];

  for (const [name, wake, expected] of cases) {
    const built = run({
      ...request,
      request_id: `cap-wake-${name}`,
      intent: { kind: "sleeping-counter", wake }
    });
    assert.equal(built.status, "CANDIDATE", name);
    assert.deepEqual(built.candidate.capabilities[0].wake, expected, name);
  }
});

test("holds unproven wake modes separately from malformed proven modes", () => {
  const held = run({
    ...request,
    request_id: "cap-unknown-wake-held",
    intent: { kind: "sleeping-counter", wake: { on: "proximity-magic", within: 4 } }
  });
  assert.equal(held.status, "HOLD");
  assert.deepEqual(held.holds, [{
    code: "HOLD_WAKE_RULE_NOT_PROVEN",
    on: "proximity-magic",
    supported: ["manual", "signal", "near", "value", "time"]
  }]);
  assert.equal(held.suggested_missing_capability, "wake:proximity-magic");
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
    intent: { kind: "sleeping-counter", wake: { on: "signal", name: "increment", sleeps: false, typo: 1 } }
  });
  assert.deepEqual(unknown.holds, [{
    code: "HOLD_WAKE_RULE_FIELD_UNKNOWN",
    on: "signal",
    fields: ["sleeps", "typo"]
  }]);
});

test("holds malformed near wake parameters", () => {
  const cases = [
    [{ on: "near", within: 0 }, "near wake within must be a positive finite number"],
    [{ on: "near", within: "4" }, "near wake within must be a positive finite number"],
    [{ on: "near", within: 4, hysteresis: 0.5 }, "near wake hysteresis must be a finite number >= 1"],
    [{ on: "near", within: 4, hysteresis: Infinity }, "near wake hysteresis must be a finite number >= 1"]
  ];
  for (const [index, [wake, reason]] of cases.entries()) {
    const held = run({ ...request, request_id: `cap-near-invalid-${index}`, intent: { kind: "sleeping-counter", wake } });
    assert.deepEqual(held.holds, [{ code: "HOLD_WAKE_RULE_INVALID", reason }]);
  }
});

test("holds malformed value wake references and ambiguous thresholds", () => {
  const cases = [
    [{ on: "value", var: "", over: 1 }, "value wake requires a non-empty var name"],
    [{ on: "value", tile: "../sensor", var: "armed", over: 1 }, "value wake tile must be a descendant tile path or empty for this tile"],
    [{ on: "value", var: "armed" }, "value wake requires exactly one of over or under"],
    [{ on: "value", var: "armed", over: 1, under: 0 }, "value wake requires exactly one of over or under"],
    [{ on: "value", var: "armed", over: "1" }, "value wake threshold must be a finite number"]
  ];
  for (const [index, [wake, reason]] of cases.entries()) {
    const held = run({ ...request, request_id: `cap-value-invalid-${index}`, intent: { kind: "sleeping-counter", wake } });
    assert.deepEqual(held.holds, [{ code: "HOLD_WAKE_RULE_INVALID", reason }]);
  }
});

test("holds malformed time wake thresholds", () => {
  for (const [index, after] of [-1, "5", Infinity, NaN].entries()) {
    const held = run({
      ...request,
      request_id: `cap-time-invalid-${index}`,
      intent: { kind: "sleeping-counter", wake: { on: "time", after } }
    });
    assert.deepEqual(held.holds, [{
      code: "HOLD_WAKE_RULE_INVALID",
      reason: "time wake after must be a non-negative finite number"
    }]);
  }
});

test("holds non-boolean sleeps on every mode that supports retention control", () => {
  const cases = [
    ["near", { on: "near", sleeps: "no" }],
    ["value", { on: "value", var: "armed", over: 1, sleeps: 0 }],
    ["time", { on: "time", after: 1, sleeps: null }]
  ];
  for (const [mode, wake] of cases) {
    const held = run({
      ...request,
      request_id: `cap-${mode}-sleeps-invalid`,
      intent: { kind: "sleeping-counter", wake }
    });
    assert.deepEqual(held.holds, [{
      code: "HOLD_WAKE_RULE_INVALID",
      reason: `${mode} wake sleeps must be boolean when supplied`
    }]);
  }
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
