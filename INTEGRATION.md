# MorphTile integration

Tested contract target:

- repository: mike-axiom-mir/axm-morphtile
- commit: ef2b3c6986aa1a333247feffc43a8443f17239d0
- format: v0.4
- provisional envelope: v0.1
- fixture set: v0.1

The adapter emits candidate data only. The receiving caller must validate it against the pinned MorphTile runtime, preserve the receiving project's normal authority/merge boundaries, and retain rollback/evidence where it commits real matter.

The repository CI checks out the pinned MorphTile source separately and runs Capability Machine output through MorphTile's public API. The integration suite verifies:

- candidates embed into valid ordinary MorphTile matter;
- sleeping capabilities start inert;
- manual, signal, near, value, and time wake semantics execute through the public runtime contract;
- named signal wake stays distinct from capability action execution;
- authored initial state is visible after wake without prematurely materializing sparse runtime state;
- near hysteresis supports automatic sleep while preserving sparse state;
- explicit `sleeps:false` on a near wake retains runtime activation after the observed condition becomes false;
- the documented empty value-wake `tile` reference resolves to the capability carrier itself;
- wake and sleep never rewrite canonical tile matter;
- replaying the MorphTile ledger reconstructs the exact live world hash and structure.

This proves the current candidate shapes against the pinned runtime only. It does not prove compatibility with other MorphTile revisions, production performance, arbitrary capability families, or visual quality.

No MorphTile core extension is required for the tested retention/self-relative wake behavior. MorphTile v0.4 already documents and executes boolean `sleeps` on near/value/time descriptors and accepts an empty value-wake tile reference as the carrier itself, so this gap belongs in Capability Machine's compilation/verification layer rather than MorphTile core.
