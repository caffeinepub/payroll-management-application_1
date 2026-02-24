# Specification

## Summary
**Goal:** Fix leave day calculation to count as 8 regular work hours and update payroll and leave balances accordingly.

**Planned changes:**
- Calculate leave days as 8 hours of regular work when added to employee calendar
- For hourly employees: add 8 hours × hourly rate to payroll calculations
- For monthly employees: deduct 1 day from leave balance without affecting salary
- Update leave balance immediately when leave is added
- Ensure payroll data reflects leave day additions in salary calculations

**User-visible outcome:** When adding a leave day to an employee in the calendar (individual or bulk entry), the system will correctly calculate it as 8 regular work hours, automatically updating the employee's payroll and leave balance based on their employment type (hourly or monthly).
