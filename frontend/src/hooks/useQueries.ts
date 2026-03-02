import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Employee as BackendEmployee } from '../backend';
import type {
  Employee,
  WorkDay,
  PaymentRecord,
  MonthlyBankSalary,
  LeaveDay,
  PayrollData,
} from '../types';

// ============================================================================
// LOCALSTORAGE HELPERS
// ============================================================================

const LS_KEYS = {
  workDays: 'workDays_v1',
  payments: 'payments_v1',
  monthlyBankSalaries: 'monthlyBankSalaries_v1',
  leaveDays: 'leaveDays_v1',
};

function getFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function setInLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// ============================================================================
// EMPLOYEE MAPPING
// ============================================================================

function mapBackendEmployee(e: BackendEmployee): Employee {
  return {
    id: Number(e.id),
    fullName: e.fullName,
    hourlyRate: Number(e.hourlyRate),
    overtimeRate: Number(e.overtimeRate),
    email: e.email ?? undefined,
    phone: e.phone ?? undefined,
    bankIban: e.bankIban ?? undefined,
    totalAnnualLeaveDays: Number(e.totalAnnualLeaveDays),
    fixedMonthlySalary: e.fixedMonthlySalary != null ? Number(e.fixedMonthlySalary) : undefined,
    employeeType: e.employeeType,
  };
}

// ============================================================================
// EMPLOYEE HOOKS
// ============================================================================

