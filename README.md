# MorphTile Capability Machine

Builds candidate state, action, and sleeping-capability matter. The foundation proves a deterministic counter description.

## Boundary answers

1. **What it does:** Builds candidate state, action, and sleeping-capability matter. The foundation proves a deterministic counter description.
2. **What it does not own:** UI presentation, canonical worlds, unrestricted host permissions, hidden runtime code, or merge authority.
3. **What it accepts:** axm.morphtile.capability-request/v0.1 in the provisional v0.1 envelope.
4. **What it produces:** A morphtile.capability-candidate/v0.4 fragment.
5. **MorphTile interaction:** output goes through MorphTile's public contracts and clone → plan → commit → receipt → rollback path. MorphTile does not depend on this repository.
6. **Evidence:** Deterministic pure-output and HOLD tests.
7. **When it cannot satisfy a request:** Unexpressed behaviors return HOLD_CAPABILITY_NOT_EXPRESSIBLE.

## Run

    npm test

Node 18 or later; zero runtime dependencies; no secrets or network required.

## Truth boundary

- IMPLEMENTED: the tiny adapter and local envelope used by the fixtures.
- TESTED: the claims named by the local test files.
- EXPERIMENTAL: envelope v0.1 and every candidate schema in this foundation.
- NOT TESTED: compatibility beyond MorphTile commit 13d83a2b2c0d12644442d3d9e45bcbe0af19876a.
- HELD: The counter has not yet been executed by MorphTile; the sleeping shape remains a candidate.

This is a foundation, not evidence that MorphTile can autonomously manufacture MorphTile.

