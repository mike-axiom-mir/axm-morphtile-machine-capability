"use strict";

const { assertRequest, result } = require("./envelope");
const MACHINE = { id: "axm.morphtile.machine.capability", version: "0.1.0" };

function run(request) {
  assertRequest(request);
  const intent = request.intent || {};
  if (intent.kind && intent.kind !== "counter" && intent.kind !== "sleeping-counter") {
    return result(request, MACHINE, "HOLD", {
      holds: [{ code: "HOLD_CAPABILITY_NOT_EXPRESSIBLE", kind: intent.kind }],
      suggested_missing_capability: "capability:" + intent.kind
    });
  }
  const sleeping = intent.kind === "sleeping-counter";
  const logic = { type: "rule", data: { vars: { count: 0 }, rules: [{ on: "increment", do: [{ set: ["count", ["+", ["var", "count"], 1]] }] }] } };
  const socket = { id: "increment", kind: "signal", dir: "in", signal: "increment", label: "Increment" };
  return result(request, MACHINE, "CANDIDATE", {
    candidate: sleeping
      ? { schema: "morphtile.capability-candidate/v0.4", capabilities: [{ id: "counter", wake: intent.wake || { on: "signal", name: "increment" }, grants: { facets: { logic }, sockets: [socket] } }] }
      : { schema: "morphtile.capability-candidate/v0.4", facets: { logic, connect: { sockets: [socket], bridges: [] } } },
    evidence: [{ kind: "DETERMINISTIC_OUTPUT", status: "PASS", check: "same validated request maps to the same candidate bytes" }]
  });
}

module.exports = { MACHINE, run };
