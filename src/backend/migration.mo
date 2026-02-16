import OrderedMap "mo:base/OrderedMap";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Stripe "stripe/stripe";

module {
  type Employee = {
    id : Nat;
    fullName : Text;
    hourlyRate : Float;
    overtimeRate : Float;
    email : ?Text;
    phone : ?Text;
    bankIban : ?Text;
    totalAnnualLeaveDays : Nat;
    fixedMonthlySalary : ?Float;
    employeeType : Text;
  };

  type WorkDay = {
    date : Text;
    normalHours : Float;
    overtimeHours : Float;
    isLeave : Bool;
    leaveType : ?Text;
  };

  type PayrollRecord = {
    employeeId : Nat;
    month : Nat;
    year : Nat;
    totalSalary : Float;
    fixedSalary : ?Float;
    cashAmount : Float;
    totalHours : Float;
    overtimeHours : Float;
  };

  type LeaveRecord = {
    employeeId : Nat;
    totalAnnualLeaveDays : Nat;
    leaveDaysUsed : Nat;
    remainingLeaveDays : Nat;
  };

  type PayrollBalance = {
    employeeId : Nat;
    month : Nat;
    year : Nat;
    remainingCashBalance : Float;
    remainingBankBalance : Float;
    remainingSalaryBalance : Float;
    carriedOverBankSalary : Float;
    carriedOverActualSalary : Float;
    carriedOverTotalSalary : Float;
    carriedOverBankFixedSalary : Float;
  };

  type PaymentRecord = {
    employeeId : Nat;
    month : Nat;
    year : Nat;
    cashPayment : Float;
    bankPayment : Float;
    paymentDate : Text;
  };

  type MonthlyBankSalary = {
    id : Nat;
    employeeId : Nat;
    month : Nat;
    year : Nat;
    amount : Float;
  };

  type ChangeHistoryEntry = {
    date : Text;
    changeType : Text;
    description : Text;
  };

  type ChangeHistory = [ChangeHistoryEntry];

  type UserProfile = {
    name : Text;
  };

  type OldActor = {
    employees : OrderedMap.Map<Nat, Employee>;
    workDays : OrderedMap.Map<Nat, OrderedMap.Map<Text, WorkDay>>;
    payrollRecords : OrderedMap.Map<Nat, OrderedMap.Map<Text, PayrollRecord>>;
    leaveRecords : OrderedMap.Map<Nat, LeaveRecord>;
    paymentRecords : OrderedMap.Map<Nat, OrderedMap.Map<Text, [PaymentRecord]>>;
    monthlyBankSalaries : OrderedMap.Map<Nat, OrderedMap.Map<Text, [MonthlyBankSalary]>>;
    payrollBalances : OrderedMap.Map<Nat, OrderedMap.Map<Text, PayrollBalance>>;
    dailyBulkEntries : OrderedMap.Map<Text, [(Nat, WorkDay)]>;
    userProfiles : OrderedMap.Map<Principal, UserProfile>;
    changeHistories : OrderedMap.Map<Nat, ChangeHistory>;
    nextEmployeeId : Nat;
    nextBankSalaryId : Nat;
    stripeConfiguration : ?Stripe.StripeConfiguration;
  };

  type NewActor = {
    employees : OrderedMap.Map<Nat, Employee>;
    workDays : OrderedMap.Map<Nat, OrderedMap.Map<Text, WorkDay>>;
    payrollRecords : OrderedMap.Map<Nat, OrderedMap.Map<Text, PayrollRecord>>;
    leaveRecords : OrderedMap.Map<Nat, LeaveRecord>;
    paymentRecords : OrderedMap.Map<Nat, OrderedMap.Map<Text, [PaymentRecord]>>;
    monthlyBankSalaries : OrderedMap.Map<Nat, OrderedMap.Map<Text, [MonthlyBankSalary]>>;
    payrollBalances : OrderedMap.Map<Nat, OrderedMap.Map<Text, PayrollBalance>>;
    userProfiles : OrderedMap.Map<Principal, UserProfile>;
    changeHistories : OrderedMap.Map<Nat, ChangeHistory>;
    nextEmployeeId : Nat;
    nextBankSalaryId : Nat;
    stripeConfiguration : ?Stripe.StripeConfiguration;
  };

  public func run(old : OldActor) : NewActor {
    {
      employees = old.employees;
      workDays = old.workDays;
      payrollRecords = old.payrollRecords;
      leaveRecords = old.leaveRecords;
      paymentRecords = old.paymentRecords;
      monthlyBankSalaries = old.monthlyBankSalaries;
      payrollBalances = old.payrollBalances;
      userProfiles = old.userProfiles;
      changeHistories = old.changeHistories;
      nextEmployeeId = old.nextEmployeeId;
      nextBankSalaryId = old.nextBankSalaryId;
      stripeConfiguration = old.stripeConfiguration;
    };
  };
};

