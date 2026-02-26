import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Employee } from '../backend';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkDay {
  date: string;
  normalHours: number;
  overtimeHours: number;
  isLeave: boolean;
  leaveType?: string;
}

export interface PaymentRecord {
  id: string;
  employeeId: number;
  month: number;
  year: number;
  cashPayment: number;
  bankPayment: number;
  paymentDate: string;
}

export interface MonthlyBankSalary {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  amount: number;
}

export interface LeaveDay {
  id: string;
  date: string;
}

export interface LeaveRecord {
  employeeId: number;
  totalAnnualLeaveDays: number;
  leaveDaysUsed: number;
  remainingLeaveDays: number;
  leaveDays: LeaveDay[];
}

export interface PayrollData {
  employeeId: number;
  employeeName: string;
  month: number;
  year: number;
  totalMonthlySalary: number;
  monthlyBankFixedSalary?: number;
  totalCashPayments: number;
  totalBankPayments: number;
  remainingRealSalary: number;
  remainingBankBalance: number;
  previousMonthSalaryCarryover: number;
  previousMonthBankCarryover: number;
  normalHours: number;
  overtimeHours: number;
  leaveDays: number;
  employeeType: string;
}

export interface ChangeHistoryEntry {
  date: string;
  changeType: string;
  description: string;
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
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
      try {
        const result = await actor.getAllEmployees();
        return result;
      } catch (err) {
        console.error('Failed to fetch employees:', err);
        return [];
      }
    },
    enabled: !!actor && !actorFetching,
    staleTime: 0,
    refetchOnMount: true,
  });
}