export function useGetEmployees() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      if (!actor) return [];
      const backendEmployees = await actor.getAllEmployees();
      return backendEmployees.map(mapBackendEmployee);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useAddEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      fullName: string;
      hourlyRate: string;
      overtimeRate: string;
      fixedMonthlySalary?: string;
      totalAnnualLeaveDays?: number;
      email?: string;
      phone?: string;
      bankIban?: string;
      employeeType: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const id = await actor.addEmployee(
        data.fullName,
        data.hourlyRate,
        data.overtimeRate,
        data.fixedMonthlySalary ?? null,
        data.totalAnnualLeaveDays != null ? BigInt(data.totalAnnualLeaveDays) : null,
        data.email ?? null,
        data.phone ?? null,
        data.bankIban ?? null,
        data.employeeType,
      );
      return Number(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee: Employee) => {
      // Update in localStorage cache for display purposes
      // The backend doesn't have an updateEmployee, so we store overrides locally
      const overrides = getFromLocalStorage<Record<number, Partial<Employee>>>('employeeOverrides_v1', {});
      overrides[employee.id] = employee;
      setInLocalStorage('employeeOverrides_v1', overrides);
      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: number) => {
      // Mark as deleted in localStorage
      const deleted = getFromLocalStorage<number[]>('deletedEmployees_v1', []);
      if (!deleted.includes(employeeId)) {
        deleted.push(employeeId);
        setInLocalStorage('deletedEmployees_v1', deleted);
      }
      return employeeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

// ============================================================================
// WORK DAYS HOOKS
// ============================================================================

// workDays stored as: { [employeeId]: { [date]: WorkDay } }
type WorkDaysStore = Record<number, Record<string, WorkDay>>;

export function useGetWorkDays(employeeId?: number, month?: number, year?: number) {
  return useQuery<WorkDay[]>({
    queryKey: ['workDays', employeeId, month, year],
    queryFn: () => {
      const store = getFromLocalStorage<WorkDaysStore>(LS_KEYS.workDays, {});
      if (employeeId !== undefined) {
        const empDays = store[employeeId] ?? {};
        let days = Object.values(empDays);
        if (month !== undefined && year !== undefined) {
          const prefix = `${year}-${String(month).padStart(2, '0')}`;
          days = days.filter((d) => d.date.startsWith(prefix));
        }
        return days;
      }
      // Return all
      const all: WorkDay[] = [];
      for (const empDays of Object.values(store)) {
        all.push(...Object.values(empDays));
      }
      return all;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useGetAllWorkDays() {
  return useQuery<WorkDaysStore>({
    queryKey: ['workDays', 'all'],
    queryFn: () => {
      return getFromLocalStorage<WorkDaysStore>(LS_KEYS.workDays, {});
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useSetWorkDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { employeeId: number; workDay: WorkDay }) => {
      const store = getFromLocalStorage<WorkDaysStore>(LS_KEYS.workDays, {});
      if (!store[data.employeeId]) store[data.employeeId] = {};
      store[data.employeeId][data.workDay.date] = data.workDay;
      setInLocalStorage(LS_KEYS.workDays, store);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useSetWorkDaysBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: { employeeId: number; workDay: WorkDay }[]) => {
      const store = getFromLocalStorage<WorkDaysStore>(LS_KEYS.workDays, {});
      for (const entry of entries) {
        if (!store[entry.employeeId]) store[entry.employeeId] = {};
        store[entry.employeeId][entry.workDay.date] = entry.workDay;
      }
      setInLocalStorage(LS_KEYS.workDays, store);
      return entries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeleteWorkDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { employeeId: number; date: string }) => {
      const store = getFromLocalStorage<WorkDaysStore>(LS_KEYS.workDays, {});
      if (store[data.employeeId]) {
        delete store[data.employeeId][data.date];
        setInLocalStorage(LS_KEYS.workDays, store);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// PAYMENTS HOOKS
// ============================================================================

// payments stored as: PaymentRecord[]
export function useGetPayments(employeeId?: number, month?: number, year?: number) {
  return useQuery<PaymentRecord[]>({
    queryKey: ['payments', employeeId, month, year],
    queryFn: () => {
      const all = getFromLocalStorage<PaymentRecord[]>(LS_KEYS.payments, []);
      let filtered = all;
      if (employeeId !== undefined) filtered = filtered.filter((p) => p.employeeId === employeeId);
      if (month !== undefined) filtered = filtered.filter((p) => p.month === month);
      if (year !== undefined) filtered = filtered.filter((p) => p.year === year);
      return filtered;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: PaymentRecord) => {
      const all = getFromLocalStorage<PaymentRecord[]>(LS_KEYS.payments, []);
      all.push(payment);
      setInLocalStorage(LS_KEYS.payments, all);
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useAddPaymentsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entries }: { entries: PaymentRecord[] }) => {
      const all = getFromLocalStorage<PaymentRecord[]>(LS_KEYS.payments, []);
      // Replace existing entries for same employee/month/year
      const newEntries = entries.filter((e) => e.cashPayment > 0 || e.bankPayment > 0);
      const filtered = all.filter(
        (p) =>
          !newEntries.some(
            (e) => e.employeeId === p.employeeId && e.month === p.month && e.year === p.year,
          ),
      );
      filtered.push(...newEntries);
      setInLocalStorage(LS_KEYS.payments, filtered);
      return entries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { index: number; payment: PaymentRecord }) => {
      const all = getFromLocalStorage<PaymentRecord[]>(LS_KEYS.payments, []);
      if (data.index >= 0 && data.index < all.length) {
        all[data.index] = data.payment;
        setInLocalStorage(LS_KEYS.payments, all);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (index: number) => {
      const all = getFromLocalStorage<PaymentRecord[]>(LS_KEYS.payments, []);
      all.splice(index, 1);
      setInLocalStorage(LS_KEYS.payments, all);
      return index;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// MONTHLY BANK SALARIES HOOKS
// ============================================================================

export function useGetMonthlyBankSalaries(employeeId?: number, month?: number, year?: number) {
  return useQuery<MonthlyBankSalary[]>({
    queryKey: ['monthlyBankSalaries', employeeId, month, year],
    queryFn: () => {
      const all = getFromLocalStorage<MonthlyBankSalary[]>(LS_KEYS.monthlyBankSalaries, []);
      let filtered = all;
      if (employeeId !== undefined) filtered = filtered.filter((s) => s.employeeId === employeeId);
      if (month !== undefined) filtered = filtered.filter((s) => s.month === month);
      if (year !== undefined) filtered = filtered.filter((s) => s.year === year);
      return filtered;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useSetMonthlyBankSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { employeeId: number; month: number; year: number; amount: number }) => {
      const all = getFromLocalStorage<MonthlyBankSalary[]>(LS_KEYS.monthlyBankSalaries, []);
      const existing = all.findIndex(
        (s) => s.employeeId === data.employeeId && s.month === data.month && s.year === data.year,
      );
      if (existing >= 0) {
        all[existing] = { ...all[existing], amount: data.amount };
      } else {
        const maxId = all.reduce((max, s) => Math.max(max, s.id), 0);
        all.push({ id: maxId + 1, ...data });
      }
      setInLocalStorage(LS_KEYS.monthlyBankSalaries, all);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useSetMonthlyBankSalariesBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: { employeeId: number; month: number; year: number; amount: number }[]) => {
      const all = getFromLocalStorage<MonthlyBankSalary[]>(LS_KEYS.monthlyBankSalaries, []);
      let maxId = all.reduce((max, s) => Math.max(max, s.id), 0);
      for (const entry of entries) {
        const existing = all.findIndex(
          (s) => s.employeeId === entry.employeeId && s.month === entry.month && s.year === entry.year,
        );
        if (existing >= 0) {
          all[existing] = { ...all[existing], amount: entry.amount };
        } else {
          maxId += 1;
          all.push({ id: maxId, ...entry });
        }
      }
      setInLocalStorage(LS_KEYS.monthlyBankSalaries, all);
      return entries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeleteMonthlyBankSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salary: MonthlyBankSalary) => {
      const all = getFromLocalStorage<MonthlyBankSalary[]>(LS_KEYS.monthlyBankSalaries, []);
      const idx = all.findIndex((s) => s.id === salary.id);
      if (idx >= 0) {
        all.splice(idx, 1);
        setInLocalStorage(LS_KEYS.monthlyBankSalaries, all);
      }
      return salary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// LEAVE DAYS HOOKS
// ============================================================================

export function useGetLeaveDays(employeeId?: number) {
  return useQuery<LeaveDay[]>({
    queryKey: ['leaveDays', employeeId],
    queryFn: () => {
      const all = getFromLocalStorage<LeaveDay[]>(LS_KEYS.leaveDays, []);
      if (employeeId !== undefined) return all.filter((l) => l.employeeId === employeeId);
      return all;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useToggleLeaveDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { employeeId: number; date: string; leaveType?: string }) => {
      const all = getFromLocalStorage<LeaveDay[]>(LS_KEYS.leaveDays, []);
      const existing = all.findIndex(
        (l) => l.employeeId === data.employeeId && l.date === data.date,
      );
      if (existing >= 0) {
        all.splice(existing, 1);
      } else {
        all.push({ employeeId: data.employeeId, date: data.date, leaveType: data.leaveType });
      }
      setInLocalStorage(LS_KEYS.leaveDays, all);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveDays'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useAddBulkLeaveDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { date: string; employeeIds: number[]; leaveType?: string }) => {
      const all = getFromLocalStorage<LeaveDay[]>(LS_KEYS.leaveDays, []);
      for (const empId of data.employeeIds) {
        const existing = all.findIndex((l) => l.employeeId === empId && l.date === data.date);
        if (existing < 0) {
          all.push({ employeeId: empId, date: data.date, leaveType: data.leaveType });
        }
      }
      setInLocalStorage(LS_KEYS.leaveDays, all);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveDays'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeleteLeaveDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { employeeId: number; date: string }) => {
      const all = getFromLocalStorage<LeaveDay[]>(LS_KEYS.leaveDays, []);
      const idx = all.findIndex((l) => l.employeeId === data.employeeId && l.date === data.date);
      if (idx >= 0) {
        all.splice(idx, 1);
        setInLocalStorage(LS_KEYS.leaveDays, all);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveDays'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// PAYROLL CALCULATION HOOKS
// ============================================================================

export function useGetAllPayrollData(month: number, year: number) {
  const { data: employees = [] } = useGetEmployees();

  return useQuery<PayrollData[]>({
    queryKey: ['payroll', month, year, employees.map((e) => e.id).join(',')],
    queryFn: () => {
      const workDaysStore = getFromLocalStorage<WorkDaysStore>(LS_KEYS.workDays, {});
      const allPayments = getFromLocalStorage<PaymentRecord[]>(LS_KEYS.payments, []);
      const allBankSalaries = getFromLocalStorage<MonthlyBankSalary[]>(LS_KEYS.monthlyBankSalaries, []);

      const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

      return employees.map((emp) => {
        // Work days for this month
        const empWorkDays = workDaysStore[emp.id] ?? {};
        const monthWorkDays = Object.values(empWorkDays).filter((d) => d.date.startsWith(monthPrefix));

        const normalHours = monthWorkDays.reduce((sum, d) => sum + d.normalHours, 0);
        const overtimeHours = monthWorkDays.reduce((sum, d) => sum + d.overtimeHours, 0);
        const leaveDays = monthWorkDays.filter((d) => d.isLeave).length;

        // Calculate total monthly salary
        let totalMonthlySalary = 0;
        if (emp.employeeType === 'monthly' && emp.fixedMonthlySalary) {
          totalMonthlySalary = emp.fixedMonthlySalary + overtimeHours * emp.overtimeRate;
        } else {
          totalMonthlySalary = normalHours * emp.hourlyRate + overtimeHours * emp.overtimeRate;
        }

        // Monthly bank fixed salary for this month
        const bankSalaryEntry = allBankSalaries.find(
          (s) => s.employeeId === emp.id && s.month === month && s.year === year,
        );
        const monthlyBankFixedSalary = bankSalaryEntry?.amount;

        // Payments for this month
        const monthPayments = allPayments.filter(
          (p) => p.employeeId === emp.id && p.month === month && p.year === year,
        );
        const totalCashPayments = monthPayments.reduce((sum, p) => sum + p.cashPayment, 0);
        const totalBankPayments = monthPayments.reduce((sum, p) => sum + p.bankPayment, 0);

        // Previous month carryover
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear = year - 1;
        }
        const prevMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        const prevWorkDays = Object.values(empWorkDays).filter((d) => d.date.startsWith(prevMonthPrefix));
        const prevNormalHours = prevWorkDays.reduce((sum, d) => sum + d.normalHours, 0);
        const prevOvertimeHours = prevWorkDays.reduce((sum, d) => sum + d.overtimeHours, 0);

        let prevTotalSalary = 0;
        if (emp.employeeType === 'monthly' && emp.fixedMonthlySalary) {
          prevTotalSalary = emp.fixedMonthlySalary + prevOvertimeHours * emp.overtimeRate;
        } else {
          prevTotalSalary = prevNormalHours * emp.hourlyRate + prevOvertimeHours * emp.overtimeRate;
        }

        const prevPayments = allPayments.filter(
          (p) => p.employeeId === emp.id && p.month === prevMonth && p.year === prevYear,
        );
        const prevCash = prevPayments.reduce((sum, p) => sum + p.cashPayment, 0);
        const prevBank = prevPayments.reduce((sum, p) => sum + p.bankPayment, 0);
        const prevBankSalary = allBankSalaries.find(
          (s) => s.employeeId === emp.id && s.month === prevMonth && s.year === prevYear,
        );
        const prevBankFixed = prevBankSalary?.amount ?? 0;

        const previousMonthSalaryCarryover = Math.max(0, prevTotalSalary - prevCash - prevBank);
        const previousMonthBankCarryover = Math.max(0, prevBankFixed - prevBank);

        // Remaining balances
        const remainingRealSalary = totalMonthlySalary - totalCashPayments - totalBankPayments;
        const remainingBankBalance = (monthlyBankFixedSalary ?? 0) - totalBankPayments;

        return {
          employeeId: emp.id,
          employeeName: emp.fullName,
          month,
          year,
          totalMonthlySalary,
          monthlyBankFixedSalary,
          totalCashPayments,
          totalBankPayments,
          remainingRealSalary,
          remainingBankBalance,
          previousMonthSalaryCarryover,
          previousMonthBankCarryover,
          normalHours,
          overtimeHours,
          leaveDays,
          employeeType: emp.employeeType,
        } as PayrollData;
      });
    },
    enabled: employees.length >= 0,
    staleTime: 0,
    refetchOnMount: true,
  });
}

// ============================================================================
// USER PROFILE HOOKS
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
    staleTime: 0,
    refetchOnMount: true,
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
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ============================================================================
// CHANGE HISTORY HOOKS
// ============================================================================

export function useGetChangeHistory(employeeId: number) {
  return useQuery({
    queryKey: ['changeHistory', employeeId],
    queryFn: () => {
      const key = `changeHistory_${employeeId}`;
      return getFromLocalStorage<{ date: string; changeType: string; description: string }[]>(key, []);
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useAddChangeHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      employeeId: number;
      entry: { date: string; changeType: string; description: string };
    }) => {
      const key = `changeHistory_${data.employeeId}`;
      const history = getFromLocalStorage<{ date: string; changeType: string; description: string }[]>(key, []);
      history.unshift(data.entry);
      setInLocalStorage(key, history);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['changeHistory', variables.employeeId] });
    },
  });
}
