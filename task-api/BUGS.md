# Bug Report — Task API

While writing tests for `taskService.js`, I found three bugs. I fixed one and am documenting the other two as known issues rather than fixing them, for reasons explained below.

## 1. Fixed: `getPaginated` off-by-one (returned wrong page)

**File:** `src/services/taskService.js`
**Function:** `getPaginated(page, limit)`

**Before:**
```js
const offset = page * limit;
```

**Problem:** The route (`GET /tasks?page=1&limit=10`) treats `page=1` as the first page. But `offset = page * limit` gives `offset = 10` for `page=1, limit=10`, so the "first page" actually returned tasks 11–20 and skipped the true first 10 tasks entirely. Page 2 returned an empty array once fewer than 20 tasks existed.

**Fix:**
```js
const offset = (page - 1) * limit;
```

**Test coverage:** `tests/taskService.test.js` → `getPaginated` describe block (2 tests, both passing).

**Why I fixed this one:** Highest impact — it silently corrupts the very first page of results for every paginated request, which is the default/most common use case.

---

## 2. Known issue (not fixed): `getByStatus` uses substring matching instead of exact matching

**File:** `src/services/taskService.js`
**Function:** `getByStatus(status)`

```js
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

**Problem:** `String.prototype.includes` is used instead of strict equality. Filtering by `?status=progress` (not a valid status at all) incorrectly matches every task with status `in_progress`, because `'in_progress'.includes('progress')` is `true`.

**Suggested fix:**
```js
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

**Test coverage:** A failing test exists but is marked `it.skip` in `tests/taskService.test.js` (`getByStatus` block) so it documents the bug without breaking the test suite.

**Why I didn't fix this:** No reported requirement described intended "fuzzy" status matching, and it's plausible (though unlikely) this was intentional partial-match behavior rather than a bug. I flagged it instead of silently changing filter semantics on an API that might have consumers depending on current behavior — the fix is a one-line change if the team confirms exact-match is the intended semantics.

---

## 3. Known issue (not fixed): `completeTask` resets priority to `medium`

**File:** `src/services/taskService.js`
**Function:** `completeTask(id)`

```js
const updated = {
  ...task,
  priority: 'medium',
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**Problem:** Completing any task — regardless of its original priority — overwrites `priority` to `'medium'`. A `high`-priority task loses that information the moment it's marked done, which could affect historical reporting/analytics on completed high-priority work.

**Suggested fix:** Remove the `priority: 'medium'` line so the original priority is preserved:
```js
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**Test coverage:** A failing test exists but is marked `it.skip` in `tests/taskService.test.js` (`completeTask` block) so it documents the bug without breaking the test suite.

**Why I didn't fix this:** Same reasoning as #2 — there's a small chance this reset was deliberate (e.g. "priority no longer matters once done, normalize it for reporting"), so rather than assume and silently change behavior, I'm flagging it as a one-line fix pending confirmation of intent.
