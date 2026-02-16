# Specification

## Summary
**Goal:** Ensure bidirectional synchronization between Individual and Daily Bulk work-hour entry flows in the Employee Calendar, with payroll recalculation reflecting the latest saved hours.

**Planned changes:**
- Backend: Store and serve work-hour entries (normal hours, overtime, and leave status) from a single source of truth so saves from either Individual or Bulk immediately appear in the other view for the same date.
- Backend: Trigger payroll recalculation when hours are added/updated via either Individual workday saving or Bulk daily saving, so payroll queries return updated totals without extra user actions.
- Backend: Update the Daily Bulk retrieval API to return the currently stored per-employee WorkDay values for the requested date (consistent with Individual workday retrieval).
- Frontend: On successful Bulk Daily save, invalidate/refresh both bulk daily and individual workday React Query cache keys so the Individual calendar updates immediately after bulk saves.
- Keep all other functionality and UI behavior unchanged outside this synchronization and dependent payroll refresh behavior.

**User-visible outcome:** Saving hours/leave in either the Individual calendar dialog or the Daily Bulk table is immediately reflected in the other view for the same date, and payroll screens reflect updated totals right after saving.
