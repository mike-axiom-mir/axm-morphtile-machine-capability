# MorphTile Capability Machine

Builds candidate state, action, and sleeping-capability matter. The foundation proves a deterministic sleeping counter description and verifies that description against a pinned MorphTile v0.4 runtime.

## Boundary answers

1. **What it does:** Builds candidate state, action, and sleeping-capability matter. The current proven vocabulary is a counter and a signal-woken sleeping counter.
2. **What it does not own:** UI presentation, canonical worlds, unrestricted host permissions, hidden runtime code, or merge authority.
3. **What it accepts:** axm.morphtile.capability-request/v0.1 in the provisional v0.1 envelope.
4. **What it produces:** A morphtile.capability-candidate/v0.4 fragment.
5. **MorphTile interaction:** output goes through MorphTile's public contracts. MorphTile does not depend on this repository.
6. **Evidence:** deterministic pure-output/HOLD tests plus a pinned cross-repository MorphTile sleep/wake/replay integration test.
7. **When it cannot satisfy a request:** Unexpressed behaviors return HOLD_CAPABILITY_NOT_EXPRESSIBLE.

## Run

    npm test

Node 18 or later; zero runtime dependencies; no secrets or network required for the machine itself.

The cross-repository runtime test executes when `MORPHTILE_CORE` points to a checked-out MorphTile `core/morphtile.js`. CI supplies the pinned runtime automatically.

## Truth boundary

- IMPLEMENTED: the tiny adapter and local envelope used by the fixtures.
- TESTED: deterministic candidate generation, unsupported-intent HOLD behavior, and the sleeping-counter integration assertions against MorphTile commit `4346df01ed18cd1336064f9323d7766ff4f6338a`.
- VERIFIED IN INTEGRATION: the sleeping counter begins asleep, wakes on `increment`, exposes its granted logic/socket, increments state, sleeps without rewriting tile matter, re-wakes, and reconstructs to the same live-world hash.
- EXPERIMENTAL: envelope v0.1 and every candidate schema in this foundation.
- NOT TESTED: compatibility with MorphTile commits other than the pinned target, arbitrary capability families, visual quality, production performance, or autonomous capability invention.
- HELD: vocabulary beyond the proven counter pattern remains explicit HOLD territory until grounded by a real request and matching evidence.

The machine's `DETERMINISTIC_OUTPUT` evidence means only that the same validated request maps to the same candidate bytes. Runtime replay is proven separately by the MorphTile integration test; the two evidence classes are not interchangeable.

This is a foundation, not evidence that MorphTile can autonomously manufacture MorphTile.
