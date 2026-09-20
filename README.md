# MorphTile Capability Machine

Builds candidate state, action, and sleeping-capability matter. The foundation proves a deterministic sleeping counter description and verifies that description against a pinned MorphTile v0.4 runtime.

## Boundary answers

1. **What it does:** Builds candidate state, action, and sleeping-capability matter. The current proven vocabulary is a counter plus sleeping counters using explicit signal or manual wake rules.
2. **What it does not own:** UI presentation, canonical worlds, unrestricted host permissions, hidden runtime code, or merge authority.
3. **What it accepts:** axm.morphtile.capability-request/v0.1 in the provisional v0.1 envelope.
4. **What it produces:** A morphtile.capability-candidate/v0.4 fragment.
5. **MorphTile interaction:** output goes through MorphTile's public contracts. MorphTile does not depend on this repository.
6. **Evidence:** deterministic pure-output/HOLD tests plus pinned cross-repository MorphTile signal-wake, manual-wake, sleep and replay integration tests.
7. **When it cannot satisfy a request:** Unexpressed behaviors return HOLD_CAPABILITY_NOT_EXPRESSIBLE; malformed intent, unknown authored intent fields, malformed wake rules, unknown wake fields, inapplicable wake rules, and not-yet-proven wake modes all fail closed with explicit HOLD evidence.

## Intent contract

The current request vocabulary intentionally accepts only:

- `kind`
- `wake`

`intent` must be an object when supplied. Unknown intent fields are held rather than silently ignored. This prevents authored meaning such as an unsupported `initial`, `limit`, `reset`, or misspelled field from being dropped while the machine still emits an apparently valid counter.

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

- IMPLEMENTED: the tiny adapter, local envelope, fail-closed intent compiler, fail-closed wake compiler, and fixtures used by the tests.
- TESTED: deterministic candidate generation, malformed/unknown intent HOLD behavior, unsupported-intent HOLD behavior, wake-contract HOLD behavior, and sleeping-counter integration assertions against MorphTile commit `4346df01ed18cd1336064f9323d7766ff4f6338a`.
- VERIFIED IN INTEGRATION: signal wake and manual wake preserve sleeping semantics, activate the granted counter behavior only when appropriate, preserve canonical tile matter, preserve sparse state across sleep, and reconstruct to the same live-world hash.
- EXPERIMENTAL: envelope v0.1 and every candidate schema in this foundation.
- NOT TESTED: compatibility with MorphTile commits other than the pinned target, `near`/`value`/`time` wake modes, arbitrary capability families, visual quality, production performance, or autonomous capability invention.
- HELD: vocabulary beyond the proven counter pattern and proven wake shapes remains explicit HOLD territory until grounded by a real request and matching evidence.

The machine's `DETERMINISTIC_OUTPUT` evidence means only that the same validated request maps to the same candidate bytes. Runtime replay is proven separately by the MorphTile integration tests; the two evidence classes are not interchangeable.

This is a foundation, not evidence that MorphTile can autonomously manufacture MorphTile.
