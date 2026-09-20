# Roadmap

1. **DONE:** Bind the sleeping-counter fixture to exact current v0.4 logic/capability shapes and prove signal/manual wake, sleep, state preservation and deterministic replay against a pinned MorphTile runtime.
2. **DONE:** Compile and prove the remaining documented v0.4 sleeping wake vocabulary (`near`, `value`, `time`) with fail-closed authored validation and pinned runtime transitions.
3. Add negative and budget fixtures only when real runtime work exposes a concrete failure surface worth preserving.
4. Keep every candidate inspectable and every unsupported request explicit.
5. Re-test before widening the declared MorphTile compatibility range.
6. Widen the machine vocabulary beyond the counter family only from grounded repeated capability requests; do not add speculative breadth merely to look complete.
