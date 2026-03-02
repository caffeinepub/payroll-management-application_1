import OrderedMap "mo:base/OrderedMap";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Float "mo:base/Float";
import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";
import AccessControl "authorization/access-control";



actor {
  // ============================================================================
  // MAP INITIALIZATIONS
  // ============================================================================

  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);
  transient let textMap = OrderedMap.Make<Text>(Text.compare);
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);

  // ============================================================================
  // ACCESS CONTROL
  // ============================================================================

  let accessControlState = AccessControl.initState();

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // ============================================================================
  // EMPLOYEE MANAGEMENT TYPES
  // ============================================================================

  public type Employee = {
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

  public type WorkDay = {
    date : Text;
    normalHours : Float;
    overtimeHours : Float;
    isLeave : Bool;
    leaveType : ?Text;
  };

  public type PayrollRecord = {
    employeeId : Nat;
    month : Nat;
    year : Nat;
    totalSalary : Float;
    fixedSalary : ?Float;
    cashAmount : Float;
    totalHours : Float;
    overtimeHours : Float;
  };

  public type LeaveRecord = {
    employeeId : Nat;
    totalAnnualLeaveDays : Nat;
    leaveDaysUsed : Nat;
    remainingLeaveDays : Nat;
  };

  public type PayrollBalance = {
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

  public type PaymentRecord = {
    employeeId : Nat;
    month : Nat;
    year : Nat;
    cashPayment : Float;
    bankPayment : Float;
    paymentDate : Text;
  };

  public type MonthlyBankSalary = {
    id : Nat;
    employeeId : Nat;
    month : Nat;
    year : Nat;
    amount : Float;
  };

  public type ChangeHistoryEntry = {
    date : Text;
    changeType : Text;
    description : Text;
  };

  public type ChangeHistory = [ChangeHistoryEntry];

  public type UserProfile = {
    name : Text;
  };

  // ============================================================================
  // PAYROLL DATA TYPES
  // ============================================================================

  public type PayrollData = {
    employeeId : Nat;
    employeeName : Text;
    month : Nat;
    year : Nat;
    totalMonthlySalary : Float;
    monthlyBankFixedSalary : ?Float;
    totalCashPayments : Float;
    totalBankPayments : Float;
    remainingRealSalary : Float;
    remainingBankBalance : Float;
    previousMonthSalaryCarryover : Float;
    previousMonthBankCarryover : Float;
    normalHours : Float;
    overtimeHours : Float;
    leaveDays : Float;
    employeeType : Text;
  };

  // ============================================================================
  // DATA STORAGE
  // ============================================================================

  var employees : OrderedMap.Map<Nat, Employee> = natMap.empty<Employee>();
  var workDays : OrderedMap.Map<Nat, OrderedMap.Map<Text, WorkDay>> = natMap.empty<OrderedMap.Map<Text, WorkDay>>();
  var payrollRecords : OrderedMap.Map<Nat, OrderedMap.Map<Text, PayrollRecord>> = natMap.empty<OrderedMap.Map<Text, PayrollRecord>>();
  var leaveRecords : OrderedMap.Map<Nat, LeaveRecord> = natMap.empty<LeaveRecord>();
  var paymentRecords : OrderedMap.Map<Nat, OrderedMap.Map<Text, [PaymentRecord]>> = natMap.empty<OrderedMap.Map<Text, [PaymentRecord]>>();
  var monthlyBankSalaries : OrderedMap.Map<Nat, OrderedMap.Map<Text, [MonthlyBankSalary]>> = natMap.empty<OrderedMap.Map<Text, [MonthlyBankSalary]>>();
  var payrollBalances : OrderedMap.Map<Nat, OrderedMap.Map<Text, PayrollBalance>> = natMap.empty<OrderedMap.Map<Text, PayrollBalance>>();
  var userProfiles : OrderedMap.Map<Principal, UserProfile> = principalMap.empty<UserProfile>();
  var changeHistories : OrderedMap.Map<Nat, ChangeHistory> = natMap.empty<ChangeHistory>();

  var nextEmployeeId : Nat = 1;
  var nextBankSalaryId : Nat = 1;
  var stripeConfiguration : ?Stripe.StripeConfiguration = null;

  // ============================================================================
  // USER PROFILE FUNCTIONS
  // ============================================================================

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // ============================================================================
  // STRIPE INTEGRATION FUNCTIONS
  // ============================================================================

  public query func isStripeConfigured() : async Bool {
    switch (stripeConfiguration) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can configure Stripe");
    };
    stripeConfiguration := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfiguration) {
      case (null) { Debug.trap("Stripe χρειάζεται να ρυθμιστεί πρώτα") };
      case (?value) { value };
    };
  };

  public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can check session status");
    };
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create checkout sessions");
    };
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  func parseFloat(text : Text) : Float {
    let normalized = Text.replace(text, #char ',', ".");
    if (Text.size(normalized) == 0) {
      return 0.0;
    };
    if (normalized == "0") {
      return 0.0;
    };

    switch (Nat.fromText(normalized)) {
      case (?value) { Float.fromInt(value) };
      case (null) {
        let parts = Text.split(normalized, #char '.');
        let partsArray = Iter.toArray(parts);
        if (partsArray.size() == 2) {
          let integerPart = partsArray[0];
          let decimalPart = partsArray[1];
          switch (Nat.fromText(integerPart)) {
            case (?intValue) {
              let decimalValue = switch (Nat.fromText(decimalPart)) {
                case (?dec) {
                  let divisor = Float.pow(10.0, Float.fromInt(Text.size(decimalPart)));
                  Float.fromInt(dec) / divisor;
                };
                case (null) { 0.0 };
              };
              return Float.fromInt(intValue) + decimalValue;
            };
            case (null) { Debug.trap("Μη έγκυρη τιμή: " # text) };
          };
        } else {
          Debug.trap("Μη έγκυρη τιμή: " # text);
        };
      };
    };
  };

  // ============================================================================
  // EMPLOYEE MANAGEMENT FUNCTIONS
  // ============================================================================

  public shared ({ caller }) func addEmployee(
    fullName : Text,
    hourlyRate : Text,
    overtimeRate : Text,
    fixedMonthlySalary : ?Text,
    totalAnnualLeaveDays : ?Nat,
    email : ?Text,
    phone : ?Text,
    bankIban : ?Text,
    employeeType : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can add employees");
    };

    if (Text.size(fullName) == 0) {
      Debug.trap("Το όνομα είναι υποχρεωτικό");
    };

    if (employeeType != "monthly" and employeeType != "hourly") {
      Debug.trap("Ο τύπος εργαζομένου πρέπει να είναι 'monthly' ή 'hourly'");
    };

    let parsedHourlyRate = switch (employeeType) {
      case ("hourly") {
        let rate = parseFloat(hourlyRate);
        if (rate <= 0.0) {
          Debug.trap("Η ωριαία αμοιβή είναι υποχρεωτική και πρέπει να είναι θετικός αριθμός");
        };
        rate;
      };
      case ("monthly") { parseFloat(hourlyRate) };
      case (_) { Debug.trap("Μη έγκυρος τύπος εργαζομένου") };
    };

    let parsedOvertimeRate = parseFloat(overtimeRate);
    if (parsedOvertimeRate <= 0.0) {
      Debug.trap("Η αμοιβή υπερωρίας είναι υποχρεωτική και πρέπει να είναι θετικός αριθμός");
    };

    let parsedFixedSalary = switch (employeeType) {
      case ("monthly") {
        switch (fixedMonthlySalary) {
          case (null) { Debug.trap("Ο μηνιαίος μισθός είναι υποχρεωτικός") };
          case (?salaryText) {
            if (Text.size(salaryText) == 0) {
              Debug.trap("Ο μηνιαίος μισθός είναι υποχρεωτικός");
            };
            let salary = parseFloat(salaryText);
            if (salary <= 0.0) {
              Debug.trap("Ο μηνιαίος μισθός πρέπει να είναι θετικός αριθμός");
            };
            ?salary;
          };
        };
      };
      case ("hourly") { null };
      case (_) { null };
    };

    let leaveDays = switch (totalAnnualLeaveDays) {
      case (null) { 0 };
      case (?days) { days };
    };

    let employeeId = nextEmployeeId;
    let newEmployee : Employee = {
      id = employeeId;
      fullName;
      hourlyRate = parsedHourlyRate;
      overtimeRate = parsedOvertimeRate;
      email;
      phone;
      bankIban;
      totalAnnualLeaveDays = leaveDays;
      fixedMonthlySalary = parsedFixedSalary;
      employeeType;
    };

    employees := natMap.put(employees, employeeId, newEmployee);

    workDays := natMap.put(workDays, employeeId, textMap.empty<WorkDay>());
    payrollRecords := natMap.put(payrollRecords, employeeId, textMap.empty<PayrollRecord>());
    leaveRecords := natMap.put(leaveRecords, employeeId, {
      employeeId;
      totalAnnualLeaveDays = leaveDays;
      leaveDaysUsed = 0;
      remainingLeaveDays = leaveDays;
    });
    paymentRecords := natMap.put(paymentRecords, employeeId, textMap.empty<[PaymentRecord]>());
    monthlyBankSalaries := natMap.put(monthlyBankSalaries, employeeId, textMap.empty<[MonthlyBankSalary]>());
    payrollBalances := natMap.put(payrollBalances, employeeId, textMap.empty<PayrollBalance>());

    nextEmployeeId += 1;

    await async {};

    employeeId;
  };

  public query ({ caller }) func getEmployee(id : Nat) : async ?Employee {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view employees");
    };
    natMap.get(employees, id);
  };

  public query ({ caller }) func getAllEmployees() : async [Employee] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view employees");
    };
    Iter.toArray(natMap.vals(employees));
  };

  public query ({ caller }) func countEmployees() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can count employees");
    };
    natMap.size(employees);
  };
};

