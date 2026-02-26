# Specification

## Summary
**Goal:** Restore data visibility in the HR Payroll Manager after a canister upgrade by fixing stable state declarations in the backend and ensuring the frontend correctly fetches and displays all previously stored data.

**Planned changes:**
- Audit all state collections in `backend/main.mo` (employees, work days, payments, leave records, monthly bank salaries, payroll records) and ensure every collection is declared as a `stable` variable so data survives canister upgrades.
- Create `backend/migration.mo` with a pre/post-upgrade pattern that preserves and migrates existing stable state from previous deployments without data loss.
- Fix `useQueries.ts` frontend data-fetching hooks to correctly fetch and display data from the upgraded backend across all pages (Employees, Calendar, Payments, Payroll, Monthly Bank Salaries, Leave), including proper React Query cache invalidation.

**User-visible outcome:** After deploying the updated canister, all previously entered employees, work hours, payments, leave records, and salary data reappear correctly on every page without requiring a manual refresh, and payroll calculations produce the same correct results as before.
