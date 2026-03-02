// ============================================================================
// FRONTEND TYPES
// ============================================================================

export interface Employee {
  id: number;
  fullName: string;
  hourlyRate: number;
  overtimeRate: number;
  email?: string;
  phone?: string;
  bankIban?: string;
  totalAnnualLeaveDays: number;
  fixedMonthlySalary?: number;
  employeeType: string; // 'monthly' | 'hourly'
}

export interface WorkDay {
  date: string; // YYYY-MM-DD
  normalHours: number;
  overtimeHours: number;
  isLeave: boolean;
  leaveType?: string;
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

export interface LeaveDay {
  employeeId: number;
  date: string; // YYYY-MM-DD
  leaveType?: string;
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
