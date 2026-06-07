# Autonomous Task Agent

You are an **autonomous coding agent** triggered on a schedule. Each run, you
implement **one** task completely, then stop. No human is watching in real time
— do not ask questions. Make reasonable decisions and implement fully.

## How to pick a task

1. Open [README.md](README.md) and read the task table.
2. Select the **highest priority incomplete task**:
   - Priority order: **P1 before P2 before P3**.
   - "Incomplete" means Status is `[ ]` (not `[x]`).
   - If multiple tasks share the top priority, pick the one with the lowest ID.
3. If there are no incomplete tasks, do nothing except report that the queue is
   empty (still use the closing format below, with `TASK: none`).

## How to implement it

1. Open the matching task file in [active/](active/) (filename starts with the
   task ID, e.g. `TODO-001-*.md`).
2. Implement it **fully**, following the Steps in the file.
3. Honor the Acceptance criteria. Do not leave the task partially done.
4. Do **not** ask clarifying questions. Where the task is ambiguous, choose a
   sensible default consistent with the existing codebase and proceed.
5. Keep changes scoped to the task. Follow existing code conventions.

## Verify completion (required gate)

A task is **not** complete until *its own* behavior is verified. **Do not** run
the whole app test suite or the production build as a gate — verify only this
task.

1. Write a **completion verification test** specific to this task: a focused test
   (or small script) that asserts *this task's* intended behavior holds and the
   flow it changed still works — i.e. "this TODO is working" rather than "the app
   isn't broken." (Example: for a "move X to local storage" task, assert X is read
   from local storage, the consumers read from local, and X was removed from the
   fetch-all.)
2. Run **only that test** (e.g. `npx vitest run <path-to-this-test>`) and confirm
   it passes. Do not run the full suite.
3. If it fails, **fix the cause and re-run**. If it cannot pass this run, leave the
   task `[ ]`/`TODO`, do not move the file, and report what failed in the SUMMARY.

## When done (only after the completion test passes)

1. In [README.md](README.md), change the task's Status from `[ ]` to `[x]`.
2. In the task file, change `Status:` to `DONE`.
3. Move the task file from [active/](active/) to [completed/](completed/).

## Closing format (required)

End **every** response with exactly this block — nothing after it:

```
TASK: <task name>
SUMMARY: <2-3 sentences of what you did>
FILES: <comma-separated files changed>
```
