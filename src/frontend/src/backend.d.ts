import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ChangeHistoryEntry {
    changeType: string;
    date: string;
    description: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface PayrollData {
    totalBankPayments: number;
    month: bigint;
    employeeName: string;
    employeeType: string;
    year: bigint;
    previousMonthSalaryCarryover: number;
    monthlyBankFixedSalary?: number;
    totalCashPayments: number;
    remainingRealSalary: number;
    employeeId: bigint;
    previousMonthBankCarryover: number;
    remainingBankBalance: number;
    normalHours: number;
    totalMonthlySalary: number;
    leaveDays: number;
    overtimeHours: number;
}
export interface EmployeeLeaveRecord {
    remainingLeaveDays: bigint;
    employeeName: string;
    totalAnnualLeaveDays: bigint;
    employeeId: bigint;
    leaveDaysUsed: bigint;
}
export interface PaymentRecord {
    month: bigint;
    year: bigint;
    cashPayment: number;
    bankPayment: number;
    employeeId: bigint;
    paymentDate: string;
}
export interface LeaveRecord {
    remainingLeaveDays: bigint;
    totalAnnualLeaveDays: bigint;
    employeeId: bigint;
    leaveDaysUsed: bigint;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface WorkDay {
    isLeave: boolean;
    date: string;
    normalHours: number;
    leaveType?: string;
    overtimeHours: number;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export type ChangeHistory = Array<ChangeHistoryEntry>;
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface EmployeePayments {
    totalBankPayments: number;
    employeeName: string;
    payments: Array<PaymentRecord>;
    totalCashPayments: number;
    employeeId: bigint;
}
export interface MonthlyBankSalary {
    id: bigint;
    month: bigint;
    year: bigint;
    employeeId: bigint;
    amount: number;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface Employee {
    id: bigint;
    fixedMonthlySalary?: number;
    employeeType: string;
    hourlyRate: number;
    fullName: string;
    bankIban?: string;
    email?: string;
    totalAnnualLeaveDays: bigint;
    overtimeRate: number;
    phone?: string;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addBulkLeaveDay(date: string): Promise<void>;
    addEmployee(fullName: string, hourlyRate: string, overtimeRate: string, fixedMonthlySalary: string | null, totalAnnualLeaveDays: bigint | null, email: string | null, phone: string | null, bankIban: string | null, employeeType: string): Promise<bigint>;
    addPayment(payment: PaymentRecord): Promise<void>;
    addPaymentsBulk(payments: Array<PaymentRecord>): Promise<void>;
    addWorkDay(employeeId: bigint, workDay: WorkDay): Promise<void>;
    addWorkDaysBulk(entries: Array<[bigint, WorkDay]>): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    calculateAndUpdatePayroll(): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    deleteEmployee(employeeId: bigint): Promise<void>;
    deleteLeaveRecord(employeeId: bigint, date: string): Promise<void>;
    deleteMonthlyBankSalary(id: bigint, employeeId: bigint, month: bigint, year: bigint): Promise<void>;
    deletePayment(employeeId: bigint, month: bigint, year: bigint, paymentDate: string): Promise<void>;
    deleteWorkDay(employeeId: bigint, date: string): Promise<void>;
    getAllEmployeeLeaveRecords(): Promise<Array<EmployeeLeaveRecord>>;
    getAllEmployees(): Promise<Array<Employee>>;
    getAllEmployeesPayments(month: bigint, year: bigint): Promise<Array<EmployeePayments>>;
    getAllEmployeesPayrollData(month: bigint, year: bigint): Promise<Array<PayrollData>>;
    getAllLeaveRecords(): Promise<Array<LeaveRecord>>;
    getAllMonthlyBankSalaries(): Promise<Array<MonthlyBankSalary>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChangeHistoryLog(employeeId: bigint): Promise<ChangeHistory>;
    getDailyBulkWorkDays(date: string): Promise<Array<[bigint, WorkDay]>>;
    getEmployee(employeeId: bigint): Promise<Employee | null>;
    getEmployeePayrollData(employeeId: bigint, month: bigint, year: bigint): Promise<PayrollData | null>;
    getLeaveRecord(employeeId: bigint): Promise<LeaveRecord | null>;
    getMonthlyBankSalary(employeeId: bigint, month: bigint, year: bigint): Promise<number | null>;
    getPayments(employeeId: bigint, month: bigint, year: bigint): Promise<Array<PaymentRecord>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWorkDay(employeeId: bigint, date: string): Promise<WorkDay | null>;
    getWorkDays(employeeId: bigint): Promise<Array<WorkDay>>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    resetAllLeaveRecords(newAnnualLeaveDays: bigint): Promise<void>;
    resetLeaveRecord(employeeId: bigint, newAnnualLeaveDays: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveDailyBulkWorkDays(date: string, entries: Array<[bigint, WorkDay]>): Promise<void>;
    setChangeHistoryLog(employeeId: bigint, newChangeHistory: ChangeHistory): Promise<void>;
    setMonthlyBankSalariesBulk(salaries: Array<[bigint, bigint, bigint, number]>): Promise<void>;
    setMonthlyBankSalary(employeeId: bigint, month: bigint, year: bigint, amount: number): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    toggleLeaveDay(employeeId: bigint, date: string): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateEmployeeWithChangeLog(employeeId: bigint, updatedEmployee: Employee): Promise<void>;
    updateLeaveDaysUsed(employeeId: bigint, newLeaveDaysUsed: bigint): Promise<void>;
    updateMonthlyBankSalary(id: bigint, employeeId: bigint, month: bigint, year: bigint, amount: number): Promise<void>;
    updatePayment(employeeId: bigint, month: bigint, year: bigint, paymentDate: string, updatedPayment: PaymentRecord): Promise<void>;
    updatePaymentsBulk(payments: Array<PaymentRecord>): Promise<void>;
    updateWorkDay(employeeId: bigint, date: string, updatedWorkDay: WorkDay): Promise<void>;
    updateWorkDaysBulk(entries: Array<[bigint, WorkDay]>): Promise<void>;
}
