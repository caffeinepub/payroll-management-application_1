import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Employee, WorkDay, LeaveRecord, PaymentRecord, ChangeHistory } from '../backend';
import { toast } from 'sonner';

/**
 * Helper function to convert number to string for backend
 * Always uses dot as decimal separator for backend compatibility
 * Preserves decimal precision without scientific notation
 */
function numberToString(value: number): string {
  // Handle special cases
  if (!isFinite(value) || isNaN(value)) {
    return '0';
  }
  
  // For integers, return as-is
  if (Number.isInteger(value)) {
    return value.toString();
  }
  
  // For decimals, use toFixed with sufficient precision then trim unnecessary zeros
  // Use 10 decimal places to preserve precision
  let str = value.toFixed(10);
  
  // Remove trailing zeros after decimal point
  str = str.replace(/(\.\d*?)0+$/, '$1');
  
  // Remove decimal point if no decimals remain
  str = str.replace(/\.$/, '');
  
  return str;
}

/**
 * Helper function to format date as DD-MM-YYYY
 */
function formatDateForDisplay(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Helper function to create change description in Greek
 */
function createChangeDescription(
  changeType: string,
  oldValue: number | bigint | undefined,
  newValue: number | bigint | undefined
): string {
  const formatValue = (val: number | bigint | undefined) => {
    if (val === undefined || val === null) return 'N/A';
    if (typeof val === 'bigint') return val.toString();
    return `€${val.toFixed(2)}`;
  };

  switch (changeType) {
    case 'hourlyRate':
      return `Ωριαία αμοιβή από ${formatValue(oldValue as number)} σε ${formatValue(newValue as number)}`;
    case 'overtimeRate':
      return `Αμοιβή υπερωριών από ${formatValue(oldValue as number)} σε ${formatValue(newValue as number)}`;
    case 'fixedMonthlySalary':
      return `Μηνιαίος μισθός από ${formatValue(oldValue as number)} σε ${formatValue(newValue as number)}`;
    case 'totalAnnualLeaveDays':
      return `Ετήσιες ημέρες άδειας από ${oldValue?.toString() || 'N/A'} σε ${newValue?.toString() || 'N/A'}`;
    default:
      return `Αλλαγή στο πεδίο ${changeType}`;
  }
}

// Type for payroll data with carryover
export type PayrollDataWithCarryover = {
  totalMonthlySalary: number;
  monthlyBankSalary: number;
  totalCashPayments: number;
  totalBankPayments: number;
  remainingRealSalary: number;
  remainingBankBalance: number;
  normalHours: number;
  overtimeHours: number;
  leaveHours: number;
  carryoverFromPrevious?: number;
  carryoverBankFromPrevious?: number;
};

export type EmployeePayrollDataWithCarryover = {
  employee: Employee;
  totalMonthlySalary: number;
  monthlyBankSalary: number;
  totalCashPayments: number;
  totalBankPayments: number;
  remainingRealSalary: number;
  remainingBankBalance: number;
  normalHours: number;
  overtimeHours: number;
  leaveHours: number;
  carryoverFromPrevious?: number;
  carryoverBankFromPrevious?: number;
};

// Employee Queries
export function useGetAllEmployees() {
  const { actor, isFetching } = useActor();

  return useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      if (!actor) return [];
      const employees = await actor.getAllEmployees();
      return employees;
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true,
  });
}

export function useGetEmployee(employeeId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Employee | null>({
    queryKey: ['employee', employeeId?.toString()],
    queryFn: async () => {
      if (!actor || !employeeId) return null;
      return actor.getEmployee(employeeId);
    },
    enabled: !!actor && !isFetching && employeeId !== null,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
  });
}

export function useGetChangeHistoryLog(employeeId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<ChangeHistory>({
    queryKey: ['changeHistory', employeeId?.toString()],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      return actor.getChangeHistoryLog(employeeId);
    },
    enabled: !!actor && !isFetching && employeeId !== null,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
  });
}

