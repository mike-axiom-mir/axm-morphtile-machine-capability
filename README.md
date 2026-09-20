# MorphTile Capability Machine

Builds candidate state, action, and sleeping-capability matter. The foundation proves a deterministic counter/sleeping-counter description and verifies that description against a pinned MorphTile v0.4 runtime.

## Boundary answers

1. **What it does:** Builds candidate state, action, and sleeping-capability matter. The current proven vocabulary is a counter plus sleeping counters using MorphTile's documented `manual`, `signal`, `near`, `value`, or `time` wake rules, with an optional authored safe-integer initial count.
2. **What it does not own:** UI presentation, canonical worlds, unrestricted host permissions, hidden runtime code, or merge authority.
3. **What it accepts:** axm.morphtile.capability-request/v0.1 in the provisional v0.1 envelope.
4. **What it produces:** A morphtile.capability-candidate/v0.4 fragment.
5. **MorphTile interaction:** output goes through MorphTile's public contracts. MorphTile does not depend on this repository.
6. **Evidence:** deterministic pure-output/HOLD tests plus pinned cross-repository MorphTile signal/manual/near/value/time wake, wake-retention, authored-initial-state, sleep and replay integration tests.
7. **When it cannot satisfy a request:** Unexpressed behaviors return HOLD_CAPABILITY_NOT_EXPRESSIBLE; malformed intent, malformed/blank capability kind, unknown authored intent fields, invalid initial values, malformed wake rules, unknown wake fields, inapplicable wake rules, and wake modes outside the proven MorphTile vocabulary all fail closed with explicit HOLD evidence.

## Intent contract

The current request vocabulary intentionally accepts only:

- `kind`
- `wake`
- `initial`

`intent` must be an object when supplied. Unknown intent fields are held rather than silently ignored.

`kind` is optional only as a whole field. When omitted, the historical default remains `counter`. When supplied, it must be a non-empty, non-whitespace string. Non-string, empty, whitespace-only, `null`, array, and object values return `HOLD_CAPABILITY_KIND_INVALID`; they are never treated as if the author omitted `kind`. Strings outside the proven `counter|sleeping-counter` vocabulary remain `HOLD_CAPABILITY_NOT_EXPRESSIBLE` and identify the missing capability family.

`initial` is optional. When supplied it must be a JavaScript safe integer. It is compiled into the counter's authored logic variable default rather than into runtime mutation state. The default remains `0` when `initial` is omitted. Strings, fractions, `null`, non-finite numbers, and unsafe integers are rejected with `HOLD_COUNTER_INITIAL_INVALID`; they are never coerced.

Unsupported semantics such as `limit`, `reset`, arbitrary increment size, or misspelled fields remain explicit HOLD territory rather than being dropped while the machine emits an apparently valid counter.

## Wake-rule contract

The sleeping-counter compiler emits only wake shapes that this machine has explicitly validated against the pinned MorphTile v0.4 runtime:

- `{ "on": "manual" }`
- `{ "on": "signal", "name": "..." }`
- `{ "on": "near", "within": 8, "hysteresis": 1.25 }`
- `{ "on": "value", "var": "...", "over": 2 }` or the corresponding `under` form; optional `tile` is a descendant-relative tile path or `""` for the capability carrier itself
- `{ "on": "time", "after": 5 }`

Capability Machine v0.1 has one historical compatibility default that is intentionally different from raw MorphTile omission semantics: if a `sleeping-counter` request omits `intent.wake`, the machine compiles an explicit `{ "on": "signal", "name": "increment" }`. Raw MorphTile matter with an omitted capability `wake` means manual wake. The machine therefore returns a `WAKE_DEFAULT_COMPATIBILITY` warning whenever it applies its historical default. Callers that want MorphTile's raw default must author `{ "on": "manual" }` explicitly. The semantic difference is preserved for compatibility but is no longer silent.

`near` makes MorphTile's current runtime defaults explicit in emitted matter: omitted `within` becomes `8`, omitted `hysteresis` becomes `1.25`. `within` must be a positive finite number and `hysteresis` must be finite and at least `1`, preventing an inverted wake/sleep band.

`value` requires a non-empty variable name and exactly one finite `over` or `under` threshold. When `tile` is supplied it must be a descendant path or the documented empty string meaning "this tile"; parent traversal and ambiguous absolute-looking paths are held.

`near`, `value`, and `time` may carry boolean `sleeps`. When omitted or `true`, MorphTile may automatically sleep an awake capability when the observed condition becomes false. When explicitly `false`, the machine preserves that authored retention choice so the capability stays awake until another explicit sleep path acts. Non-boolean values fail closed. `manual` and `signal` do not accept `sleeps` because MorphTile's authored wake contract does not define it for those modes.

`time.after` must be a non-negative finite number. Wake conditions are still observations, not hidden mutation authority: proximity/value/time conditions become recorded wake/sleep events only when MorphTile's normal `settle` door is invoked.

Unknown wake modes remain `HOLD_WAKE_RULE_NOT_PROVEN`. Unknown fields are held instead of ignored, so misspelled authored intent cannot become a structurally valid but semantically different candidate.

## Run

    npm test

Node 18 or later; zero runtime dependencies; no secrets or network required for the machine itself.

The cross-repository runtime tests execute when `MORPHTILE_CORE` points to a checked-out MorphTile `core/morphtile.js`. CI supplies the pinned runtime automatically.

## Truth boundary

- IMPLEMENTED: the tiny adapter, local envelope, fail-closed intent compiler, strict capability-kind compiler, safe-integer initial-state compiler, fail-closed wake compiler, wake-retention compiler, and explicit compatibility warning for the historical omitted-wake normalization.
- TESTED: deterministic candidate generation, malformed/unknown intent HOLD behavior, malformed/unknown kind HOLD behavior, invalid-initial HOLD behavior, unsupported-intent HOLD behavior, strict field/type/range validation for the five compiled wake modes, documented empty self-relative value targets, boolean retention control, and disclosure of the historical omitted-wake default against MorphTile commit `ef2b3c6986aa1a333247feffc43a8443f17239d0`.
- VERIFIED IN INTEGRATION: signal and manual wake semantics; the machine's omitted `sleeping-counter` wake becoming explicit signal/increment while raw MorphTile wake omission remains manual; near radius/hysteresis wake and automatic sleep; `near` with `sleeps:false` retaining runtime activation after the condition becomes false; value threshold wake including the documented empty self tile reference; time threshold wake; authored initial state without premature sparse mutation; capability action after wake; state preservation through sleep; unchanged canonical tile matter; and ledger reconstruction to the exact live-world hash.
- EXPERIMENTAL: envelope v0.1 and every candidate schema in this foundation.
- NOT TESTED: compatibility with MorphTile commits other than the pinned target, arbitrary capability families, limits/reset/variable-step semantics, visual quality, production performance, or autonomous capability invention.
- HELD: vocabulary beyond the proven counter pattern, safe-integer initial count, and the proven MorphTile wake contract remains explicit HOLD territory until grounded by a real request and matching evidence.

The machine's `DETERMINISTIC_OUTPUT` evidence means only that the same validated request maps to the same candidate bytes. Runtime replay is proven separately by the MorphTile integration tests; the two evidence classes are not interchangeable.

This is a foundation, not evidence that MorphTile can autonomously manufacture MorphTile.
