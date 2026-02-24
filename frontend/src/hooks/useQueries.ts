import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  Employee,
  WorkDay,
  LeaveRecord,
  PaymentRecord,
  ChangeHistory,
  PayrollData,
  MonthlyBankSalary,
  ChangeHistoryEntry,
  PayrollBackend,
} from '../types';

// Helper to cast actor to PayrollBackend
function asPayroll(actor: unknown): PayrollBackend {
  return actor as PayrollBackend;
}

// ============================================================================
// EMPLOYEE QUERIES
// ============================================================================

export function useGetAllEmployees() {
  const { actor, isFetching } = useActor();

  return useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      if (!actor) return [];
      const result = await asPayroll(actor).getAllEmployees();
      return result.map((e) => ({
        ...e,
        id: typeof e.id === 'bigint' ? Number(e.id) : e.id,
        hourlyRate: typeof e.hourlyRate === 'bigint' ? Number(e.hourlyRate) : e.hourlyRate,
        overtimeRate: typeof e.overtimeRate === 'bigint' ? Number(e.overtimeRate) : e.overtimeRate,
        totalAnnualLeaveDays:
          typeof e.totalAnnualLeaveDays === 'bigint'
            ? Number(e.totalAnnualLeaveDays)
            : e.totalAnnualLeaveDays,
        fixedMonthlySalary:
          e.fixedMonthlySalary != null
            ? typeof e.fixedMonthlySalary === 'bigint'
              ? Number(e.fixedMonthlySalary)
              : e.fixedMonthlySalary
            : null,
      }));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEmployee(employeeId: number | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Employee | null>({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!actor || employeeId === null) return null;
      const result = await asPayroll(actor).getEmployee(BigInt(employeeId));
      if (!result) return null;
      return {
        ...result,
        id: typeof result.id === 'bigint' ? Number(result.id) : result.id,
        hourlyRate:
          typeof result.hourlyRate === 'bigint' ? Number(result.hourlyRate) : result.hourlyRate,
        overtimeRate:
          typeof result.overtimeRate === 'bigint'
            ? Number(result.overtimeRate)
            : result.overtimeRate,
        totalAnnualLeaveDays:
          typeof result.totalAnnualLeaveDays === 'bigint'
            ? Number(result.totalAnnualLeaveDays)
            : result.totalAnnualLeaveDays,
        fixedMonthlySalary:
          result.fixedMonthlySalary != null
            ? typeof result.fixedMonthlySalary === 'bigint'
              ? Number(result.fixedMonthlySalary)
              : result.fixedMonthlySalary
            : null,
      };
    },
    enabled: !!actor && !isFetching && employeeId !== null,
  });
}

export function useGetChangeHistory(employeeId: number | null) {
  const { actor, isFetching } = useActor();

  return useQuery<ChangeHistory>({
    queryKey: ['changeHistory', employeeId],
    queryFn: async () => {
      if (!actor || employeeId === null) return [];
      return asPayroll(actor).getChangeHistoryLog(BigInt(employeeId));
    },
    enabled: !!actor && !isFetching && employeeId !== null,
  });
}

export function useAddEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee: {
      fullName: string;
      hourlyRate: string;
      overtimeRate: string;
      fixedMonthlySalary: string | null;
      totalAnnualLeaveDays: number | null;
      email: string | null;
      phone: string | null;
      bankIban: string | null;
      employeeType: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).addEmployee(
        employee.fullName,
        employee.hourlyRate,
        employee.overtimeRate,
        employee.fixedMonthlySalary,
        employee.totalAnnualLeaveDays !== null ? BigInt(employee.totalAnnualLeaveDays) : null,
        employee.email,
        employee.phone,
        employee.bankIban,
        employee.employeeType
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
    },
  });
}

