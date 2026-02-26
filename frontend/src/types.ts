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
  employeeType: string;
}

export interface WorkDay {
  date: string;
  normalHours: number;
  overtimeHours: number;
  isLeave: boolean;
  leaveType?: string;
}

export interface PayrollRecord {
  employeeId: number;
  month: number;
  year: number;
  totalSalary: number;
  fixedSalary?: number;
  cashAmount: number;
  totalHours: number;
  overtimeHours: number;
}

export interface LeaveRecord {
  employeeId: number;
  totalAnnualLeaveDays: number;
  leaveDaysUsed: number;
  remainingLeaveDays: number;
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

export interface ChangeHistoryEntry {
  date: string;
  changeType: string;
  description: string;
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
