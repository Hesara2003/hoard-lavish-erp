# Task Queue

This is the work queue for the autonomous task agent. See [CLAUDE.md](CLAUDE.md)
for how the agent selects and processes tasks.

- **Priority:** `P1` (highest) → `P2` → `P3` (lowest).
- **Status:** `[ ]` incomplete, `[x]` done.
- Each row maps to a file in [active/](active/) named `TODO-<ID>-<slug>.md`.
  When a task is finished, its file moves to [completed/](completed/).

## Tasks

| ID  | Priority | Status | Task |
| --- | -------- | ------ | ---- |
| 001 | P1 | [ ] | Move branches to local storage and drop them from the fetch-all |
| 002 | P1 | [ ] | Products — realtime qty deltas + daily catalog cache (drop from fetch-all/poll) |
| 003 | P2 | [ ] | Customers — lazy load + daily cache (drop from fetch-all) |
| 004 | P1 | [ ] | Dashboard — central on-demand sales loaders (no mount fetch, scoped + cached) |
<!-- | 005 | P2 | [ ] | Short task name (matches TODO-005-*.md in active/) | -->
