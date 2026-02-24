// Local type definitions for the payroll application
// These types mirror the backend data structures but are defined locally
// since the backend interface only exports a minimal set of types.

export interface Employee {
  id: number;
  fullName: string;
  hourlyRate: number;
  overtimeRate: number;
  email: string | null;
  phone: string | null;
  bankIban: string | null;
  totalAnnualLeaveDays: number;
  fixedMonthlySalary: number | null;
  employeeType: string; // 'monthly' | 'hourly'
}

export interface WorkDay {
  date: string;
  normalHours: number;
  overtimeHours: number;
  isLeave: boolean;
  leaveType: string | null;
}

export interface LeaveRecord {
  employeeId: number;
  totalAnnualLeaveDays: number;
  leaveDaysUsed: number;
  remainingLeaveDays: number;
}

export interface PaymentRecord {
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

export interface PayrollData {
  employeeId: number;
  employeeName: string;
  month: number;
  year: number;
  totalMonthlySalary: number;
  monthlyBankFixedSalary: number | null;
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

export type ChangeHistory = ChangeHistoryEntry[];

export interface PayrollRecord {
  employeeId: number;
  month: number;
  year: number;
  totalSalary: number;
  fixedSalary: number | null;
  cashAmount: number;
  totalHours: number;
  overtimeHours: number;
}

export interface PayrollBalance {
  employeeId: number;
  month: number;
  year: number;
  remainingCashBalance: number;
  remainingBankBalance: number;
  remainingSalaryBalance: number;
  carriedOverBankSalary: number;
  carriedOverActualSalary: number;
  carriedOverTotalSalary: number;
  carriedOverBankFixedSalary: number;
}

// Extended backend interface with all payroll-specific methods
export interface PayrollBackend {
  // Employee management
  getAllEmployees(): Promise<Employee[]>;
  getEmployee(employeeId: bigint): Promise<Employee | null>;
  addEmployee(
    fullName: string,
    hourlyRate: string,
    overtimeRate: string,
    fixedMonthlySalary: string | null,
    totalAnnualLeaveDays: bigint | null,
    email: string | null,
    phone: string | null,
    bankIban: string | null,
    employeeType: string
  ): Promise<bigint>;
  updateEmployeeWithChangeLog(employeeId: bigint, employee: Partial<Employee>): Promise<void>;
  deleteEmployee(employeeId: bigint): Promise<void>;

  // Change history
  getChangeHistoryLog(employeeId: bigint): Promise<ChangeHistory>;
  setChangeHistoryLog(employeeId: bigint, entries: ChangeHistory): Promise<void>;

  // Work days
  getWorkDays(employeeId: bigint): Promise<WorkDay[]>;
  getWorkDay(employeeId: bigint, date: string): Promise<WorkDay | null>;
  getDailyBulkWorkDays(date: string): Promise<Array<{ employeeId: bigint; workDay: WorkDay | null }>>;
  addWorkDay(employeeId: bigint, workDay: WorkDay): Promise<void>;
  saveDailyBulkWorkDays(date: string, entries: Array<{ employeeId: bigint; workDay: WorkDay }>): Promise<void>;
  addWorkDaysBulk(entries: Array<{ employeeId: bigint; workDay: WorkDay }>): Promise<void>;
  updateWorkDay(employeeId: bigint, date: string, workDay: WorkDay): Promise<void>;
  deleteWorkDay(employeeId: bigint, date: string): Promise<void>;

  // Payroll
  getAllEmployeesPayrollData(month: bigint, year: bigint): Promise<PayrollData[]>;
  getEmployeePayrollData(employeeId: bigint, month: bigint, year: bigint): Promise<PayrollData | null>;

  // Leave
  getAllEmployeeLeaveRecords(): Promise<LeaveRecord[]>;
  getLeaveRecord(employeeId: bigint): Promise<LeaveRecord | null>;
  updateLeaveDaysUsed(employeeId: bigint, newLeaveDaysUsed: bigint): Promise<void>;
  toggleLeaveDay(employeeId: bigint, date: string): Promise<void>;
  deleteLeaveRecord(employeeId: bigint, date: string): Promise<void>;
  addBulkLeaveDay(date: string): Promise<void>;
  resetAllLeaveRecords(newAnnualLeaveDays: bigint): Promise<void>;

  // Payments
  getPayments(employeeId: bigint, month: bigint, year: bigint): Promise<PaymentRecord[]>;
  getAllEmployeesPayments(month: bigint, year: bigint): Promise<Array<{ employeeId: bigint; payments: PaymentRecord[] }>>;
  addPayment(payment: PaymentRecord): Promise<void>;
  addPaymentsBulk(payments: PaymentRecord[]): Promise<void>;
  updatePayment(employeeId: bigint, month: bigint, year: bigint, paymentDate: string, updatedPayment: PaymentRecord): Promise<void>;
  deletePayment(employeeId: bigint, month: bigint, year: bigint, paymentDate: string): Promise<void>;

  // Monthly bank salaries
  getAllMonthlyBankSalaries(): Promise<MonthlyBankSalary[]>;
  setMonthlyBankSalary(employeeId: bigint, month: bigint, year: bigint, amount: number): Promise<void>;
  setMonthlyBankSalariesBulk(salaries: Array<{ employeeId: bigint; month: bigint; year: bigint; amount: number }>): Promise<void>;
  updateMonthlyBankSalary(id: bigint, employeeId: bigint, month: bigint, year: bigint, amount: number): Promise<void>;
  deleteMonthlyBankSalary(id: bigint, employeeId: bigint, month: bigint, year: bigint): Promise<void>;

  // Access control (from base interface)
  initializeAccessControl(): Promise<void>;
  assignCallerUserRole(user: import('@icp-sdk/core/principal').Principal, role: import('./backend').UserRole): Promise<void>;
  getCallerUserProfile(): Promise<import('./backend').UserProfile | null>;
  saveCallerUserProfile(profile: import('./backend').UserProfile): Promise<void>;
  isCallerAdmin(): Promise<boolean>;
  getCallerUserRole(): Promise<import('./backend').UserRole>;
}
