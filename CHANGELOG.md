# Changelog

## 0.1.0 — 2026-09-19

- Established the isolated repository boundary.
- Added provisional envelope v0.1, machine manifest, fixture, executable proof, tests, and minimal CI.
- Pinned the exact MorphTile v0.4 commit tested as a contract target.
- Recorded unsupported work as HOLD or NOT TESTED.
- Added a pinned cross-repository MorphTile integration test for the sleeping-counter candidate.
- Proved signal wake, granted logic/socket activation, sparse state mutation, sleep/re-wake behavior, unchanged canonical tile matter, and exact ledger reconstruction on the pinned target.
- Corrected machine-local evidence from `REPLAY` to `DETERMINISTIC_OUTPUT`; pure mapping determinism is not runtime replay evidence.
