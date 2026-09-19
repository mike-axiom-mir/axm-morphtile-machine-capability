# MorphTile integration

Tested contract target:

- repository: mike-axiom-mir/axm-morphtile
- commit: 4346df01ed18cd1336064f9323d7766ff4f6338a
- format: v0.4
- provisional envelope: v0.1
- fixture set: v0.1

The adapter emits candidate data only. The receiving caller must validate it against the pinned MorphTile runtime, preserve the receiving project's normal authority/merge boundaries, and retain rollback/evidence where it commits real matter.

The repository CI checks out the pinned MorphTile source separately and runs the machine's sleeping-counter candidate through MorphTile's public API. The integration test verifies:

- the candidate can be embedded into valid ordinary MorphTile matter;
- the capability starts asleep;
- the declared `increment` signal wakes it;
- the granted rule logic and signal socket become active;
- the signal increments the counter state;
- sleeping removes runtime activation without rewriting canonical tile matter;
- sleeping preserves the sparse counter mutation when `forget` is not requested;
- the next signal wakes the same capability and increments again;
- replaying the MorphTile ledger reconstructs the exact live world hash and structure.

This proves the current candidate shape against the pinned runtime only. It does not prove compatibility with other MorphTile revisions, production performance, arbitrary capabilities, or visual quality.

No MorphTile core extension was required for this fixture. Signal wake, granted facets/sockets, sparse runtime state, sleep, and deterministic replay already exist in the substrate, so this gap belongs in the Capability Machine's verification layer rather than MorphTile core.