// Alias for backward compatibility
export const useEmployees = useGetEmployees;

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
        data.employeeType
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
    mutationFn: async (data: {
      id: number;
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
      // Backend doesn't have updateEmployee; store overrides locally
      const overrides = getFromStorage<Record<number, Partial<Employee>>>('employee_overrides', {});
      overrides[data.id] = {
        fullName: data.fullName,
        hourlyRate: parseFloat(data.hourlyRate) || 0,
        overtimeRate: parseFloat(data.overtimeRate) || 0,
        fixedMonthlySalary: data.fixedMonthlySalary ? parseFloat(data.fixedMonthlySalary) : undefined,
        totalAnnualLeaveDays: BigInt(data.totalAnnualLeaveDays ?? 0),
        email: data.email,
        phone: data.phone,
        bankIban: data.bankIban,
        employeeType: data.employeeType,
      };
      saveToStorage('employee_overrides', overrides);
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: number) => {
      const deleted = getFromStorage<number[]>('deleted_employees', []);
      if (!deleted.includes(employeeId)) {
        deleted.push(employeeId);
        saveToStorage('deleted_employees', deleted);
      }

      const workDays = getFromStorage<Record<number, Record<string, WorkDay>>>('workDays', {});
      delete workDays[employeeId];
      saveToStorage('workDays', workDays);

      const payments = getFromStorage<Record<number, PaymentRecord[]>>('payments', {});
      delete payments[employeeId];
      saveToStorage('payments', payments);

      const leaveRecords = getFromStorage<Record<number, LeaveRecord>>('leaveRecords', {});
      delete leaveRecords[employeeId];
      saveToStorage('leaveRecords', leaveRecords);

      const monthlyBankSalaries = getFromStorage<Record<number, MonthlyBankSalary[]>>('monthlyBankSalaries', {});
      delete monthlyBankSalaries[employeeId];
      saveToStorage('monthlyBankSalaries', monthlyBankSalaries);

      return employeeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// WORK DAYS HOOKS
// ============================================================================

export function useGetWorkDays(employeeId: number, month: number, year: number) {
  return useQuery<Record<string, WorkDay>>({
    queryKey: ['workDays', employeeId, month, year],
    queryFn: () => {
      const allWorkDays = getFromStorage<Record<number, Record<string, WorkDay>>>('workDays', {});
      const employeeWorkDays = allWorkDays[employeeId] ?? {};
      const filtered: Record<string, WorkDay> = {};
      for (const [date, wd] of Object.entries(employeeWorkDays)) {
        const d = new Date(date);
        if (d.getMonth() + 1 === month && d.getFullYear() === year) {
          filtered[date] = wd;
        }
      }
      return filtered;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

/**
 * Returns all work days for a given month/year, keyed by employeeId.
 * Each value is an array of WorkDay objects for that employee.
 */
export function useGetAllWorkDaysForMonth(month: number, year: number, employeeIds: number[]) {
  return useQuery<Record<number, WorkDay[]>>({
    queryKey: ['workDays', 'all', month, year, employeeIds],
    queryFn: () => {
      const allWorkDays = getFromStorage<Record<number, Record<string, WorkDay>>>('workDays', {});
      const result: Record<number, WorkDay[]> = {};
      for (const empId of employeeIds) {
        const empDays = allWorkDays[empId] ?? {};
        result[empId] = Object.values(empDays).filter((wd) => {
          const d = new Date(wd.date);
          return d.getMonth() + 1 === month && d.getFullYear() === year;
        });
      }
      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useGetDailyWorkEntries(date: string) {
  return useQuery<Record<number, WorkDay>>({
    queryKey: ['workDays', 'daily', date],
    queryFn: () => {
      const allWorkDays = getFromStorage<Record<number, Record<string, WorkDay>>>('workDays', {});
      const result: Record<number, WorkDay> = {};
      for (const [empId, days] of Object.entries(allWorkDays)) {
        if (days[date]) {
          result[Number(empId)] = days[date];
        }
      }
      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useSetWorkDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, workDay }: { employeeId: number; workDay: WorkDay }) => {
      const allWorkDays = getFromStorage<Record<number, Record<string, WorkDay>>>('workDays', {});
      if (!allWorkDays[employeeId]) allWorkDays[employeeId] = {};
      allWorkDays[employeeId][workDay.date] = workDay;
      saveToStorage('workDays', allWorkDays);
      return { employeeId, workDay };
    },
    onSuccess: ({ employeeId, workDay }) => {
      const date = new Date(workDay.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      queryClient.invalidateQueries({ queryKey: ['workDays', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workDays', 'daily', workDay.date] });
      queryClient.invalidateQueries({ queryKey: ['workDays', employeeId, month, year] });
      queryClient.invalidateQueries({ queryKey: ['workDays', 'all', month, year] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
    },
  });
}

export function useSetWorkDaysBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: { employeeId: number; workDay: WorkDay }[]) => {
      const allWorkDays = getFromStorage<Record<number, Record<string, WorkDay>>>('workDays', {});
      for (const { employeeId, workDay } of entries) {
        if (!allWorkDays[employeeId]) allWorkDays[employeeId] = {};
        allWorkDays[employeeId][workDay.date] = workDay;
      }
      saveToStorage('workDays', allWorkDays);
      return entries;
    },
    onSuccess: (entries) => {
      const affectedDates = new Set<string>();
      const affectedMonthYears = new Set<string>();
      for (const { employeeId, workDay } of entries) {
        const date = new Date(workDay.date);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        affectedDates.add(workDay.date);
        affectedMonthYears.add(`${month}-${year}`);
        queryClient.invalidateQueries({ queryKey: ['workDays', employeeId] });
      }
      for (const dateStr of affectedDates) {
        queryClient.invalidateQueries({ queryKey: ['workDays', 'daily', dateStr] });
      }
      for (const my of affectedMonthYears) {
        const [m, y] = my.split('-').map(Number);
        queryClient.invalidateQueries({ queryKey: ['workDays', 'all', m, y] });
      }
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
    },
  });
}

export function useDeleteWorkDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, date }: { employeeId: number; date: string }) => {
      const allWorkDays = getFromStorage<Record<number, Record<string, WorkDay>>>('workDays', {});
      if (allWorkDays[employeeId]) {
        delete allWorkDays[employeeId][date];
        saveToStorage('workDays', allWorkDays);
      }
      return { employeeId, date };
    },
    onSuccess: ({ employeeId, date }) => {
      const d = new Date(date);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      queryClient.invalidateQueries({ queryKey: ['workDays', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workDays', 'daily', date] });
      queryClient.invalidateQueries({ queryKey: ['workDays', employeeId, month, year] });
      queryClient.invalidateQueries({ queryKey: ['workDays', 'all', month, year] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// PAYMENT HOOKS
// ============================================================================

export function useGetPayments(month: number, year: number, employeeId?: number) {
  return useQuery<PaymentRecord[]>({
    queryKey: ['payments', month, year, employeeId],
    queryFn: () => {
      const allPayments = getFromStorage<Record<number, PaymentRecord[]>>('payments', {});
      const result: PaymentRecord[] = [];
      if (employeeId !== undefined) {
        const empPayments = allPayments[employeeId] ?? [];
        return empPayments.filter((p) => p.month === month && p.year === year);
      }
      for (const empPayments of Object.values(allPayments)) {
        for (const p of empPayments) {
          if (p.month === month && p.year === year) {
            result.push(p);
          }
        }
      }
      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useGetAllPayments(month: number, year: number) {
  return useQuery<PaymentRecord[]>({
    queryKey: ['payments', 'all', month, year],
    queryFn: () => {
      const allPayments = getFromStorage<Record<number, PaymentRecord[]>>('payments', {});
      const result: PaymentRecord[] = [];
      for (const empPayments of Object.values(allPayments)) {
        for (const p of empPayments) {
          if (p.month === month && p.year === year) {
            result.push(p);
          }
        }
      }
      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: Omit<PaymentRecord, 'id'>) => {
      const allPayments = getFromStorage<Record<number, PaymentRecord[]>>('payments', {});
      if (!allPayments[payment.employeeId]) allPayments[payment.employeeId] = [];
      const newPayment: PaymentRecord = {
        ...payment,
        id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      allPayments[payment.employeeId].push(newPayment);
      saveToStorage('payments', allPayments);
      return newPayment;
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
    mutationFn: async ({ entries }: { entries: Omit<PaymentRecord, 'id'>[] }) => {
      const allPayments = getFromStorage<Record<number, PaymentRecord[]>>('payments', {});
      const newPayments: PaymentRecord[] = [];
      for (const payment of entries) {
        if (!allPayments[payment.employeeId]) allPayments[payment.employeeId] = [];
        const newPayment: PaymentRecord = {
          ...payment,
          id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        allPayments[payment.employeeId].push(newPayment);
        newPayments.push(newPayment);
      }
      saveToStorage('payments', allPayments);
      return newPayments;
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
    mutationFn: async (payment: PaymentRecord) => {
      const allPayments = getFromStorage<Record<number, PaymentRecord[]>>('payments', {});
      if (allPayments[payment.employeeId]) {
        allPayments[payment.employeeId] = allPayments[payment.employeeId].map((p) =>
          p.id === payment.id ? payment : p
        );
        saveToStorage('payments', allPayments);
      }
      return payment;
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
    mutationFn: async ({ employeeId, paymentId }: { employeeId: number; paymentId: string }) => {
      const allPayments = getFromStorage<Record<number, PaymentRecord[]>>('payments', {});
      if (allPayments[employeeId]) {
        allPayments[employeeId] = allPayments[employeeId].filter((p) => p.id !== paymentId);
        saveToStorage('payments', allPayments);
      }
      return { employeeId, paymentId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// MONTHLY BANK SALARY HOOKS
// ============================================================================

export function useGetMonthlyBankSalaries(month: number, year: number) {
  return useQuery<MonthlyBankSalary[]>({
    queryKey: ['monthlyBankSalaries', month, year],
    queryFn: () => {
      const allSalaries = getFromStorage<Record<number, MonthlyBankSalary[]>>('monthlyBankSalaries', {});
      const result: MonthlyBankSalary[] = [];
      for (const empSalaries of Object.values(allSalaries)) {
        for (const s of empSalaries) {
          if (s.month === month && s.year === year) {
            result.push(s);
          }
        }
      }
      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useGetAllMonthlyBankSalaries(month: number, year: number) {
  return useQuery<MonthlyBankSalary[]>({
    queryKey: ['monthlyBankSalaries', 'all', month, year],
    queryFn: () => {
      const allSalaries = getFromStorage<Record<number, MonthlyBankSalary[]>>('monthlyBankSalaries', {});
      const result: MonthlyBankSalary[] = [];
      for (const empSalaries of Object.values(allSalaries)) {
        for (const s of empSalaries) {
          if (s.month === month && s.year === year) {
            result.push(s);
          }
        }
      }
      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useSetMonthlyBankSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salary: Omit<MonthlyBankSalary, 'id'>) => {
      const allSalaries = getFromStorage<Record<number, MonthlyBankSalary[]>>('monthlyBankSalaries', {});
      if (!allSalaries[salary.employeeId]) allSalaries[salary.employeeId] = [];

      const existingIdx = allSalaries[salary.employeeId].findIndex(
        (s) => s.month === salary.month && s.year === salary.year
      );

      let nextId = getFromStorage<number>('nextBankSalaryId', 1);
      if (existingIdx >= 0) {
        allSalaries[salary.employeeId][existingIdx] = {
          ...salary,
          id: allSalaries[salary.employeeId][existingIdx].id,
        };
      } else {
        allSalaries[salary.employeeId].push({ ...salary, id: nextId });
        nextId++;
        saveToStorage('nextBankSalaryId', nextId);
      }
      saveToStorage('monthlyBankSalaries', allSalaries);
      return salary;
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
    mutationFn: async (entries: Omit<MonthlyBankSalary, 'id'>[]) => {
      const allSalaries = getFromStorage<Record<number, MonthlyBankSalary[]>>('monthlyBankSalaries', {});
      let nextId = getFromStorage<number>('nextBankSalaryId', 1);

      for (const salary of entries) {
        if (!allSalaries[salary.employeeId]) allSalaries[salary.employeeId] = [];
        const existingIdx = allSalaries[salary.employeeId].findIndex(
          (s) => s.month === salary.month && s.year === salary.year
        );
        if (existingIdx >= 0) {
          allSalaries[salary.employeeId][existingIdx] = {
            ...salary,
            id: allSalaries[salary.employeeId][existingIdx].id,
          };
        } else {
          allSalaries[salary.employeeId].push({ ...salary, id: nextId });
          nextId++;
        }
      }
      saveToStorage('nextBankSalaryId', nextId);
      saveToStorage('monthlyBankSalaries', allSalaries);
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
    mutationFn: async ({ employeeId, id }: { employeeId: number; id: number }) => {
      const allSalaries = getFromStorage<Record<number, MonthlyBankSalary[]>>('monthlyBankSalaries', {});
      if (allSalaries[employeeId]) {
        allSalaries[employeeId] = allSalaries[employeeId].filter((s) => s.id !== id);
        saveToStorage('monthlyBankSalaries', allSalaries);
      }
      return { employeeId, id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBankSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

// ============================================================================
// LEAVE RECORD HOOKS
// ============================================================================

export function useGetLeaveRecords() {
  return useQuery<LeaveRecord[]>({
    queryKey: ['leaveRecords'],
    queryFn: () => {
      const records = getFromStorage<Record<number, LeaveRecord>>('leaveRecords', {});
      return Object.values(records);
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useGetLeaveRecord(employeeId: number) {
  return useQuery<LeaveRecord | null>({
    queryKey: ['leaveRecords', employeeId],
    queryFn: () => {
      const records = getFromStorage<Record<number, LeaveRecord>>('leaveRecords', {});
      return records[employeeId] ?? null;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

/**
 * Returns the leave days array for a specific employee.
 * Alias for useGetLeaveRecord that returns just the leaveDays array.
 */
export function useGetLeaveDays(employeeId: number) {
  return useQuery<LeaveDay[]>({
    queryKey: ['leaveRecords', employeeId, 'days'],
    queryFn: () => {
      const records = getFromStorage<Record<number, LeaveRecord>>('leaveRecords', {});
      return records[employeeId]?.leaveDays ?? [];
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useToggleLeaveDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, date }: { employeeId: number; date: string }) => {
      const records = getFromStorage<Record<number, LeaveRecord>>('leaveRecords', {});
      if (!records[employeeId]) {
        records[employeeId] = {
          employeeId,
          totalAnnualLeaveDays: 0,
          leaveDaysUsed: 0,
          remainingLeaveDays: 0,
          leaveDays: [],
        };
      }
      const record = records[employeeId];
      const existingIdx = record.leaveDays.findIndex((ld) => ld.date === date);
      if (existingIdx >= 0) {
        record.leaveDays.splice(existingIdx, 1);
        record.leaveDaysUsed = Math.max(0, record.leaveDaysUsed - 1);
      } else {
        record.leaveDays.push({ id: `leave-${Date.now()}`, date });
        record.leaveDaysUsed += 1;
      }
      record.remainingLeaveDays = Math.max(0, record.totalAnnualLeaveDays - record.leaveDaysUsed);
      records[employeeId] = record;
      saveToStorage('leaveRecords', records);
      return { employeeId, date };
    },
    onSuccess: ({ employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useAddBulkLeaveDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, employeeIds }: { date: string; employeeIds: number[] }) => {
      const records = getFromStorage<Record<number, LeaveRecord>>('leaveRecords', {});
      for (const employeeId of employeeIds) {
        if (!records[employeeId]) {
          records[employeeId] = {
            employeeId,
            totalAnnualLeaveDays: 0,
            leaveDaysUsed: 0,
            remainingLeaveDays: 0,
            leaveDays: [],
          };
        }
        const record = records[employeeId];
        const exists = record.leaveDays.some((ld) => ld.date === date);
        if (!exists) {
          record.leaveDays.push({ id: `leave-${Date.now()}-${employeeId}`, date });
          record.leaveDaysUsed += 1;
          record.remainingLeaveDays = Math.max(0, record.totalAnnualLeaveDays - record.leaveDaysUsed);
        }
        records[employeeId] = record;
      }
      saveToStorage('leaveRecords', records);
      return { date, employeeIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeleteLeaveDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, leaveDayId }: { employeeId: number; leaveDayId: string }) => {
      const records = getFromStorage<Record<number, LeaveRecord>>('leaveRecords', {});
      if (records[employeeId]) {
        const record = records[employeeId];
        const existingIdx = record.leaveDays.findIndex((ld) => ld.id === leaveDayId);
        if (existingIdx >= 0) {
          record.leaveDays.splice(existingIdx, 1);
          record.leaveDaysUsed = Math.max(0, record.leaveDaysUsed - 1);
          record.remainingLeaveDays = Math.max(0, record.totalAnnualLeaveDays - record.leaveDaysUsed);
        }
        records[employeeId] = record;
        saveToStorage('leaveRecords', records);
      }
      return { employeeId, leaveDayId };
    },
    onSuccess: ({ employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useUpdateLeaveRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: LeaveRecord) => {
      const records = getFromStorage<Record<number, LeaveRecord>>('leaveRecords', {});
      records[record.employeeId] = record;
      saveToStorage('leaveRecords', records);
      return record;
    },
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRecords', record.employeeId] });
    },
  });
}

// ============================================================================
// PAYROLL HOOKS
// ============================================================================

export function useGetPayroll(month: number, year: number, employees: Employee[]) {
  return useQuery<PayrollData[]>({
    queryKey: ['payroll', month, year, employees.map((e) => Number(e.id))],
    queryFn: () => {
      const allWorkDays = getFromStorage<Record<number, Record<string, WorkDay>>>('workDays', {});
      const allPayments = getFromStorage<Record<number, PaymentRecord[]>>('payments', {});
      const allSalaries = getFromStorage<Record<number, MonthlyBankSalary[]>>('monthlyBankSalaries', {});

      const results: PayrollData[] = [];

      for (const employee of employees) {
        const empId = Number(employee.id);

        // Get work days for this month/year
        const empWorkDays = allWorkDays[empId] ?? {};
        let normalHours = 0;
        let overtimeHours = 0;
        let leaveDaysCount = 0;

        for (const [date, wd] of Object.entries(empWorkDays)) {
          const d = new Date(date);
          if (d.getMonth() + 1 === month && d.getFullYear() === year) {
            if (wd.isLeave) {
              leaveDaysCount += 1;
            } else {
              normalHours += wd.normalHours;
              overtimeHours += wd.overtimeHours;
            }
          }
        }

        // Get payments for this month/year
        const empPayments = (allPayments[empId] ?? []).filter(
          (p) => p.month === month && p.year === year
        );
        const totalCashPayments = empPayments.reduce((sum, p) => sum + p.cashPayment, 0);
        const totalBankPayments = empPayments.reduce((sum, p) => sum + p.bankPayment, 0);

        // Get monthly bank salary
        const empSalaries = allSalaries[empId] ?? [];
        const monthlyBankSalary = empSalaries.find((s) => s.month === month && s.year === year);
        const monthlyBankFixedSalary = monthlyBankSalary?.amount;

        // Calculate total salary
        let totalMonthlySalary = 0;
        if (employee.employeeType === 'monthly') {
          totalMonthlySalary = employee.fixedMonthlySalary ?? 0;
        } else {
          totalMonthlySalary =
            normalHours * employee.hourlyRate + overtimeHours * employee.overtimeRate;
        }

        const remainingRealSalary = totalMonthlySalary - totalCashPayments - totalBankPayments;
        const remainingBankBalance = (monthlyBankFixedSalary ?? 0) - totalBankPayments;

        results.push({
          employeeId: empId,
          employeeName: employee.fullName,
          month,
          year,
          totalMonthlySalary,
          monthlyBankFixedSalary,
          totalCashPayments,
          totalBankPayments,
          remainingRealSalary,
          remainingBankBalance,
          previousMonthSalaryCarryover: 0,
          previousMonthBankCarryover: 0,
          normalHours,
          overtimeHours,
          leaveDays: leaveDaysCount,
          employeeType: employee.employeeType,
        });
      }

      return results;
    },
    enabled: employees.length > 0,
    staleTime: 0,
    refetchOnMount: true,
  });
}

// Alias for backward compatibility
export const useGetPayrollData = useGetPayroll;

// ============================================================================
// CHANGE HISTORY HOOKS
// ============================================================================

export function useGetChangeHistory(employeeId: number) {
  return useQuery<ChangeHistoryEntry[]>({
    queryKey: ['changeHistory', employeeId],
    queryFn: () => {
      const histories = getFromStorage<Record<number, ChangeHistoryEntry[]>>('changeHistories', {});
      return histories[employeeId] ?? [];
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useAddChangeHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      entry,
    }: {
      employeeId: number;
      entry: ChangeHistoryEntry;
    }) => {
      const histories = getFromStorage<Record<number, ChangeHistoryEntry[]>>('changeHistories', {});
      if (!histories[employeeId]) histories[employeeId] = [];
      histories[employeeId].unshift(entry);
      saveToStorage('changeHistories', histories);
      return { employeeId, entry };
    },
    onSuccess: ({ employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['changeHistory', employeeId] });
    },
  });
}
