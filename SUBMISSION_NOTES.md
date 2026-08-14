# Submission Notes

## What I'd test next with more time
- Concurrent request handling — the in-memory store isn't thread-safe in any meaningful sense, but if this became a real service, I'd want tests around race conditions on updates.
- `dueDate` edge cases in validators — e.g. dates far in the past/future, timezone-naive date strings.
- Load/perf behavior of `getAll()`/`getPaginated()` once the in-memory array gets large (no indexing, always O(n) scans).

## What surprised me
- The README's task shape documents `status` as `pending | in-progress | completed`, but the actual code (`validators.js`, `taskService.js`) and `ASSIGNMENT.md` both use `todo | in_progress | done`. The README is out of sync with the real API — worth flagging before shipping, since anyone integrating against the README alone would send invalid status values.
- `completeTask` silently overwrites a task's `priority` to `medium` on completion, which looked like an unintentional side effect rather than a documented feature (see BUGS.md #3).

## Questions I'd ask before shipping to production
- Is `getByStatus`'s substring matching intentional (e.g. for future fuzzy search), or a bug? I left it as a documented known issue rather than assuming (see BUGS.md #2).
- Should `PATCH /tasks/:id/assign` reject reassigning a task that already has an assignee, or is overwrite-on-reassign the desired behavior? I implemented overwrite since nothing in the spec said otherwise, but a real product decision here would probably want product/design input.
- Is persistence (a real database) already planned, or is in-memory storage intentional for this stage? Worth confirming before this goes anywhere near production traffic, since a restart currently wipes all data.