export function useAddEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      fullName: string;
      employeeType: string;
      hourlyRate: number;
      overtimeRate: number;
      fixedMonthlySalary: number | null;
      totalAnnualLeaveDays: bigint;
      email: string | null;
      phone: string | null;
      bankIban: string | null;
    }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Convert numbers to strings with dot as decimal separator
      const hourlyRateStr = numberToString(data.hourlyRate);
      const overtimeRateStr = numberToString(data.overtimeRate);
      const fixedMonthlySalaryStr = data.fixedMonthlySalary !== null 
        ? numberToString(data.fixedMonthlySalary)
        : null;
      
      // Call backend to add employee - backend handles all initialization
      const newEmployeeId = await actor.addEmployee(
        data.fullName,
        hourlyRateStr,
        overtimeRateStr,
        fixedMonthlySalaryStr,
        data.totalAnnualLeaveDays,
        data.email,
        data.phone,
        data.bankIban,
        data.employeeType
      );
      
      return { newEmployeeId, data };
    },
    onMutate: async (newEmployee) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['employees'] });
      
      // Snapshot previous value
      const previousEmployees = queryClient.getQueryData<Employee[]>(['employees']);
      
      // Optimistically update to show new employee immediately
      if (previousEmployees) {
        const optimisticEmployee: Employee = {
          id: BigInt(Date.now()), // Temporary ID
          fullName: newEmployee.fullName,
          hourlyRate: newEmployee.hourlyRate,
          overtimeRate: newEmployee.overtimeRate,
          fixedMonthlySalary: newEmployee.fixedMonthlySalary ?? undefined,
          totalAnnualLeaveDays: newEmployee.totalAnnualLeaveDays,
          email: newEmployee.email ?? undefined,
          phone: newEmployee.phone ?? undefined,
          bankIban: newEmployee.bankIban ?? undefined,
          employeeType: newEmployee.employeeType,
        };
        
        queryClient.setQueryData<Employee[]>(['employees'], [...previousEmployees, optimisticEmployee]);
      }
      
      return { previousEmployees };
    },
    onSuccess: async (result, variables, context) => {
      // Invalidate all employee-related queries
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['changeHistory'] });
      
      // Show success message
      toast.success('Επιτυχία! Ο εργαζόμενος προστέθηκε με επιτυχία.', {
        duration: 3000,
        description: 'Ο νέος εργαζόμενος είναι τώρα διαθέσιμος σε όλες τις λειτουργίες της εφαρμογής.',
      });
      
      return result.newEmployeeId;
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousEmployees) {
        queryClient.setQueryData(['employees'], context.previousEmployees);
      }
      
      toast.error('Σφάλμα κατά την προσθήκη εργαζομένου', {
        duration: 5000,
        description: error.message,
      });
    },
    retry: false,
  });
}