export function useUpdateEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      employee,
    }: {
      employeeId: number;
      employee: Partial<Employee>;
    }) => {
      if (!actor) throw new Error('Actor not available');

      const oldEmployee = await asPayroll(actor).getEmployee(BigInt(employeeId));
      const now = new Date().toISOString().split('T')[0];

      let existingHistory: ChangeHistory = [];
      try {
        existingHistory = await asPayroll(actor).getChangeHistoryLog(BigInt(employeeId));
      } catch {
        existingHistory = [];
      }

      const newEntries: ChangeHistoryEntry[] = [];

      if (oldEmployee) {
        if (
          employee.hourlyRate !== undefined &&
          employee.hourlyRate !== oldEmployee.hourlyRate
        ) {
          newEntries.push({
            date: now,
            changeType: 'hourlyRate',
            description: `Ωριαία αμοιβή από ${Number(oldEmployee.hourlyRate).toFixed(2)} € σε ${Number(employee.hourlyRate).toFixed(2)} €`,
          });
        }
        if (
          employee.overtimeRate !== undefined &&
          employee.overtimeRate !== oldEmployee.overtimeRate
        ) {
          newEntries.push({
            date: now,
            changeType: 'overtimeRate',
            description: `Αμοιβή υπερωρίας από ${Number(oldEmployee.overtimeRate).toFixed(2)} € σε ${Number(employee.overtimeRate).toFixed(2)} €`,
          });
        }
        if (
          employee.fixedMonthlySalary !== undefined &&
          employee.fixedMonthlySalary !== oldEmployee.fixedMonthlySalary
        ) {
          newEntries.push({
            date: now,
            changeType: 'salary',
            description: `Μηνιαίος μισθός από ${oldEmployee.fixedMonthlySalary != null ? Number(oldEmployee.fixedMonthlySalary).toFixed(2) : '0.00'} € σε ${employee.fixedMonthlySalary != null ? Number(employee.fixedMonthlySalary).toFixed(2) : '0.00'} €`,
          });
        }
        if (
          employee.totalAnnualLeaveDays !== undefined &&
          employee.totalAnnualLeaveDays !== oldEmployee.totalAnnualLeaveDays
        ) {
          newEntries.push({
            date: now,
            changeType: 'leave',
            description: `Ετήσιες άδειες από ${oldEmployee.totalAnnualLeaveDays} σε ${employee.totalAnnualLeaveDays} ημέρες`,
          });
        }
      }

      if (newEntries.length > 0) {
        const updatedHistory = [...existingHistory, ...newEntries];
        try {
          await asPayroll(actor).setChangeHistoryLog(BigInt(employeeId), updatedHistory);
        } catch {
          // ignore
        }
      }

      return asPayroll(actor).updateEmployeeWithChangeLog(BigInt(employeeId), employee);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['changeHistory', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeleteEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: number) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).deleteEmployee(BigInt(employeeId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
    },
  });
}

// ============================================================================
// WORK DAY QUERIES
// ============================================================================

export function useGetWorkDays(employeeId: number | null) {
  const { actor, isFetching } = useActor();

  return useQuery<WorkDay[]>({
    queryKey: ['workDays', employeeId],
    queryFn: async () => {
      if (!actor || employeeId === null) return [];
      return asPayroll(actor).getWorkDays(BigInt(employeeId));
    },
    enabled: !!actor && !isFetching && employeeId !== null,
  });
}

export function useGetWorkDay(employeeId: number | null, date: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<WorkDay | null>({
    queryKey: ['workDay', employeeId, date],
    queryFn: async () => {
      if (!actor || employeeId === null || !date) return null;
      return asPayroll(actor).getWorkDay(BigInt(employeeId), date);
    },
    enabled: !!actor && !isFetching && employeeId !== null && !!date,
  });
}

export function useGetDailyBulkWorkDays(date: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Array<{ employeeId: number; workDay: WorkDay | null }>>({
    queryKey: ['dailyBulkWorkDays', date],
    queryFn: async () => {
      if (!actor || !date) return [];
      const result = await asPayroll(actor).getDailyBulkWorkDays(date);
      return result.map((item) => ({
        employeeId: typeof item.employeeId === 'bigint' ? Number(item.employeeId) : item.employeeId,
        workDay: item.workDay,
      }));
    },
    enabled: !!actor && !isFetching && !!date,
  });
}

export function useAddWorkDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      workDay,
    }: {
      employeeId: number;
      workDay: WorkDay;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await asPayroll(actor).addWorkDay(BigInt(employeeId), workDay);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workDays', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workDay', variables.employeeId, variables.workDay.date] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays', variables.workDay.date] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
    },
  });
}

