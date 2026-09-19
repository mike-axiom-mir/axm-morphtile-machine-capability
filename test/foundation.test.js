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
});

test("holds a capability outside the proven vocabulary", () => {
  assert.equal(run({ ...request, request_id: "cap-held", intent: { kind: "telepathy" } }).status, "HOLD");
});
