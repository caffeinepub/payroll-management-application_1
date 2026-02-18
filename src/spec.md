# Specification

## Summary
**Goal:** Remove blocking authorization errors so anyone opening the app via link can use it and add employees, while keeping admin-only operations restricted.

**Planned changes:**
- Update backend authorization to allow anonymous/non-admin callers to access Employees page-required methods and successfully run the addEmployee flow without triggering “Only users/admins can perform this action” traps.
- Ensure admin-only backend operations remain restricted and continue to fail for non-admin callers.
- Adjust frontend handling (without UI/layout changes) so the previous authorization error strings are no longer shown during normal flows once backend authorization is corrected.

**User-visible outcome:** Anyone with the app link can open the app and add employees successfully without seeing authorization error messages; admin-only actions remain unavailable to non-admin users.