export function useSaveDailyBulkWorkDays() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      entries,
    }: {
      date: string;
      entries: Array<{ employeeId: number; workDay: WorkDay }>;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const mappedEntries = entries.map((e) => ({
        employeeId: BigInt(e.employeeId),
        workDay: e.workDay,
      }));
      await asPayroll(actor).saveDailyBulkWorkDays(date, mappedEntries);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays', variables.date] });
      variables.entries.forEach((e) => {
        queryClient.invalidateQueries({ queryKey: ['workDays', e.employeeId] });
        queryClient.invalidateQueries({ queryKey: ['workDay', e.employeeId, variables.date] });
      });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
    },
  });
}

export function useAddWorkDaysBulk() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: Array<{ employeeId: number; workDay: WorkDay }>) => {
      if (!actor) throw new Error('Actor not available');
      const mappedEntries = entries.map((e) => ({
        employeeId: BigInt(e.employeeId),
        workDay: e.workDay,
      }));
      return asPayroll(actor).addWorkDaysBulk(mappedEntries);
    },
    onSuccess: (_data, variables) => {
      variables.forEach((e) => {
        queryClient.invalidateQueries({ queryKey: ['workDays', e.employeeId] });
      });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
    },
  });
}

export function useUpdateWorkDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      date,
      workDay,
    }: {
      employeeId: number;
      date: string;
      workDay: WorkDay;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).updateWorkDay(BigInt(employeeId), date, workDay);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workDays', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workDay', variables.employeeId, variables.date] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
    },
  });
}

export function useDeleteWorkDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      date,
    }: {
      employeeId: number;
      date: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).deleteWorkDay(BigInt(employeeId), date);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workDays', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workDay', variables.employeeId, variables.date] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
    },
  });
}

// ============================================================================
// PAYROLL QUERIES
// ============================================================================

