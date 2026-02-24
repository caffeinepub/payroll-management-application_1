# Employee Calendar Synchronization Documentation

## Overview
This document describes the bidirectional synchronization behavior between Individual and Bulk work hour entry modes in the Employee Calendar feature.

## React Query Cache Invalidation Strategy

### Individual Entry → Bulk Entry Synchronization
When a user adds or updates work hours via the **Individual Calendar** dialog (`useAddWorkDay` mutation):

**Invalidated Query Keys:**
- `['workDays']` - Individual per-employee work days list
- `['workDay']` - Individual per-day work day detail
- `['dailyBulkWorkDays']` - **Bulk daily view** (ensures bulk table reflects individual changes)
- `['leaveRecords']` - All employee leave records
- `['leaveRecord']` - Individual employee leave record
- `['payrollData']` - Payroll calculations
- `['payrollDataWithCarryover']` - Payroll with carryover data

**Why:** React Query's prefix matching ensures that invalidating `['workDays']` will also invalidate all queries starting with that prefix, such as `['workDays', employeeId]`. This guarantees that when a user saves hours for an employee on a specific date via the Individual calendar, the Bulk Daily table will automatically reflect those changes.

### Bulk Entry → Individual Entry Synchronization
When a user saves work hours via the **Bulk Daily Entry** table (`useSaveDailyBulkWorkDays` mutation):

**Invalidated Query Keys:**
- `['dailyBulkWorkDays']` - Bulk daily view
- `['workDays']` - **Individual per-employee work days list** (ensures individual calendar reflects bulk changes)
- `['workDay']` - **Individual per-day work day detail** (ensures individual calendar reflects bulk changes)
- `['leaveRecords']` - All employee leave records
- `['leaveRecord']` - Individual employee leave record
- `['payrollData']` - Payroll calculations
- `['payrollDataWithCarryover']` - Payroll with carryover data

**Why:** Invalidating `['workDays']` and `['workDay']` ensures that when a user saves hours via the Bulk Daily table, navigating to the Individual calendar for any affected employee will show the updated values without requiring a manual refresh.

## Backend Integration
Both mutations call backend methods that:
1. Update the work day data in the backend storage
2. Automatically trigger payroll recalculation
3. Update leave balances if the work day is marked as leave

The backend methods used are:
- `addWorkDay(employeeId, workDay)` - For individual entry
- `saveDailyBulkWorkDays(date, entries)` - For bulk entry

## Key Implementation Notes
- **Prefix Matching:** React Query invalidates all queries that start with the specified key prefix. For example, `invalidateQueries({ queryKey: ['workDays'] })` will invalidate `['workDays', '123']`, `['workDays', '456']`, etc.
- **No Manual Refresh Required:** Users do not need to refresh the page or navigate away to see synchronized data.
- **Automatic Payroll Updates:** Both entry modes automatically trigger payroll recalculation, ensuring that the Payroll page always reflects the latest work hours.
- **Leave Integration:** If a work day is marked as leave, the leave balance is automatically updated and reflected in both the Leave page and the Individual/Bulk calendar views.

## Future Maintenance
When modifying work day entry functionality:
1. Ensure all mutations that modify work day data invalidate both `['workDays']` and `['dailyBulkWorkDays']` query keys
2. Always invalidate `['payrollData']` to keep payroll calculations in sync
3. If leave functionality is involved, invalidate `['leaveRecords']` as well
4. Test bidirectional synchronization by:
   - Adding hours via Individual calendar and verifying Bulk table updates
   - Adding hours via Bulk table and verifying Individual calendar updates
   - Checking that payroll calculations reflect the changes immediately

