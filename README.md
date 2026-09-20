# MorphTile Capability Machine

Builds candidate state, action, and sleeping-capability matter. The foundation proves a deterministic counter/sleeping-counter description and verifies that description against a pinned MorphTile v0.4 runtime.

## Boundary answers

1. **What it does:** Builds candidate state, action, and sleeping-capability matter. The current proven vocabulary is a counter plus sleeping counters using explicit signal or manual wake rules, with an optional authored safe-integer initial count.
2. **What it does not own:** UI presentation, canonical worlds, unrestricted host permissions, hidden runtime code, or merge authority.
3. **What it accepts:** axm.morphtile.capability-request/v0.1 in the provisional v0.1 envelope.
4. **What it produces:** A morphtile.capability-candidate/v0.4 fragment.
5. **MorphTile interaction:** output goes through MorphTile's public contracts. MorphTile does not depend on this repository.
6. **Evidence:** deterministic pure-output/HOLD tests plus pinned cross-repository MorphTile signal-wake, manual-wake, authored-initial-state, sleep and replay integration tests.
7. **When it cannot satisfy a request:** Unexpressed behaviors return HOLD_CAPABILITY_NOT_EXPRESSIBLE; malformed intent, malformed/blank capability kind, unknown authored intent fields, invalid initial values, malformed wake rules, unknown wake fields, inapplicable wake rules, and not-yet-proven wake modes all fail closed with explicit HOLD evidence.

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

The sleeping-counter compiler currently emits only wake shapes that this machine has explicitly tested:

- `{ "on": "signal", "name": "..." }`
- `{ "on": "manual" }`

Unsupported MorphTile wake modes such as `near`, `value`, or `time` are not silently passed through. They remain `HOLD_WAKE_RULE_NOT_PROVEN` until this machine has a grounded request and matching runtime evidence. Unknown fields are also held instead of ignored, so misspelled authored intent cannot become a structurally valid but semantically different candidate.

## Run

    npm test

Node 18 or later; zero runtime dependencies; no secrets or network required for the machine itself.

The cross-repository runtime tests execute when `MORPHTILE_CORE` points to a checked-out MorphTile `core/morphtile.js`. CI supplies the pinned runtime automatically.

## Truth boundary

- IMPLEMENTED: the tiny adapter, local envelope, fail-closed intent compiler, strict capability-kind compiler, safe-integer initial-state compiler, fail-closed wake compiler, and fixtures used by the tests.
- TESTED: deterministic candidate generation, malformed/unknown intent HOLD behavior, malformed/unknown kind HOLD behavior, invalid-initial HOLD behavior, unsupported-intent HOLD behavior, wake-contract HOLD behavior, and counter/sleeping-counter integration assertions against MorphTile commit `a579182ae585e5722ac87dd0cc8209963b18d000`.
- VERIFIED IN INTEGRATION: signal wake and manual wake preserve sleeping semantics; authored initial state becomes the active default without creating sparse mutation state; increment creates sparse state only after divergence; sleep/re-wake preserves that state; canonical tile matter remains unchanged; ledger reconstruction reaches the same live-world hash.
- EXPERIMENTAL: envelope v0.1 and every candidate schema in this foundation.
- NOT TESTED: compatibility with MorphTile commits other than the pinned target, `near`/`value`/`time` wake modes, arbitrary capability families, limits/reset/variable-step semantics, visual quality, production performance, or autonomous capability invention.
- HELD: vocabulary beyond the proven counter pattern, safe-integer initial count, and proven wake shapes remains explicit HOLD territory until grounded by a real request and matching evidence.

The machine's `DETERMINISTIC_OUTPUT` evidence means only that the same validated request maps to the same candidate bytes. Runtime replay is proven separately by the MorphTile integration tests; the two evidence classes are not interchangeable.

This is a foundation, not evidence that MorphTile can autonomously manufacture MorphTile.