export function useUpdateEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, employee }: { employeeId: bigint; employee: Employee }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Get the old employee data to create change log
      const oldEmployee = await actor.getEmployee(employeeId);
      
      if (oldEmployee) {
        // Get existing change history
        const existingHistory = await actor.getChangeHistoryLog(employeeId);
        const newEntries: ChangeHistory = [...existingHistory];
        
        const today = formatDateForDisplay(new Date());
        
        // Check for changes and create log entries
        if (oldEmployee.hourlyRate !== employee.hourlyRate) {
          newEntries.unshift({
            date: today,
            changeType: 'Ωριαία Αμοιβή',
            description: createChangeDescription('hourlyRate', oldEmployee.hourlyRate, employee.hourlyRate),
          });
        }
        
        if (oldEmployee.overtimeRate !== employee.overtimeRate) {
          newEntries.unshift({
            date: today,
            changeType: 'Αμοιβή Υπερωριών',
            description: createChangeDescription('overtimeRate', oldEmployee.overtimeRate, employee.overtimeRate),
          });
        }
        
        if (oldEmployee.fixedMonthlySalary !== employee.fixedMonthlySalary) {
          newEntries.unshift({
            date: today,
            changeType: 'Μηνιαίος Μισθός',
            description: createChangeDescription('fixedMonthlySalary', oldEmployee.fixedMonthlySalary, employee.fixedMonthlySalary),
          });
        }
        
        if (oldEmployee.totalAnnualLeaveDays !== employee.totalAnnualLeaveDays) {
          newEntries.unshift({
            date: today,
            changeType: 'Ετήσιες Άδειες',
            description: createChangeDescription('totalAnnualLeaveDays', oldEmployee.totalAnnualLeaveDays, employee.totalAnnualLeaveDays),
          });
        }
        
        // Save the updated change history
        if (newEntries.length > existingHistory.length) {
          await actor.setChangeHistoryLog(employeeId, newEntries);
        }
      }
      
      // Update the employee using the backend function that triggers recalculation
      return actor.updateEmployeeWithChangeLog(employeeId, employee);
    },
    onMutate: async ({ employeeId, employee }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['employees'] });
      
      // Snapshot previous value
      const previousEmployees = queryClient.getQueryData<Employee[]>(['employees']);
      
      // Optimistically update
      if (previousEmployees) {
        const updatedEmployees = previousEmployees.map(emp => 
          emp.id === employeeId ? employee : emp
        );
        queryClient.setQueryData<Employee[]>(['employees'], updatedEmployees);
      }
      
      return { previousEmployees };
    },
    onSuccess: async () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['changeHistory'] });
      
      toast.success('Επιτυχία! Ο εργαζόμενος ενημερώθηκε.', {
        duration: 3000,
        description: 'Η μισθοδοσία και οι άδειες επανυπολογίστηκαν αυτόματα.',
      });
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueryData(['employees'], context.previousEmployees);
      }
      
      toast.error('Σφάλμα κατά την ενημέρωση', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

export function useDeleteEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: bigint) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      return actor.deleteEmployee(employeeId);
    },
    onMutate: async (employeeId) => {
      await queryClient.cancelQueries({ queryKey: ['employees'] });
      
      const previousEmployees = queryClient.getQueryData<Employee[]>(['employees']);
      
      if (previousEmployees) {
        const filteredEmployees = previousEmployees.filter(emp => emp.id !== employeeId);
        queryClient.setQueryData<Employee[]>(['employees'], filteredEmployees);
      }
      
      return { previousEmployees };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['changeHistory'] });
      
      toast.success('Επιτυχία! Ο εργαζόμενος διαγράφηκε.', {
        duration: 3000,
      });
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueryData(['employees'], context.previousEmployees);
      }
      
      toast.error('Σφάλμα κατά τη διαγραφή', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

// Work Days Queries
export function useGetWorkDays(employeeId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<WorkDay[]>({
    queryKey: ['workDays', employeeId?.toString()],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      return actor.getWorkDays(employeeId);
    },
    enabled: !!actor && !isFetching && employeeId !== null,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useGetWorkDay(employeeId: bigint | null, date: string) {
  const { actor, isFetching } = useActor();

  return useQuery<WorkDay | null>({
    queryKey: ['workDay', employeeId?.toString(), date],
    queryFn: async () => {
      if (!actor || !employeeId) return null;
      return actor.getWorkDay(employeeId, date);
    },
    enabled: !!actor && !isFetching && employeeId !== null && !!date,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
  });
}

// NEW: Query hook for getting daily bulk work days
export function useGetDailyBulkWorkDays(date: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[bigint, WorkDay]>>({
    queryKey: ['dailyBulkWorkDays', date],
    queryFn: async () => {
      if (!actor || !date) return [];
      return actor.getDailyBulkWorkDays(date);
    },
    enabled: !!actor && !isFetching && !!date,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
  });
}

export function useAddWorkDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, workDay }: { employeeId: bigint; workDay: WorkDay }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Add the work day - backend automatically triggers payroll recalculation and leave updates
      await actor.addWorkDay(employeeId, workDay);
      return { employeeId, workDay };
    },
    onSuccess: async ({ employeeId, workDay }) => {
      // Invalidate ALL work day related queries to ensure bidirectional sync
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] }); // Sync with bulk view
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      if (workDay.isLeave) {
        toast.success('Επιτυχία! Η άδεια καταχωρήθηκε και το υπόλοιπο αδειών ενημερώθηκε αυτόματα.', {
          duration: 4000,
          description: 'Η μισθοδοσία, το ημερολόγιο και η μαζική καταχώρηση ενημερώθηκαν επίσης.',
        });
      } else {
        toast.success('Επιτυχία! Οι ώρες εργασίας αποθηκεύτηκαν και η μισθοδοσία ενημερώθηκε αυτόματα.', {
          duration: 3000,
          description: 'Το ημερολόγιο και η μαζική καταχώρηση συγχρονίστηκαν.',
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την αποθήκευση', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

// NEW: Mutation for saving daily bulk work days with automatic data retrieval support
export function useSaveDailyBulkWorkDays() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, entries }: { date: string; entries: Array<[bigint, WorkDay]> }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Use the backend's saveDailyBulkWorkDays function which handles updates
      await actor.saveDailyBulkWorkDays(date, entries);
      
      return { date, entries };
    },
    onSuccess: async ({ date, entries }) => {
      // Invalidate ALL work day related queries to ensure bidirectional sync
      queryClient.invalidateQueries({ queryKey: ['workDays'] }); // Sync with individual view
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      // Check if any work days were marked as leave
      const hasLeave = entries.some(([_, workDay]) => workDay.isLeave);
      
      if (hasLeave) {
        toast.success('Επιτυχία! Οι καταχωρήσεις αποθηκεύτηκαν και τα υπόλοιπα αδειών ενημερώθηκαν αυτόματα.', {
          duration: 4000,
          description: 'Η μισθοδοσία, το ατομικό ημερολόγιο και η μαζική καταχώρηση συγχρονίστηκαν.',
        });
      } else {
        toast.success('Επιτυχία! Οι καταχωρήσεις αποθηκεύτηκαν και η μισθοδοσία ενημερώθηκε αυτόματα.', {
          duration: 3000,
          description: 'Το ατομικό ημερολόγιο και η μαζική καταχώρηση συγχρονίστηκαν.',
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την αποθήκευση', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

export function useAddWorkDaysBulk() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workDaysBulk: Array<[bigint, WorkDay]>) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // The backend's addWorkDaysBulk already calls calculateAndUpdatePayrollWithCarryover
      // and updates leave records for any work days marked as leave
      await actor.addWorkDaysBulk(workDaysBulk);
      
      return workDaysBulk;
    },
    onSuccess: async (workDaysBulk) => {
      // Invalidate ALL work day related queries to ensure bidirectional sync
      queryClient.invalidateQueries({ queryKey: ['workDays'] }); // Sync with individual view
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      // Check if any work days were marked as leave
      const hasLeave = workDaysBulk.some(([_, workDay]) => workDay.isLeave);
      
      if (hasLeave) {
        toast.success('Επιτυχία! Οι καταχωρήσεις αποθηκεύτηκαν και τα υπόλοιπα αδειών ενημερώθηκαν αυτόματα.', {
          duration: 4000,
          description: 'Η μισθοδοσία, το ατομικό ημερολόγιο και η μαζική καταχώρηση συγχρονίστηκαν.',
        });
      } else {
        toast.success('Επιτυχία! Οι καταχωρήσεις αποθηκεύτηκαν και η μισθοδοσία ενημερώθηκε αυτόματα.', {
          duration: 3000,
          description: 'Το ατομικό ημερολόγιο και η μαζική καταχώρηση συγχρονίστηκαν.',
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την αποθήκευση', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

// Payroll Queries - using getAllEmployeesPayrollData from backend
export function useGetAllEmployeesPayrollData(month: bigint | null, year: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['payrollData', 'all', month?.toString(), year?.toString()],
    queryFn: async () => {
      if (!actor || month === null || year === null) return [];
      return actor.getAllEmployeesPayrollData(month, year);
    },
    enabled: !!actor && !isFetching && month !== null && year !== null,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Leave Queries
export function useGetLeaveRecord(employeeId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<LeaveRecord | null>({
    queryKey: ['leaveRecord', employeeId?.toString()],
    queryFn: async () => {
      if (!actor || !employeeId) return null;
      return actor.getLeaveRecord(employeeId);
    },
    enabled: !!actor && !isFetching && employeeId !== null,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
  });
}

export function useGetAllLeaveRecords() {
  const { actor, isFetching } = useActor();

  return useQuery<LeaveRecord[]>({
    queryKey: ['leaveRecords'],
    queryFn: async () => {
      if (!actor) return [];
      
      // Use the backend's getAllLeaveRecords function directly
      return actor.getAllLeaveRecords();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useAddLeaveDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, date }: { employeeId: bigint; date: string }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Call backend to toggle leave day - backend handles all updates
      await actor.toggleLeaveDay(employeeId, date);
      return { employeeId, date };
    },
    onSuccess: async ({ employeeId, date }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η άδεια καταχωρήθηκε και το υπόλοιπο ενημερώθηκε αυτόματα.', {
        duration: 3000,
        description: 'Η μισθοδοσία και το ημερολόγιο ενημερώθηκαν επίσης.',
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την καταχώρηση άδειας', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

export function useDeleteLeaveRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, date }: { employeeId: bigint; date: string }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Call backend to delete leave record - backend handles all updates
      await actor.deleteLeaveRecord(employeeId, date);
      return { employeeId, date };
    },
    onSuccess: async ({ employeeId, date }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η άδεια διαγράφηκε και το υπόλοιπο ενημερώθηκε αυτόματα.', {
        duration: 3000,
        description: 'Η μισθοδοσία και το ημερολόγιο ενημερώθηκαν επίσης.',
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά τη διαγραφή άδειας', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

// NEW: Mutation for updating leave days used directly
export function useUpdateLeaveDaysUsed() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, newLeaveDaysUsed }: { employeeId: bigint; newLeaveDaysUsed: bigint }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Call backend to update leave days used - backend handles all updates
      await actor.updateLeaveDaysUsed(employeeId, newLeaveDaysUsed);
      return { employeeId, newLeaveDaysUsed };
    },
    onSuccess: async ({ employeeId, newLeaveDaysUsed }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Η ενημέρωση των ημερών άδειας ολοκληρώθηκε επιτυχώς.', {
        duration: 3000,
        description: 'Το υπόλοιπο αδειών και η μισθοδοσία ενημερώθηκαν αυτόματα.',
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την ενημέρωση ημερών άδειας', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

export function useAddLeaveDayBulk() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Get all employees
      const employees = await actor.getAllEmployees();
      
      if (employees.length === 0) {
        throw new Error('Δεν υπάρχουν εργαζόμενοι');
      }
      
      // Add leave day for each employee individually
      const promises = employees.map(employee => 
        actor.toggleLeaveDay(employee.id, date)
      );
      
      // Wait for all leave additions to complete
      await Promise.all(promises);
      
      return { employeeCount: employees.length, date };
    },
    onSuccess: async ({ employeeCount, date }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success(`Επιτυχία! Η άδεια καταχωρήθηκε για ${employeeCount} εργαζομένους.`, {
        duration: 4000,
        description: 'Τα υπόλοιπα αδειών, η μισθοδοσία και το ημερολόγιο ενημερώθηκαν αυτόματα.',
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την καταχώρηση μαζικής άδειας', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

// NEW: Mutation for resetting all leave records (yearly reset)
export function useResetAllLeaveRecords() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newAnnualLeaveDays: bigint) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Call backend to reset all leave records
      await actor.resetAllLeaveRecords(newAnnualLeaveDays);
      
      return { newAnnualLeaveDays };
    },
    onSuccess: async ({ newAnnualLeaveDays }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Οι άδειες όλων των εργαζομένων επαναφέρθηκαν.', {
        duration: 4000,
        description: 'Οι χρησιμοποιημένες ημέρες μηδενίστηκαν και τα ετήσια δικαιώματα ανανεώθηκαν.',
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την επαναφορά αδειών', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

// Payment Queries
export function useGetPaymentRecords(employeeId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<PaymentRecord[]>({
    queryKey: ['payments', 'employee', employeeId?.toString()],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      
      // Get all work days to determine all months with data
      const workDays = await actor.getWorkDays(employeeId);
      const uniqueMonths = new Set<string>();
      
      for (const workDay of workDays) {
        const dateParts = workDay.date.split('-');
        if (dateParts.length === 3) {
          const [year, month] = dateParts;
          uniqueMonths.add(`${month}-${year}`);
        }
      }
      
      // Fetch payments for each unique month
      const allPayments: PaymentRecord[] = [];
      for (const monthYear of uniqueMonths) {
        const [monthStr, yearStr] = monthYear.split('-');
        const month = BigInt(monthStr);
        const year = BigInt(yearStr);
        
        try {
          const payments = await actor.getPayments(employeeId, month, year);
          allPayments.push(...payments);
        } catch (error) {
          // Ignore errors for months without payments
        }
      }
      
      return allPayments;
    },
    enabled: !!actor && !isFetching && employeeId !== null,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
  });
}

// New query for getting all employees' payments for a specific month
export function useGetAllEmployeesPayments(month: bigint, year: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['payments', 'allEmployees', month.toString(), year.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployeesPayments(month, year);
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
  });
}

export function useAddPaymentRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: PaymentRecord) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      return actor.addPayment(payment);
    },
    onSuccess: async () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η πληρωμή προστέθηκε και η μισθοδοσία ενημερώθηκε αυτόματα.', {
        duration: 3000,
        description: 'Οι υπόλοιπες πληρωμές του εργαζομένου παραμένουν αμετάβλητες.',
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την προσθήκη πληρωμής', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

export function useAddPaymentRecordsBulk() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payments: PaymentRecord[]) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      return actor.addPaymentsBulk(payments);
    },
    onSuccess: async () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Οι πληρωμές προστέθηκαν και η μισθοδοσία ενημερώθηκε αυτόματα.', {
        duration: 3000,
        description: 'Οι υπόλοιπες πληρωμές των εργαζομένων παραμένουν αμετάβλητες.',
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την προσθήκη πληρωμών', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

export function useUpdatePaymentRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      originalPaymentDate,
      updatedPayment,
    }: {
      employeeId: bigint;
      originalPaymentDate: string;
      updatedPayment: PaymentRecord;
    }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Use the original payment date to identify which specific record to update
      // The backend updatePayment function uses paymentDate as the unique identifier
      return actor.updatePayment(
        employeeId,
        updatedPayment.month,
        updatedPayment.year,
        originalPaymentDate,
        updatedPayment
      );
    },
    onSuccess: async () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η συγκεκριμένη πληρωμή ενημερώθηκε και η μισθοδοσία επανυπολογίστηκε.', {
        duration: 3000,
        description: 'Μόνο αυτή η πληρωμή τροποποιήθηκε. Οι υπόλοιπες πληρωμές παραμένουν αμετάβλητες.',
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την ενημέρωση πληρωμής', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

export function useDeletePaymentRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      month,
      year,
      paymentDate,
    }: {
      employeeId: bigint;
      month: bigint;
      year: bigint;
      paymentDate: string;
    }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      
      // Delete the specific payment using paymentDate as the unique identifier
      return actor.deletePayment(employeeId, month, year, paymentDate);
    },
    onSuccess: async () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η συγκεκριμένη πληρωμή διαγράφηκε και η μισθοδοσία επανυπολογίστηκε.', {
        duration: 3000,
        description: 'Μόνο αυτή η πληρωμή αφαιρέθηκε. Οι υπόλοιπες πληρωμές παραμένουν αμετάβλητες.',
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά τη διαγραφή πληρωμής', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