export function useGetAllEmployeesPayrollData(month: number, year: number) {
  const { actor, isFetching } = useActor();

  return useQuery<PayrollData[]>({
    queryKey: ['payroll', 'all', month, year],
    queryFn: async () => {
      if (!actor) return [];
      return asPayroll(actor).getAllEmployeesPayrollData(BigInt(month), BigInt(year));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEmployeePayrollData(
  employeeId: number | null,
  month: number,
  year: number
) {
  const { actor, isFetching } = useActor();

  return useQuery<PayrollData | null>({
    queryKey: ['payroll', employeeId, month, year],
    queryFn: async () => {
      if (!actor || employeeId === null) return null;
      return asPayroll(actor).getEmployeePayrollData(BigInt(employeeId), BigInt(month), BigInt(year));
    },
    enabled: !!actor && !isFetching && employeeId !== null,
  });
}

// ============================================================================
// LEAVE QUERIES
// ============================================================================

export function useGetAllLeaveRecords() {
  const { actor, isFetching } = useActor();

  return useQuery<LeaveRecord[]>({
    queryKey: ['leaveRecords'],
    queryFn: async () => {
      if (!actor) return [];
      const result = await asPayroll(actor).getAllEmployeeLeaveRecords();
      return result.map((r) => ({
        ...r,
        employeeId: typeof r.employeeId === 'bigint' ? Number(r.employeeId) : r.employeeId,
        totalAnnualLeaveDays:
          typeof r.totalAnnualLeaveDays === 'bigint'
            ? Number(r.totalAnnualLeaveDays)
            : r.totalAnnualLeaveDays,
        leaveDaysUsed:
          typeof r.leaveDaysUsed === 'bigint' ? Number(r.leaveDaysUsed) : r.leaveDaysUsed,
        remainingLeaveDays:
          typeof r.remainingLeaveDays === 'bigint'
            ? Number(r.remainingLeaveDays)
            : r.remainingLeaveDays,
      }));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetLeaveRecord(employeeId: number | null) {
  const { actor, isFetching } = useActor();

  return useQuery<LeaveRecord | null>({
    queryKey: ['leaveRecord', employeeId],
    queryFn: async () => {
      if (!actor || employeeId === null) return null;
      return asPayroll(actor).getLeaveRecord(BigInt(employeeId));
    },
    enabled: !!actor && !isFetching && employeeId !== null,
  });
}

export function useUpdateLeaveDaysUsed() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      newLeaveDaysUsed,
    }: {
      employeeId: number;
      newLeaveDaysUsed: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).updateLeaveDaysUsed(BigInt(employeeId), BigInt(newLeaveDaysUsed));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useToggleLeaveDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      date,
    }: {
      employeeId: number;
      date: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).toggleLeaveDay(BigInt(employeeId), date);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workDays', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workDay', variables.employeeId, variables.date] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeleteLeaveRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      date,
    }: {
      employeeId: number;
      date: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).deleteLeaveRecord(BigInt(employeeId), date);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecord', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workDays', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useAddBulkLeaveDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).addBulkLeaveDay(date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBulkWorkDays'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useResetAllLeaveRecords() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newAnnualLeaveDays: number) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).resetAllLeaveRecords(BigInt(newAnnualLeaveDays));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// PAYMENT QUERIES
// ============================================================================

export function useGetPayments(employeeId: number | null, month: number, year: number) {
  const { actor, isFetching } = useActor();

  return useQuery<PaymentRecord[]>({
    queryKey: ['payments', employeeId, month, year],
    queryFn: async () => {
      if (!actor || employeeId === null) return [];
      return asPayroll(actor).getPayments(BigInt(employeeId), BigInt(month), BigInt(year));
    },
    enabled: !!actor && !isFetching && employeeId !== null,
  });
}

export function useGetAllEmployeesPayments(month: number, year: number) {
  const { actor, isFetching } = useActor();

  return useQuery<Array<{ employeeId: number; payments: PaymentRecord[] }>>({
    queryKey: ['payments', 'all', month, year],
    queryFn: async () => {
      if (!actor) return [];
      const result = await asPayroll(actor).getAllEmployeesPayments(BigInt(month), BigInt(year));
      return result.map((item) => ({
        employeeId: typeof item.employeeId === 'bigint' ? Number(item.employeeId) : item.employeeId,
        payments: item.payments,
      }));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: PaymentRecord) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).addPayment(payment);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', variables.employeeId, variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'all', variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useAddPaymentsBulk() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payments: PaymentRecord[]) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).addPaymentsBulk(payments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
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
      employeeId: number;
      month: number;
      year: number;
      paymentDate: string;
      updatedPayment: PaymentRecord;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).updatePayment(
        BigInt(employeeId),
        BigInt(month),
        BigInt(year),
        paymentDate,
        updatedPayment
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', variables.employeeId, variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'all', variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
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
      employeeId: number;
      month: number;
      year: number;
      paymentDate: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).deletePayment(BigInt(employeeId), BigInt(month), BigInt(year), paymentDate);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', variables.employeeId, variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'all', variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// MONTHLY BANK SALARY QUERIES
// ============================================================================

export function useGetAllMonthlyBankSalaries() {
  const { actor, isFetching } = useActor();

  return useQuery<MonthlyBankSalary[]>({
    queryKey: ['monthlyBankSalaries'],
    queryFn: async () => {
      if (!actor) return [];
      const result = await asPayroll(actor).getAllMonthlyBankSalaries();
      return result.map((s) => ({
        ...s,
        id: typeof s.id === 'bigint' ? Number(s.id) : s.id,
        employeeId: typeof s.employeeId === 'bigint' ? Number(s.employeeId) : s.employeeId,
        month: typeof s.month === 'bigint' ? Number(s.month) : s.month,
        year: typeof s.year === 'bigint' ? Number(s.year) : s.year,
        amount: typeof s.amount === 'bigint' ? Number(s.amount) : s.amount,
      }));
    },
    enabled: !!actor && !isFetching,
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
      employeeId: number;
      month: number;
      year: number;
      amount: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).setMonthlyBankSalary(BigInt(employeeId), BigInt(month), BigInt(year), amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useSetMonthlyBankSalariesBulk() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      salaries: Array<{ employeeId: number; month: number; year: number; amount: number }>
    ) => {
      if (!actor) throw new Error('Actor not available');
      const mapped = salaries.map((s) => ({
        employeeId: BigInt(s.employeeId),
        month: BigInt(s.month),
        year: BigInt(s.year),
        amount: s.amount,
      }));
      return asPayroll(actor).setMonthlyBankSalariesBulk(mapped);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
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
      id: number;
      employeeId: number;
      month: number;
      year: number;
      amount: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).updateMonthlyBankSalary(
        BigInt(id),
        BigInt(employeeId),
        BigInt(month),
        BigInt(year),
        amount
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
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
      id: number;
      employeeId: number;
      month: number;
      year: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return asPayroll(actor).deleteMonthlyBankSalary(
        BigInt(id),
        BigInt(employeeId),
        BigInt(month),
        BigInt(year)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// USER PROFILE QUERIES
// ============================================================================

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: { name: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}
