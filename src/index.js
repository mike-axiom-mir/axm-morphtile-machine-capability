"use strict";

const { assertRequest, result } = require("./envelope");
const MACHINE = { id: "axm.morphtile.machine.capability", version: "0.1.0" };
const PROVEN_WAKE_MODES = ["manual", "signal"];
const INTENT_FIELDS = new Set(["kind", "wake", "initial"]);

function compileWake(wake) {
  const value = wake === undefined ? { on: "signal", name: "increment" } : wake;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "wake must be an object" } };
  }
  if (typeof value.on !== "string" || !value.on) {
    return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "wake.on must be a non-empty string" } };
  }
  if (!PROVEN_WAKE_MODES.includes(value.on)) {
    return { ok: false, hold: { code: "HOLD_WAKE_RULE_NOT_PROVEN", on: value.on, supported: PROVEN_WAKE_MODES.slice() } };
  }

  const allowed = value.on === "signal" ? new Set(["on", "name"]) : new Set(["on"]);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key)).sort();
  if (unknown.length) {
    return { ok: false, hold: { code: "HOLD_WAKE_RULE_FIELD_UNKNOWN", on: value.on, fields: unknown } };
  }

  if (value.on === "signal") {
    if (typeof value.name !== "string" || !value.name) {
      return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "signal wake requires a non-empty name" } };
    }
    return { ok: true, wake: { on: "signal", name: value.name } };
  }

  return { ok: true, wake: { on: "manual" } };
}

function compileIntent(rawIntent) {
  if (rawIntent === undefined) return { ok: true, intent: {} };
  if (!rawIntent || typeof rawIntent !== "object" || Array.isArray(rawIntent)) {
    return { ok: false, hold: { code: "HOLD_CAPABILITY_INTENT_INVALID", reason: "intent must be an object" } };
  }

  const unknown = Object.keys(rawIntent).filter((key) => !INTENT_FIELDS.has(key)).sort();
  if (unknown.length) {
    return { ok: false, hold: { code: "HOLD_CAPABILITY_INTENT_FIELD_UNKNOWN", fields: unknown } };
  }

  return { ok: true, intent: rawIntent };
}

function compileInitial(rawInitial) {
  if (rawInitial === undefined) return { ok: true, initial: 0 };
  if (!Number.isSafeInteger(rawInitial)) {
    return {
      ok: false,
      hold: {
        code: "HOLD_COUNTER_INITIAL_INVALID",
        reason: "initial must be a safe integer"
      }
    };
  }
  return { ok: true, initial: rawInitial };
}

function run(request) {
  assertRequest(request);
  const compiledIntent = compileIntent(request.intent);
  if (!compiledIntent.ok) {
    return result(request, MACHINE, "HOLD", { holds: [compiledIntent.hold] });
  }

  const intent = compiledIntent.intent;
  if (intent.kind && intent.kind !== "counter" && intent.kind !== "sleeping-counter") {
    return result(request, MACHINE, "HOLD", {
      holds: [{ code: "HOLD_CAPABILITY_NOT_EXPRESSIBLE", kind: intent.kind }],
      suggested_missing_capability: "capability:" + intent.kind
    });
  }
  const sleeping = intent.kind === "sleeping-counter";
  if (!sleeping && intent.wake !== undefined) {
    return result(request, MACHINE, "HOLD", {
      holds: [{ code: "HOLD_WAKE_RULE_NOT_APPLICABLE", kind: intent.kind || "counter" }]
    });
  }

  const initial = compileInitial(intent.initial);
  if (!initial.ok) {
    return result(request, MACHINE, "HOLD", { holds: [initial.hold] });
  }

  const wake = sleeping ? compileWake(intent.wake) : null;
  if (wake && !wake.ok) {
    return result(request, MACHINE, "HOLD", {
      holds: [wake.hold],
      suggested_missing_capability: wake.hold.code === "HOLD_WAKE_RULE_NOT_PROVEN" ? "wake:" + wake.hold.on : null
    });
  }

  const logic = { type: "rule", data: { vars: { count: initial.initial }, rules: [{ on: "increment", do: [{ set: ["count", ["+", ["var", "count"], 1]] }] }] } };
  const socket = { id: "increment", kind: "signal", dir: "in", signal: "increment", label: "Increment" };
  return result(request, MACHINE, "CANDIDATE", {
    candidate: sleeping
      ? { schema: "morphtile.capability-candidate/v0.4", capabilities: [{ id: "counter", wake: wake.wake, grants: { facets: { logic }, sockets: [socket] } }] }
      : { schema: "morphtile.capability-candidate/v0.4", facets: { logic, connect: { sockets: [socket], bridges: [] } } },
    evidence: [{ kind: "DETERMINISTIC_OUTPUT", status: "PASS", check: "same validated request maps to the same candidate bytes" }]
  });
}

module.exports = { MACHINE, PROVEN_WAKE_MODES, INTENT_FIELDS, compileWake, compileIntent, compileInitial, run };
