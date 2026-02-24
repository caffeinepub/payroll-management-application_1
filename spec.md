# Specification

## Summary
**Goal:** Remove all admin-only permission checks in the backend so that any authenticated user can use all features of the Payroll Manager app.

**Planned changes:**
- Remove or bypass all admin role/permission guard checks in `main.mo` that throw "Only admins can perform this action" errors
- Ensure all operations (adding employees, recording work hours, managing monthly salaries, adding payments, managing leave days) are accessible to any authenticated user

**User-visible outcome:** Any logged-in user can add employees, record work hours in the calendar, manage monthly salaries, add payments, and manage leave days without encountering permission errors.
