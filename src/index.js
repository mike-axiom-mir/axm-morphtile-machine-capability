"use strict";

const { assertRequest, result } = require("./envelope");
const MACHINE = { id: "axm.morphtile.machine.capability", version: "0.1.0" };
const PROVEN_WAKE_MODES = ["manual", "signal", "near", "value", "time"];
const INTENT_FIELDS = new Set(["kind", "wake", "initial"]);
const PROVEN_KINDS = ["counter", "sleeping-counter"];

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

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

  const allowedByMode = {
    manual: new Set(["on"]),
    signal: new Set(["on", "name"]),
    near: new Set(["on", "within", "hysteresis"]),
    value: new Set(["on", "tile", "var", "over", "under"]),
    time: new Set(["on", "after"])
  };
  const unknown = Object.keys(value).filter((key) => !allowedByMode[value.on].has(key)).sort();
  if (unknown.length) {
    return { ok: false, hold: { code: "HOLD_WAKE_RULE_FIELD_UNKNOWN", on: value.on, fields: unknown } };
  }

  if (value.on === "signal") {
    if (typeof value.name !== "string" || !value.name) {
      return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "signal wake requires a non-empty name" } };
    }
    return { ok: true, wake: { on: "signal", name: value.name } };
  }

  if (value.on === "near") {
    const within = value.within === undefined ? 8 : value.within;
    const hysteresis = value.hysteresis === undefined ? 1.25 : value.hysteresis;
    if (!finiteNumber(within) || within <= 0) {
      return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "near wake within must be a positive finite number" } };
    }
    if (!finiteNumber(hysteresis) || hysteresis < 1) {
      return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "near wake hysteresis must be a finite number >= 1" } };
    }
    return { ok: true, wake: { on: "near", within, hysteresis } };
  }

  if (value.on === "value") {
    if (value.tile !== undefined && (typeof value.tile !== "string" || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(value.tile))) {
      return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "value wake tile must be a descendant tile path when supplied" } };
    }
    if (typeof value.var !== "string" || !value.var) {
      return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "value wake requires a non-empty var name" } };
    }
    const hasOver = value.over !== undefined;
    const hasUnder = value.under !== undefined;
    if (hasOver === hasUnder) {
      return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "value wake requires exactly one of over or under" } };
    }
    const threshold = hasOver ? value.over : value.under;
    if (!finiteNumber(threshold)) {
      return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "value wake threshold must be a finite number" } };
    }
    const out = { on: "value" };
    if (value.tile !== undefined) out.tile = value.tile;
    out.var = value.var;
    if (hasOver) out.over = value.over;
    else out.under = value.under;
    return { ok: true, wake: out };
  }

  if (value.on === "time") {
    if (!finiteNumber(value.after) || value.after < 0) {
      return { ok: false, hold: { code: "HOLD_WAKE_RULE_INVALID", reason: "time wake after must be a non-negative finite number" } };
    }
    return { ok: true, wake: { on: "time", after: value.after } };
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

function compileKind(rawKind) {
  if (rawKind === undefined) return { ok: true, kind: "counter" };
  if (typeof rawKind !== "string" || rawKind.trim().length === 0) {
    return {
      ok: false,
      hold: {
        code: "HOLD_CAPABILITY_KIND_INVALID",
        reason: "kind must be a non-empty, non-whitespace string when supplied"
      }
    };
  }
  if (!PROVEN_KINDS.includes(rawKind)) {
    return {
      ok: false,
      hold: { code: "HOLD_CAPABILITY_NOT_EXPRESSIBLE", kind: rawKind },
      suggested_missing_capability: "capability:" + rawKind
    };
  }
  return { ok: true, kind: rawKind };
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
  const kind = compileKind(intent.kind);
  if (!kind.ok) {
    return result(request, MACHINE, "HOLD", {
      holds: [kind.hold],
      suggested_missing_capability: kind.suggested_missing_capability || null
    });
  }

  const sleeping = kind.kind === "sleeping-counter";
  if (!sleeping && intent.wake !== undefined) {
    return result(request, MACHINE, "HOLD", {
      holds: [{ code: "HOLD_WAKE_RULE_NOT_APPLICABLE", kind: kind.kind }]
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

module.exports = { MACHINE, PROVEN_WAKE_MODES, INTENT_FIELDS, PROVEN_KINDS, compileWake, compileIntent, compileKind, compileInitial, run };