// Monthly Bank Salary Queries
export function useGetMonthlyBankSalary(employeeId: bigint | null, month: bigint, year: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<number | null>({
    queryKey: ['monthlyBankSalary', employeeId?.toString(), month.toString(), year.toString()],
    queryFn: async () => {
      if (!actor || !employeeId) return null;
      return actor.getMonthlyBankSalary(employeeId, month, year);
    },
    enabled: !!actor && !isFetching && employeeId !== null,
    retry: 1,
    retryDelay: 500,
  });
}

export function useGetAllMonthlyBankSalaries() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['monthlyBankSalaries'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMonthlyBankSalaries();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useSetMonthlyBankSalary() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { employeeId: bigint; month: bigint; year: bigint; amount: number }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      return actor.setMonthlyBankSalary(data.employeeId, data.month, data.year, data.amount);
    },
    onSuccess: async (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalary'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Ο μηνιαίος μισθός τράπεζας ενημερώθηκε και η μισθοδοσία ανανεώθηκε.', {
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την ενημέρωση', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

export function useSetMonthlyBankSalaryBulk() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salaries: Array<[bigint, bigint, bigint, number]>) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      return actor.setMonthlyBankSalariesBulk(salaries);
    },
    onSuccess: async () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalary'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Οι μηνιαίοι μισθοί τράπεζας ενημερώθηκαν και η μισθοδοσία ανανεώθηκε.', {
        duration: 3000,
        description: 'Όλοι οι μισθοί αποθηκεύτηκαν επιτυχώς.',
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά τη μαζική ενημέρωση', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

export function useUpdateMonthlyBankSalary() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      employeeId,
      month,
      year,
      amount,
    }: {
      id: bigint;
      employeeId: bigint;
      month: bigint;
      year: bigint;
      amount: number;
    }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      return actor.updateMonthlyBankSalary(id, employeeId, month, year, amount);
    },
    onSuccess: async () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalary'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Ο μηνιαίος μισθός τράπεζας ενημερώθηκε και η μισθοδοσία επανυπολογίστηκε αυτόματα.', {
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά την ενημέρωση μηνιαίου μισθού τράπεζας', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

export function useDeleteMonthlyBankSalary() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      employeeId,
      month,
      year,
    }: {
      id: bigint;
      employeeId: bigint;
      month: bigint;
      year: bigint;
    }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      return actor.deleteMonthlyBankSalary(id, employeeId, month, year);
    },
    onSuccess: async () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalary'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Ο μηνιαίος μισθός τράπεζας διαγράφηκε και η μισθοδοσία επανυπολογίστηκε αυτόματα.', {
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast.error('Σφάλμα κατά τη διαγραφή μηνιαίου μισθού τράπεζας', {
        duration: 5000,
        description: error.message,
      });
    },
  });
}

