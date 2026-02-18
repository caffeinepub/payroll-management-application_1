import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Employee, WorkDay, LeaveRecord, PaymentRecord, ChangeHistory } from '../backend';
import { toast } from 'sonner';
import { normalizeErrorMessage } from '../utils/errors';

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
      
      // Normalize error message to strip authorization trap strings
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την προσθήκη εργαζομένου', {
        duration: 5000,
        description: normalizedMessage,
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
      
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την ενημέρωση', {
        duration: 5000,
        description: normalizedMessage,
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
      
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά τη διαγραφή', {
        duration: 5000,
        description: normalizedMessage,
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

// Query hook for getting daily bulk work days
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

/**
 * Individual Work Day Entry Mutation
 * Ensures bidirectional synchronization: Individual → Bulk
 * Invalidates both individual and bulk query caches
 */
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
      // BIDIRECTIONAL SYNC: Individual → Bulk
      // Invalidate ALL work day related queries to ensure synchronization
      queryClient.invalidateQueries({ queryKey: ['workDays'] }); // Individual per-employee view
      queryClient.invalidateQueries({ queryKey: ['workDay'] }); // Individual per-day view
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] }); // Bulk daily view
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
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την αποθήκευση', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

export function useUpdateWorkDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, date, workDay }: { employeeId: bigint; date: string; workDay: WorkDay }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.updateWorkDay(employeeId, date, workDay);
      return { employeeId, date, workDay };
    },
    onSuccess: async ({ employeeId, workDay }) => {
      // BIDIRECTIONAL SYNC: Individual → Bulk
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      if (workDay.isLeave) {
        toast.success('Επιτυχία! Η άδεια ενημερώθηκε και το υπόλοιπο αδειών επανυπολογίστηκε.', {
          duration: 4000,
          description: 'Η μισθοδοσία και το ημερολόγιο ενημερώθηκαν επίσης.',
        });
      } else {
        toast.success('Επιτυχία! Οι ώρες εργασίας ενημερώθηκαν και η μισθοδοσία επανυπολογίστηκε.', {
          duration: 3000,
          description: 'Το ημερολόγιο και η μαζική καταχώρηση συγχρονίστηκαν.',
        });
      }
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την ενημέρωση', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

export function useDeleteWorkDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, date }: { employeeId: bigint; date: string }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.deleteWorkDay(employeeId, date);
      return { employeeId, date };
    },
    onSuccess: async () => {
      // BIDIRECTIONAL SYNC: Individual → Bulk
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η ημέρα εργασίας διαγράφηκε.', {
        duration: 3000,
        description: 'Η μισθοδοσία και το ημερολόγιο ενημερώθηκαν.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά τη διαγραφή', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

/**
 * Bulk Work Days Entry Mutation
 * Ensures bidirectional synchronization: Bulk → Individual
 * Invalidates both bulk and individual query caches
 */
export function useSaveBulkWorkDays() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: Array<[bigint, WorkDay]>) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.addWorkDaysBulk(entries);
      return entries;
    },
    onSuccess: async () => {
      // BIDIRECTIONAL SYNC: Bulk → Individual
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Οι ώρες εργασίας αποθηκεύτηκαν για όλους τους εργαζομένους.', {
        duration: 3000,
        description: 'Η μισθοδοσία και το ημερολόγιο ενημερώθηκαν αυτόματα.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την αποθήκευση', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

/**
 * Daily Bulk Work Days Entry Mutation
 * Saves work hours for all employees for a specific date
 * Ensures bidirectional synchronization with individual entry mode
 */
export function useSaveDailyBulkWorkDays() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, entries }: { date: string; entries: Array<[bigint, WorkDay]> }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.saveDailyBulkWorkDays(date, entries);
      return { date, entries };
    },
    onSuccess: async () => {
      // BIDIRECTIONAL SYNC: Daily Bulk → Individual & Monthly Bulk
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Οι ώρες εργασίας αποθηκεύτηκαν για όλους τους εργαζομένους.', {
        duration: 3000,
        description: 'Η μισθοδοσία, το ημερολόγιο και η μαζική καταχώρηση ενημερώθηκαν.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την αποθήκευση', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

// Payroll Queries
export function useGetAllEmployeesPayrollData(month: bigint, year: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['payrollData', month.toString(), year.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployeesPayrollData(month, year);
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useGetEmployeePayrollData(employeeId: bigint | null, month: bigint, year: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['payrollData', employeeId?.toString(), month.toString(), year.toString()],
    queryFn: async () => {
      if (!actor || !employeeId) return null;
      return actor.getEmployeePayrollData(employeeId, month, year);
    },
    enabled: !!actor && !isFetching && employeeId !== null,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
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
  });
}

export function useGetAllLeaveRecords() {
  const { actor, isFetching } = useActor();

  return useQuery<LeaveRecord[]>({
    queryKey: ['leaveRecords'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployeeLeaveRecords();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useToggleLeaveDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, date }: { employeeId: bigint; date: string }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.toggleLeaveDay(employeeId, date);
      return { employeeId, date };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η άδεια ενημερώθηκε.', {
        duration: 3000,
        description: 'Το υπόλοιπο αδειών και η μισθοδοσία επανυπολογίστηκαν.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την ενημέρωση άδειας', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

export function useAddBulkLeaveDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.addBulkLeaveDay(date);
      return date;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η άδεια προστέθηκε σε όλους τους εργαζομένους.', {
        duration: 3000,
        description: 'Τα υπόλοιπα αδειών και η μισθοδοσία ενημερώθηκαν.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την προσθήκη άδειας', {
        duration: 5000,
        description: normalizedMessage,
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
      await actor.deleteLeaveRecord(employeeId, date);
      return { employeeId, date };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDay'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η άδεια διαγράφηκε.', {
        duration: 3000,
        description: 'Το υπόλοιπο αδειών και η μισθοδοσία ενημερώθηκαν.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά τη διαγραφή άδειας', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

export function useUpdateLeaveDaysUsed() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, newLeaveDaysUsed }: { employeeId: bigint; newLeaveDaysUsed: bigint }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.updateLeaveDaysUsed(employeeId, newLeaveDaysUsed);
      return { employeeId, newLeaveDaysUsed };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Οι ημέρες άδειας ενημερώθηκαν.', {
        duration: 3000,
        description: 'Η μισθοδοσία επανυπολογίστηκε αυτόματα.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την ενημέρωση αδειών', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

export function useResetAllLeaveRecords() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newAnnualLeaveDays: bigint) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.resetAllLeaveRecords(newAnnualLeaveDays);
      return newAnnualLeaveDays;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Όλες οι άδειες επαναφέρθηκαν.', {
        duration: 3000,
        description: 'Η μισθοδοσία επανυπολογίστηκε για όλους τους εργαζομένους.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την επαναφορά αδειών', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

// Payment Queries
export function useGetPayments(employeeId: bigint | null, month: bigint, year: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<PaymentRecord[]>({
    queryKey: ['payments', employeeId?.toString(), month.toString(), year.toString()],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      return actor.getPayments(employeeId, month, year);
    },
    enabled: !!actor && !isFetching && employeeId !== null,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
  });
}

export function useGetAllEmployeesPayments(month: bigint, year: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['allPayments', month.toString(), year.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployeesPayments(month, year);
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useAddPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: PaymentRecord) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.addPayment(payment);
      return payment;
    },
    onSuccess: async (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η πληρωμή καταχωρήθηκε.', {
        duration: 3000,
        description: 'Η μισθοδοσία ενημερώθηκε αυτόματα.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την καταχώρηση πληρωμής', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

export function useAddPaymentsBulk() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payments: PaymentRecord[]) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.addPaymentsBulk(payments);
      return payments;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Οι πληρωμές καταχωρήθηκαν για όλους τους εργαζομένους.', {
        duration: 3000,
        description: 'Η μισθοδοσία ενημερώθηκε αυτόματα.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την καταχώρηση πληρωμών', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

export function useUpdatePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      month,
      year,
      paymentDate,
      updatedPayment,
    }: {
      employeeId: bigint;
      month: bigint;
      year: bigint;
      paymentDate: string;
      updatedPayment: PaymentRecord;
    }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.updatePayment(employeeId, month, year, paymentDate, updatedPayment);
      return { employeeId, month, year, paymentDate, updatedPayment };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η πληρωμή ενημερώθηκε.', {
        duration: 3000,
        description: 'Η μισθοδοσία επανυπολογίστηκε αυτόματα.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την ενημέρωση πληρωμής', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

export function useDeletePayment() {
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
      await actor.deletePayment(employeeId, month, year, paymentDate);
      return { employeeId, month, year, paymentDate };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Η πληρωμή διαγράφηκε.', {
        duration: 3000,
        description: 'Η μισθοδοσία ενημερώθηκε αυτόματα.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά τη διαγραφή πληρωμής', {
        duration: 5000,
        description: normalizedMessage,
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
    staleTime: 30000,
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
    mutationFn: async ({
      employeeId,
      month,
      year,
      amount,
    }: {
      employeeId: bigint;
      month: bigint;
      year: bigint;
      amount: number;
    }) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.setMonthlyBankSalary(employeeId, month, year, amount);
      return { employeeId, month, year, amount };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalary'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Ο μισθός τράπεζας καταχωρήθηκε.', {
        duration: 3000,
        description: 'Η μισθοδοσία ενημερώθηκε αυτόματα.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την καταχώρηση μισθού τράπεζας', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}

export function useSetMonthlyBankSalariesBulk() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salaries: Array<[bigint, bigint, bigint, number]>) => {
      if (!actor) throw new Error('Η σύνδεση με το σύστημα δεν είναι διαθέσιμη');
      await actor.setMonthlyBankSalariesBulk(salaries);
      return salaries;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalary'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Οι μισθοί τράπεζας καταχωρήθηκαν για όλους τους εργαζομένους.', {
        duration: 3000,
        description: 'Η μισθοδοσία ενημερώθηκε αυτόματα.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την καταχώρηση μισθών τράπεζας', {
        duration: 5000,
        description: normalizedMessage,
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
      await actor.updateMonthlyBankSalary(id, employeeId, month, year, amount);
      return { id, employeeId, month, year, amount };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalary'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Ο μισθός τράπεζας ενημερώθηκε.', {
        duration: 3000,
        description: 'Η μισθοδοσία επανυπολογίστηκε αυτόματα.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά την ενημέρωση μισθού τράπεζας', {
        duration: 5000,
        description: normalizedMessage,
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
      await actor.deleteMonthlyBankSalary(id, employeeId, month, year);
      return { id, employeeId, month, year };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalary'] });
      queryClient.invalidateQueries({ queryKey: ['payrollData'] });
      queryClient.invalidateQueries({ queryKey: ['payrollDataWithCarryover'] });
      
      toast.success('Επιτυχία! Ο μισθός τράπεζας διαγράφηκε.', {
        duration: 3000,
        description: 'Η μισθοδοσία ενημερώθηκε αυτόματα.',
      });
    },
    onError: (error: Error) => {
      // Normalize error message
      const normalizedMessage = normalizeErrorMessage(error);
      
      toast.error('Σφάλμα κατά τη διαγραφή μισθού τράπεζας', {
        duration: 5000,
        description: normalizedMessage,
      });
    },
  });
}
