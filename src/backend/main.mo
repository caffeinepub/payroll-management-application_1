import OrderedMap "mo:base/OrderedMap";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Float "mo:base/Float";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";
import AccessControl "authorization/access-control";

actor {
  // ============================================================================
  // ACCESS CONTROL INITIALIZATION
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
  // MAP INITIALIZATIONS
  // ============================================================================

  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);
  transient let textMap = OrderedMap.Make<Text>(Text.compare);
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);

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
    stripeConfiguration != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfiguration := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfiguration) {
      case (null) { Debug.trap("Stripe χρειάζεται να ρυθμιστεί πρώτα") };
      case (?value) { value };
    };
  };

  public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
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

  public shared func addEmployee(
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
    // No authorization check - open to all callers per implementation plan
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
      case ("monthly") {
        parseFloat(hourlyRate);
      };
      case (_) {
        Debug.trap("Μη έγκυρος τύπος εργαζομένου");
      };
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

    await calculateAndUpdatePayroll();

    employeeId;
  };

  public shared ({ caller }) func updateEmployeeWithChangeLog(employeeId : Nat, updatedEmployee : Employee) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    switch (natMap.get(employees, employeeId)) {
      case (null) {
        Debug.trap("Ο εργαζόμενος δεν βρέθηκε");
      };
      case (?_) {
        let changeEntries : [ChangeHistoryEntry] = switch (natMap.get(changeHistories, employeeId)) {
          case (null) { [] };
          case (?existingHistory) { existingHistory };
        };

        changeHistories := natMap.put(changeHistories, employeeId, changeEntries);

        employees := natMap.put(employees, employeeId, updatedEmployee);

        ignore calculateAndUpdatePayroll();
      };
    };
  };

  public shared ({ caller }) func setChangeHistoryLog(employeeId : Nat, newChangeHistory : ChangeHistory) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    changeHistories := natMap.put(changeHistories, employeeId, newChangeHistory);
  };

  public query ({ caller }) func getChangeHistoryLog(employeeId : Nat) : async ChangeHistory {
    switch (natMap.get(changeHistories, employeeId)) {
      case (null) { [] };
      case (?history) { history };
    };
  };

  public shared ({ caller }) func deleteEmployee(employeeId : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    changeHistories := natMap.delete(changeHistories, employeeId);
    employees := natMap.delete(employees, employeeId);
    workDays := natMap.delete(workDays, employeeId);
    payrollRecords := natMap.delete(payrollRecords, employeeId);
    leaveRecords := natMap.delete(leaveRecords, employeeId);
    paymentRecords := natMap.delete(paymentRecords, employeeId);
    monthlyBankSalaries := natMap.delete(monthlyBankSalaries, employeeId);
    payrollBalances := natMap.delete(payrollBalances, employeeId);
  };

  public query func getAllEmployees() : async [Employee] {
    Iter.toArray(natMap.vals(employees));
  };

  public query func getEmployee(employeeId : Nat) : async ?Employee {
    natMap.get(employees, employeeId);
  };

  // ============================================================================
  // DIRECT LEAVE DAYS UPDATE - ADMIN ONLY
  // ============================================================================

  public shared ({ caller }) func updateLeaveDaysUsed(employeeId : Nat, newLeaveDaysUsed : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    switch (natMap.get(leaveRecords, employeeId)) {
      case (null) { Debug.trap("Η εγγραφή άδειας δεν βρέθηκε") };
      case (?leaveRecord) {
        let totalAnnualLeaveDays = leaveRecord.totalAnnualLeaveDays;

        if (newLeaveDaysUsed > totalAnnualLeaveDays) {
          Debug.trap("Δεν μπορείτε να χρησιμοποιήσετε περισσότερες ημέρες από τις συνολικές ημέρες άδειας ετησίως");
        };

        let remainingLeaveDays = if (totalAnnualLeaveDays >= newLeaveDaysUsed) {
          totalAnnualLeaveDays - newLeaveDaysUsed;
        } else {
          0;
        };

        let updatedLeaveRecord : LeaveRecord = {
          leaveRecord with
          leaveDaysUsed = newLeaveDaysUsed;
          remainingLeaveDays;
        };

        leaveRecords := natMap.put(leaveRecords, employeeId, updatedLeaveRecord);

        await calculateAndUpdatePayroll();
      };
    };
  };

  // ============================================================================
  // WORK HOURS MANAGEMENT FUNCTIONS - ADMIN ONLY
  // ============================================================================

  public shared ({ caller }) func addWorkDay(employeeId : Nat, workDay : WorkDay) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    let adjustedWorkDay = adjustLeaveHoursForHourlyEmployees(employeeId, workDay);
    let employeeWorkDays = switch (natMap.get(workDays, employeeId)) {
      case (null) { textMap.empty<WorkDay>() };
      case (?days) { days };
    };
    let updatedWorkDays = textMap.put(employeeWorkDays, adjustedWorkDay.date, adjustedWorkDay);
    workDays := natMap.put(workDays, employeeId, updatedWorkDays);

    if (adjustedWorkDay.isLeave) {
      await updateLeaveRecordFromWorkDay(employeeId, adjustedWorkDay.date);
    };

    await calculateAndUpdatePayroll();
  };

  func adjustLeaveHoursForHourlyEmployees(employeeId : Nat, workDay : WorkDay) : WorkDay {
    switch (natMap.get(employees, employeeId)) {
      case (null) { workDay };
      case (?employee) {
        if (workDay.isLeave and employee.employeeType == "hourly") {
          {
            workDay with
            normalHours = 8.0;
            overtimeHours = 0.0;
          };
        } else {
          workDay;
        };
      };
    };
  };

  func updateLeaveRecordFromWorkDay(employeeId : Nat, date : Text) : async () {
    let currentLeave = switch (natMap.get(leaveRecords, employeeId)) {
      case (null) {
        Debug.trap("Ο εργαζόμενος δεν βρέθηκε");
      };
      case (?leave) { leave };
    };

    if (currentLeave.remainingLeaveDays == 0) {
      Debug.trap("Ο εργαζόμενος δεν έχει διαθέσιμες ημέρες άδειας");
    };

    let updatedLeave : LeaveRecord = {
      employeeId;
      totalAnnualLeaveDays = currentLeave.totalAnnualLeaveDays;
      leaveDaysUsed = currentLeave.leaveDaysUsed + 1;
      remainingLeaveDays = currentLeave.remainingLeaveDays - 1;
    };
    leaveRecords := natMap.put(leaveRecords, employeeId, updatedLeave);

    await calculateAndUpdatePayroll();
  };

  public shared ({ caller }) func addWorkDaysBulk(entries : [(Nat, WorkDay)]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    for ((employeeId, workDay) in entries.vals()) {
      let adjustedWorkDay = adjustLeaveHoursForHourlyEmployees(employeeId, workDay);
      let employeeWorkDays = switch (natMap.get(workDays, employeeId)) {
        case (null) { textMap.empty<WorkDay>() };
        case (?days) { days };
      };
      let updatedWorkDays = textMap.put(employeeWorkDays, adjustedWorkDay.date, adjustedWorkDay);
      workDays := natMap.put(workDays, employeeId, updatedWorkDays);

      if (adjustedWorkDay.isLeave) {
        await updateLeaveRecordFromWorkDay(employeeId, adjustedWorkDay.date);
      };
    };

    await calculateAndUpdatePayroll();
  };

  public query func getWorkDays(employeeId : Nat) : async [WorkDay] {
    switch (natMap.get(workDays, employeeId)) {
      case (null) { [] };
      case (?days) { Iter.toArray(textMap.vals(days)) };
    };
  };

  public query func getWorkDay(employeeId : Nat, date : Text) : async ?WorkDay {
    switch (natMap.get(workDays, employeeId)) {
      case (null) { null };
      case (?days) { textMap.get(days, date) };
    };
  };

  public shared ({ caller }) func deleteWorkDay(employeeId : Nat, date : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    switch (natMap.get(workDays, employeeId)) {
      case (null) { Debug.trap("Δεν βρέθηκαν ημέρες εργασίας για αυτόν τον εργαζόμενο") };
      case (?days) {
        switch (textMap.get(days, date)) {
          case (null) { Debug.trap("Η ημέρα εργασίας δεν βρέθηκε") };
          case (?workDay) {
            if (workDay.isLeave) {
              await removeLeaveRecordFromWorkDay(employeeId, date);
            };
            workDays := natMap.put(workDays, employeeId, textMap.delete(days, date));
          };
        };
      };
    };
  };

  func removeLeaveRecordFromWorkDay(employeeId : Nat, date : Text) : async () {
    let currentLeave = switch (natMap.get(leaveRecords, employeeId)) {
      case (null) {
        Debug.trap("Ο εργαζόμενος δεν βρέθηκε");
      };
      case (?leave) { leave };
    };

    if (currentLeave.leaveDaysUsed == 0) {
      Debug.trap("Ο εργαζόμενος δεν έχει χρησιμοποιήσει ημέρες άδειας");
    };

    let updatedLeave : LeaveRecord = {
      employeeId;
      totalAnnualLeaveDays = currentLeave.totalAnnualLeaveDays;
      leaveDaysUsed = currentLeave.leaveDaysUsed - 1;
      remainingLeaveDays = currentLeave.remainingLeaveDays + 1;
    };
    leaveRecords := natMap.put(leaveRecords, employeeId, updatedLeave);

    await calculateAndUpdatePayroll();
  };

  public shared ({ caller }) func updateWorkDay(employeeId : Nat, date : Text, updatedWorkDay : WorkDay) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    let adjustedWorkDay = adjustLeaveHoursForHourlyEmployees(employeeId, updatedWorkDay);

    switch (natMap.get(workDays, employeeId)) {
      case (null) { Debug.trap("Οι ημέρες εργασίας για αυτόν τον εργαζόμενο δεν βρέθηκαν") };
      case (?days) {
        switch (textMap.get(days, date)) {
          case (null) { Debug.trap("Η ημέρα εργασίας δεν βρέθηκε") };
          case (?existingWorkDay) {
            let wasLeave = existingWorkDay.isLeave;
            let isNowLeave = adjustedWorkDay.isLeave;

            let updatedWorkDays = textMap.put(days, date, adjustedWorkDay);
            workDays := natMap.put(workDays, employeeId, updatedWorkDays);

            if (wasLeave and not isNowLeave) {
              await removeLeaveRecordFromWorkDay(employeeId, date);
            } else if (not wasLeave and isNowLeave) {
              await updateLeaveRecordFromWorkDay(employeeId, date);
            };

            await calculateAndUpdatePayroll();
          };
        };
      };
    };
  };

  public shared ({ caller }) func updateWorkDaysBulk(entries : [(Nat, WorkDay)]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    for ((employeeId, workDay) in entries.vals()) {
      let adjustedWorkDay = adjustLeaveHoursForHourlyEmployees(employeeId, workDay);

      switch (natMap.get(workDays, employeeId)) {
        case (null) {};
        case (?employeeWorkDays) {
          switch (textMap.get(employeeWorkDays, adjustedWorkDay.date)) {
            case (null) {};
            case (?existingWorkDay) {
              let wasLeave = existingWorkDay.isLeave;
              let isNowLeave = adjustedWorkDay.isLeave;

              let updatedWorkDays = textMap.put(employeeWorkDays, adjustedWorkDay.date, adjustedWorkDay);
              workDays := natMap.put(workDays, employeeId, updatedWorkDays);

              if (wasLeave and not isNowLeave) {
                await removeLeaveRecordFromWorkDay(employeeId, adjustedWorkDay.date);
              } else if (not wasLeave and isNowLeave) {
                await updateLeaveRecordFromWorkDay(employeeId, adjustedWorkDay.date);
              };
            };
          };
        };
      };
    };

    await calculateAndUpdatePayroll();
  };

  // ============================================================================
  // DAILY BULK ENTRY DATA MANAGEMENT - ADMIN ONLY
  // ============================================================================

  public shared ({ caller }) func saveDailyBulkWorkDays(date : Text, entries : [(Nat, WorkDay)]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    for ((employeeId, workDay) in entries.vals()) {
      let adjustedWorkDay = adjustLeaveHoursForHourlyEmployees(employeeId, workDay);
      let employeeWorkDays = switch (natMap.get(workDays, employeeId)) {
        case (null) { textMap.empty<WorkDay>() };
        case (?days) { days };
      };
      let updatedWorkDays = textMap.put(employeeWorkDays, adjustedWorkDay.date, adjustedWorkDay);
      workDays := natMap.put(workDays, employeeId, updatedWorkDays);

      if (adjustedWorkDay.isLeave) {
        await updateLeaveRecordFromWorkDay(employeeId, adjustedWorkDay.date);
      };
    };

    await calculateAndUpdatePayroll();
  };

  public query func getDailyBulkWorkDays(date : Text) : async [(Nat, WorkDay)] {
    let results = Array.mapFilter<(Nat, OrderedMap.Map<Text, WorkDay>), (Nat, WorkDay)>(
      Iter.toArray(natMap.entries(workDays)),
      func((employeeId, employeeWorkDays)) {
        switch (textMap.get(employeeWorkDays, date)) {
          case (null) { null };
          case (?workDay) { ?(employeeId, workDay) };
        };
      },
    );

    results;
  };

  // ============================================================================
  // PAYROLL MANAGEMENT FUNCTIONS - INTERNAL
  // ============================================================================

  public shared func calculateAndUpdatePayroll() : async () {

    for ((employeeId, employee) in natMap.entries(employees)) {
      let employeeWorkDays = switch (natMap.get(workDays, employeeId)) {
        case (null) { textMap.empty<WorkDay>() };
        case (?days) { days };
      };

      var monthlyHours = textMap.empty<Float>();
      var monthlyOvertime = textMap.empty<Float>();
      var monthlyLeaveHours = textMap.empty<Float>();

      for ((_, workDay) in textMap.entries(employeeWorkDays)) {
        let dateParts = Iter.toArray(Text.split(workDay.date, #char '-'));
        if (dateParts.size() == 3) {
          let month = switch (Nat.fromText(dateParts[1])) {
            case (?m) { m };
            case (null) { 0 };
          };
          let year = switch (Nat.fromText(dateParts[0])) {
            case (?y) { y };
            case (null) { 0 };
          };
          let key = Nat.toText(month) # "-" # Nat.toText(year);

          let currentHours = switch (textMap.get(monthlyHours, key)) {
            case (null) { 0.0 };
            case (?h) { h };
          };
          let currentOvertime = switch (textMap.get(monthlyOvertime, key)) {
            case (null) { 0.0 };
            case (?o) { o };
          };
          let currentLeave = switch (textMap.get(monthlyLeaveHours, key)) {
            case (null) { 0.0 };
            case (?l) { l };
          };

          if (workDay.isLeave) {
            let leaveHoursToAdd = switch (natMap.get(employees, employeeId)) {
              case (null) { workDay.normalHours };
              case (?emp) {
                if (emp.employeeType == "hourly") { 8.0 } else {
                  workDay.normalHours;
                };
              };
            };
            monthlyLeaveHours := textMap.put(monthlyLeaveHours, key, currentLeave + leaveHoursToAdd);
          } else {
            monthlyHours := textMap.put(monthlyHours, key, currentHours + workDay.normalHours);
            monthlyOvertime := textMap.put(monthlyOvertime, key, currentOvertime + workDay.overtimeHours);
          };
        };
      };

      var employeePayrollRecords = textMap.empty<PayrollRecord>();
      var employeePayrollBalances = switch (natMap.get(payrollBalances, employeeId)) {
        case (null) { textMap.empty<PayrollBalance>() };
        case (?balances) { balances };
      };

      for ((key, hours) in textMap.entries(monthlyHours)) {
        let parts = Iter.toArray(Text.split(key, #char '-'));
        if (parts.size() == 2) {
          let month = switch (Nat.fromText(parts[0])) {
            case (?m) { m };
            case (null) { 0 };
          };
          let year = switch (Nat.fromText(parts[1])) {
            case (?y) { y };
            case (null) { 0 };
          };

          let overtime = switch (textMap.get(monthlyOvertime, key)) {
            case (null) { 0.0 };
            case (?o) { o };
          };

          let leaveHours = switch (textMap.get(monthlyLeaveHours, key)) {
            case (null) { 0.0 };
            case (?l) { l };
          };

          let totalHours = hours + leaveHours;

          let (totalSalary, fixedSalary) = switch (employee.employeeType) {
            case ("monthly") {
              let salary = switch (employee.fixedMonthlySalary) {
                case (null) { 0.0 };
                case (?s) { s };
              };
              ((salary + (overtime * employee.overtimeRate)), employee.fixedMonthlySalary);
            };
            case ("hourly") {
              (((totalHours * employee.hourlyRate) + (overtime * employee.overtimeRate)), null);
            };
            case (_) { (0.0, null) };
          };

          let payrollRecord : PayrollRecord = {
            employeeId;
            month;
            year;
            totalSalary;
            fixedSalary;
            cashAmount = 0.0;
            totalHours;
            overtimeHours = overtime;
          };

          employeePayrollRecords := textMap.put(employeePayrollRecords, key, payrollRecord);

          let paymentKey = Nat.toText(month) # "-" # Nat.toText(year);
          let payments = switch (natMap.get(paymentRecords, employeeId)) {
            case (null) { textMap.empty<[PaymentRecord]>() };
            case (?p) { p };
          };
          let paymentList = switch (textMap.get(payments, key)) {
            case (null) { [] };
            case (?list) { list };
          };

          var totalCashPayments = 0.0;
          var totalBankPayments : Float = 0.0;
          for (payment in paymentList.vals()) {
            totalCashPayments += payment.cashPayment;
            totalBankPayments += payment.bankPayment;
          };

          let remainingCashBalance = totalSalary - totalCashPayments;

          let monthlyBankSalaryAmount = switch (natMap.get(monthlyBankSalaries, employeeId)) {
            case (null) { 0.0 };
            case (?salaries) {
              switch (textMap.get(salaries, key)) {
                case (null) { 0.0 };
                case (?salaryList) {
                  var totalSalary : Float = 0.0;
                  for (salary in salaryList.vals()) {
                    totalSalary += salary.amount;
                  };
                  totalSalary;
                };
              };
            };
          };

          let currentMonthBankBalance = monthlyBankSalaryAmount - totalBankPayments;

          let previousMonthBalance = if (month > 1) {
            let previousMonthKey = Nat.toText(month - 1) # "-" # Nat.toText(year);
            switch (textMap.get(employeePayrollBalances, previousMonthKey)) {
              case (null) { 0.0 };
              case (?prevBalance) { prevBalance.remainingBankBalance };
            };
          } else { 0.0 };

          let totalBankBalance = currentMonthBankBalance + previousMonthBalance;

          let balance : PayrollBalance = {
            employeeId;
            month;
            year;
            remainingCashBalance;
            remainingBankBalance = totalBankBalance;
            remainingSalaryBalance = totalSalary - (totalCashPayments + totalBankPayments);
            carriedOverBankSalary = previousMonthBalance;
            carriedOverActualSalary = previousMonthBalance;
            carriedOverTotalSalary = previousMonthBalance;
            carriedOverBankFixedSalary = 0.0;
          };

          employeePayrollBalances := textMap.put(employeePayrollBalances, key, balance);
        };
      };

      payrollRecords := natMap.put(payrollRecords, employeeId, employeePayrollRecords);
      payrollBalances := natMap.put(payrollBalances, employeeId, employeePayrollBalances);

      switch (natMap.get(leaveRecords, employeeId)) {
        case (null) {};
        case (?leaveRecord) {
          let updatedLeaveRecord : LeaveRecord = {
            employeeId;
            totalAnnualLeaveDays = employee.totalAnnualLeaveDays;
            leaveDaysUsed = leaveRecord.leaveDaysUsed;
            remainingLeaveDays = employee.totalAnnualLeaveDays - leaveRecord.leaveDaysUsed;
          };
          leaveRecords := natMap.put(leaveRecords, employeeId, updatedLeaveRecord);
        };
      };
    };
  };

  // ============================================================================
  // PAYROLL DATA FUNCTIONS - USER ACCESS
  // ============================================================================

  public query func getAllEmployeesPayrollData(month : Nat, year : Nat) : async [PayrollData] {
    let key = Nat.toText(month) # "-" # Nat.toText(year);
    let previousKey = if (month > 1) Nat.toText(month - 1) # "-" # Nat.toText(year) else key;
    var result : [PayrollData] = [];

    for ((employeeId, employee) in natMap.entries(employees)) {
      var normalHours : Float = 0.0;
      var overtimeHours : Float = 0.0;
      var leaveDaysCount : Float = 0.0;

      switch (natMap.get(workDays, employeeId)) {
        case (null) {};
        case (?days) {
          for ((_, workDay) in textMap.entries(days)) {
            let dateParts = Iter.toArray(Text.split(workDay.date, #char '-'));
            if (dateParts.size() == 3) {
              let workMonth = switch (Nat.fromText(dateParts[1])) {
                case (?m) { m };
                case (null) { 0 };
              };
              let workYear = switch (Nat.fromText(dateParts[0])) {
                case (?y) { y };
                case (null) { 0 };
              };
              if (workMonth == month and workYear == year) {
                if (workDay.isLeave) {
                  leaveDaysCount += 1.0;
                } else {
                  normalHours += workDay.normalHours;
                  overtimeHours += workDay.overtimeHours;
                };
              };
            };
          };
        };
      };

      let totalHours = normalHours + leaveDaysCount;

      let (totalMonthlySalary, fixedSalary) = switch (employee.employeeType) {
        case ("monthly") {
          let salary = switch (employee.fixedMonthlySalary) {
            case (null) { 0.0 };
            case (?s) { s };
          };
          ((salary + (overtimeHours * employee.overtimeRate)), employee.fixedMonthlySalary);
        };
        case ("hourly") {
          (((totalHours * employee.hourlyRate) + (overtimeHours * employee.overtimeRate)), null);
        };
        case (_) { (0.0, null) };
      };

      var monthlyBankFixedSalary : ?Float = null;
      switch (natMap.get(monthlyBankSalaries, employeeId)) {
        case (null) { monthlyBankFixedSalary := fixedSalary };
        case (?salaries) {
          switch (textMap.get(salaries, key)) {
            case (null) { monthlyBankFixedSalary := fixedSalary };
            case (?salaryList) {
              var totalSalary : Float = 0.0;
              for (salary in salaryList.vals()) {
                totalSalary += salary.amount;
              };
              monthlyBankFixedSalary := ?totalSalary;
            };
          };
        };
      };

      var totalCashPayments : Float = 0.0;
      var totalBankPayments : Float = 0.0;

      switch (natMap.get(paymentRecords, employeeId)) {
        case (null) {};
        case (?payments) {
          switch (textMap.get(payments, key)) {
            case (null) {};
            case (?paymentList) {
              for (payment in paymentList.vals()) {
                totalCashPayments += payment.cashPayment;
                totalBankPayments += payment.bankPayment;
              };
            };
          };
        };
      };

      var previousMonthSalaryCarryover : Float = 0.0;
      var previousMonthBankCarryover : Float = 0.0;

      var remainingBankBalance : Float = 0.0;
      var remainingRealSalary : Float = 0.0;

      var previousMonthBankSalary : Float = 0.0;
      var carryoverBankSalary : Float = 0.0;
      var currentMonthBankBalance : Float = 0.0;
      var currentMonthBankWithCarryover : Float = 0.0;
      var currentMonthSalaryBalance : Float = 0.0;

      var bankSalaryCarryover : Float = 0.0;
      var carriedOverBankSalary : Float = 0.0;
      var carryoverRealSalary : Float = 0.0;

      var previousMonthBankBalanceCarryover : Float = 0.0;
      var currentMonthBankSalaryWithCarryover : Float = 0.0;
      var bankTransferToNextMonth : Float = 0.0;
      var bankTransferFromPreviousMonth : Float = 0.0;

      if (month > 1) {
        let previousMonthKey = Nat.toText(month - 1) # "-" # Nat.toText(year);
        switch (natMap.get(payrollBalances, employeeId)) {
          case (null) {};
          case (?balances) {
            switch (textMap.get(balances, previousMonthKey)) {
              case (null) {};
              case (?previousBalance) {
                previousMonthBankCarryover := previousBalance.remainingBankBalance;
                previousMonthBankSalary := previousBalance.remainingBankBalance;
                previousMonthSalaryCarryover := previousBalance.remainingSalaryBalance;
                carriedOverBankSalary := previousBalance.carriedOverBankSalary;
                bankSalaryCarryover := previousBalance.carriedOverBankSalary;
                carryoverBankSalary := previousBalance.remainingBankBalance;
                carryoverRealSalary := previousBalance.remainingBankBalance;

                previousMonthBankBalanceCarryover := previousBalance.remainingBankBalance;

                let currentMonthBankFixedSalary : Float = switch (monthlyBankFixedSalary) {
                  case (null) { 0.0 };
                  case (?val) { val };
                };

                let computedCurrentMonthBankSalaryWithCarryover = if (month > 1) {
                  currentMonthBankFixedSalary + carryoverBankSalary;
                } else {
                  currentMonthBankFixedSalary;
                };

                currentMonthBankBalance := computedCurrentMonthBankSalaryWithCarryover - totalBankPayments;
                currentMonthBankWithCarryover := computedCurrentMonthBankSalaryWithCarryover;
                remainingRealSalary := totalMonthlySalary + previousMonthSalaryCarryover - totalCashPayments - totalBankPayments;
                remainingBankBalance := computedCurrentMonthBankSalaryWithCarryover - totalBankPayments;

                currentMonthBankSalaryWithCarryover := computedCurrentMonthBankSalaryWithCarryover;

                remainingBankBalance := computedCurrentMonthBankSalaryWithCarryover - totalBankPayments;
                bankTransferToNextMonth := remainingBankBalance;
                bankTransferFromPreviousMonth := carryoverBankSalary;
              };
            };
          };
        };
      };

      remainingBankBalance := switch (monthlyBankFixedSalary) {
        case (null) { remainingBankBalance };
        case (?bankSalary) { bankSalary - totalBankPayments };
      };

      let payrollData : PayrollData = {
        employeeId;
        employeeName = employee.fullName;
        month;
        year;
        totalMonthlySalary;
        monthlyBankFixedSalary;
        totalCashPayments;
        totalBankPayments;
        remainingRealSalary;
        remainingBankBalance;
        previousMonthSalaryCarryover;
        previousMonthBankCarryover;
        normalHours;
        overtimeHours;
        leaveDays = leaveDaysCount;
        employeeType = employee.employeeType;
      };

      result := Array.append(result, [payrollData]);
    };

    result;
  };

  public query func getEmployeePayrollData(employeeId : Nat, month : Nat, year : Nat) : async ?PayrollData {
    let key = Nat.toText(month) # "-" # Nat.toText(year);
    let previousKey = if (month > 1) Nat.toText(month - 1) # "-" # Nat.toText(year) else key;

    switch (natMap.get(employees, employeeId)) {
      case (null) { null };
      case (?employee) {
        var normalHours : Float = 0.0;
        var overtimeHours : Float = 0.0;
        var leaveDaysCount : Float = 0.0;

        switch (natMap.get(workDays, employeeId)) {
          case (null) {};
          case (?days) {
            for ((_, workDay) in textMap.entries(days)) {
              let dateParts = Iter.toArray(Text.split(workDay.date, #char '-'));
              if (dateParts.size() == 3) {
                let workMonth = switch (Nat.fromText(dateParts[1])) {
                  case (?m) { m };
                  case (null) { 0 };
                };
                let workYear = switch (Nat.fromText(dateParts[0])) {
                  case (?y) { y };
                  case (null) { 0 };
                };
                if (workMonth == month and workYear == year) {
                  if (workDay.isLeave) {
                    leaveDaysCount += 1.0;
                  } else {
                    normalHours += workDay.normalHours;
                    overtimeHours += workDay.overtimeHours;
                  };
                };
              };
            };
          };
        };

        let totalHours = normalHours + leaveDaysCount;

        let (totalMonthlySalary, fixedSalary) = switch (employee.employeeType) {
          case ("monthly") {
            let salary = switch (employee.fixedMonthlySalary) {
              case (null) { 0.0 };
              case (?s) { s };
            };
            ((salary + (overtimeHours * employee.overtimeRate)), employee.fixedMonthlySalary);
          };
          case ("hourly") {
            (((totalHours * employee.hourlyRate) + (overtimeHours * employee.overtimeRate)), null);
          };
          case (_) { (0.0, null) };
        };

        var monthlyBankFixedSalary : ?Float = null;
        switch (natMap.get(monthlyBankSalaries, employeeId)) {
          case (null) { monthlyBankFixedSalary := fixedSalary };
          case (?salaries) {
            switch (textMap.get(salaries, key)) {
              case (null) { monthlyBankFixedSalary := fixedSalary };
              case (?salaryList) {
                var totalSalary : Float = 0.0;
                for (salary in salaryList.vals()) {
                  totalSalary += salary.amount;
                };
                monthlyBankFixedSalary := ?totalSalary;
              };
            };
          };
        };

        var totalCashPayments : Float = 0.0;
        var totalBankPayments : Float = 0.0;

        switch (natMap.get(paymentRecords, employeeId)) {
          case (null) {};
          case (?payments) {
            switch (textMap.get(payments, key)) {
              case (null) {};
              case (?paymentList) {
                for (payment in paymentList.vals()) {
                  totalCashPayments += payment.cashPayment;
                  totalBankPayments += payment.bankPayment;
                };
              };
            };
          };
        };

        var previousMonthSalaryCarryover : Float = 0.0;
        var previousMonthBankCarryover : Float = 0.0;

        var remainingBankBalance : Float = 0.0;
        var remainingRealSalary : Float = 0.0;

        var previousMonthBankSalary : Float = 0.0;
        var carryoverBankSalary : Float = 0.0;
        var currentMonthBankBalance : Float = 0.0;
        var currentMonthBankWithCarryover : Float = 0.0;
        var currentMonthSalaryBalance : Float = 0.0;

        var bankSalaryCarryover : Float = 0.0;
        var carriedOverBankSalary : Float = 0.0;
        var carryoverRealSalary : Float = 0.0;

        var previousMonthBankBalanceCarryover : Float = 0.0;
        var currentMonthBankSalaryWithCarryover : Float = 0.0;
        var bankTransferToNextMonth : Float = 0.0;
        var bankTransferFromPreviousMonth : Float = 0.0;

        if (month > 1) {
          let previousMonthKey = Nat.toText(month - 1) # "-" # Nat.toText(year);
          switch (natMap.get(payrollBalances, employeeId)) {
            case (null) {};
            case (?balances) {
              switch (textMap.get(balances, previousMonthKey)) {
                case (null) {};
                case (?previousBalance) {
                  previousMonthBankCarryover := previousBalance.remainingBankBalance;
                  previousMonthBankSalary := previousBalance.remainingBankBalance;
                  previousMonthSalaryCarryover := previousBalance.remainingSalaryBalance;
                  carriedOverBankSalary := previousBalance.carriedOverBankSalary;
                  bankSalaryCarryover := previousBalance.carriedOverBankSalary;
                  carryoverBankSalary := previousBalance.remainingBankBalance;
                  carryoverRealSalary := previousBalance.remainingBankBalance;

                  previousMonthBankBalanceCarryover := previousBalance.remainingBankBalance;

                  let currentMonthBankFixedSalary : Float = switch (monthlyBankFixedSalary) {
                    case (null) { 0.0 };
                    case (?val) { val };
                  };

                  let computedCurrentMonthBankSalaryWithCarryover = if (month > 1) {
                    currentMonthBankFixedSalary + carryoverBankSalary;
                  } else {
                    currentMonthBankFixedSalary;
                  };

                  currentMonthBankBalance := computedCurrentMonthBankSalaryWithCarryover - totalBankPayments;
                  currentMonthBankWithCarryover := computedCurrentMonthBankSalaryWithCarryover;
                  remainingRealSalary := totalMonthlySalary + previousMonthSalaryCarryover - totalCashPayments - totalBankPayments;
                  remainingBankBalance := computedCurrentMonthBankSalaryWithCarryover - totalBankPayments;

                  currentMonthBankSalaryWithCarryover := computedCurrentMonthBankSalaryWithCarryover;

                  remainingBankBalance := computedCurrentMonthBankSalaryWithCarryover - totalBankPayments;
                  bankTransferToNextMonth := remainingBankBalance;
                  bankTransferFromPreviousMonth := carryoverBankSalary;
                };
              };
            };
          };
        };

        remainingBankBalance := switch (monthlyBankFixedSalary) {
          case (null) { remainingBankBalance };
          case (?bankSalary) { bankSalary - totalBankPayments };
        };

        let payrollData : PayrollData = {
          employeeId;
          employeeName = employee.fullName;
          month;
          year;
          totalMonthlySalary;
          monthlyBankFixedSalary;
          totalCashPayments;
          totalBankPayments;
          remainingRealSalary;
          remainingBankBalance;
          previousMonthSalaryCarryover;
          previousMonthBankCarryover;
          normalHours;
          overtimeHours;
          leaveDays = leaveDaysCount;
          employeeType = employee.employeeType;
        };

        ?payrollData;
      };
    };
  };

  // ============================================================================
  // PAYMENT MANAGEMENT FUNCTIONS - ADMIN ONLY
  // ============================================================================

  func findPaymentById(employeeId : Nat, paymentId : Nat) : ?(PaymentRecord, Text) {
    switch (natMap.get(paymentRecords, employeeId)) {
      case (null) { null };
      case (?employeePayments) {
        for ((key, paymentList) in textMap.entries(employeePayments)) {
          for (payment in paymentList.vals()) {
            if (paymentId == payment.employeeId) {
              return ?(payment, key);
            };
          };
        };
        null;
      };
    };
  };

  public shared ({ caller }) func addPayment(payment : PaymentRecord) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    let key = Nat.toText(payment.month) # "-" # Nat.toText(payment.year);
    let employeePayments = switch (natMap.get(paymentRecords, payment.employeeId)) {
      case (null) { textMap.empty<[PaymentRecord]>() };
      case (?payments) { payments };
    };

    let existingPayments = switch (textMap.get(employeePayments, key)) {
      case (null) { [] };
      case (?payments) { payments };
    };

    let updatedPayments = Array.append(existingPayments, [payment]);
    let updatedEmployeePayments = textMap.put(employeePayments, key, updatedPayments);
    paymentRecords := natMap.put(paymentRecords, payment.employeeId, updatedEmployeePayments);

    await calculateAndUpdatePayroll();
  };

  public shared ({ caller }) func addPaymentsBulk(payments : [PaymentRecord]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    for (payment in payments.vals()) {
      let key = Nat.toText(payment.month) # "-" # Nat.toText(payment.year);
      let employeePayments = switch (natMap.get(paymentRecords, payment.employeeId)) {
        case (null) { textMap.empty<[PaymentRecord]>() };
        case (?payments) { payments };
      };

      let existingPayments = switch (textMap.get(employeePayments, key)) {
        case (null) { [] };
        case (?payments) { payments };
      };

      let updatedPayments = Array.append(existingPayments, [payment]);
      let updatedEmployeePayments = textMap.put(employeePayments, key, updatedPayments);
      paymentRecords := natMap.put(paymentRecords, payment.employeeId, updatedEmployeePayments);
    };

    await calculateAndUpdatePayroll();
  };

  public query func getPayments(employeeId : Nat, month : Nat, year : Nat) : async [PaymentRecord] {

    let key = Nat.toText(month) # "-" # Nat.toText(year);
    switch (natMap.get(paymentRecords, employeeId)) {
      case (null) { [] };
      case (?payments) {
        switch (textMap.get(payments, key)) {
          case (null) { [] };
          case (?paymentList) { paymentList };
        };
      };
    };
  };

  public type EmployeePayments = {
    employeeId : Nat;
    employeeName : Text;
    payments : [PaymentRecord];
    totalCashPayments : Float;
    totalBankPayments : Float;
  };

  public query func getAllEmployeesPayments(month : Nat, year : Nat) : async [EmployeePayments] {

    let key = Nat.toText(month) # "-" # Nat.toText(year);
    var result : [EmployeePayments] = [];

    for ((employeeId, employee) in natMap.entries(employees)) {
      var payments : [PaymentRecord] = [];
      var totalCash : Float = 0.0;
      var totalBank : Float = 0.0;

      switch (natMap.get(paymentRecords, employeeId)) {
        case (null) {};
        case (?employeePayments) {
          switch (textMap.get(employeePayments, key)) {
            case (null) {};
            case (?paymentList) {
              payments := paymentList;
              for (payment in paymentList.vals()) {
                totalCash += payment.cashPayment;
                totalBank += payment.bankPayment;
              };
            };
          };
        };
      };

      let employeePaymentsData : EmployeePayments = {
        employeeId;
        employeeName = employee.fullName;
        payments;
        totalCashPayments = totalCash;
        totalBankPayments = totalBank;
      };

      result := Array.append(result, [employeePaymentsData]);
    };

    result;
  };

  public shared ({ caller }) func updatePayment(employeeId : Nat, month : Nat, year : Nat, paymentDate : Text, updatedPayment : PaymentRecord) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    let key = Nat.toText(month) # "-" # Nat.toText(year);

    switch (natMap.get(paymentRecords, employeeId)) {
      case (null) { Debug.trap("Δεν βρέθηκαν πληρωμές για αυτόν τον εργαζόμενο") };
      case (?employeePayments) {
        switch (textMap.get(employeePayments, key)) {
          case (null) { Debug.trap("Δεν βρέθηκαν πληρωμές για αυτόν τον μήνα") };
          case (?paymentList) {
            let updatedList = Array.map<PaymentRecord, PaymentRecord>(
              paymentList,
              func(p : PaymentRecord) : PaymentRecord {
                if (p.paymentDate == paymentDate) { updatedPayment } else { p };
              },
            );
            let updatedPayments = textMap.put(employeePayments, key, updatedList);
            paymentRecords := natMap.put(paymentRecords, employeeId, updatedPayments);
          };
        };
      };
    };

    await calculateAndUpdatePayroll();
  };

  public shared ({ caller }) func updatePaymentsBulk(payments : [PaymentRecord]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    for (payment in payments.vals()) {
      let key = Nat.toText(payment.month) # "-" # Nat.toText(payment.year);

      switch (natMap.get(paymentRecords, payment.employeeId)) {
        case (null) {};
        case (?employeePayments) {
          switch (textMap.get(employeePayments, key)) {
            case (null) {};
            case (?paymentList) {
              let updatedList = Array.map<PaymentRecord, PaymentRecord>(
                paymentList,
                func(p : PaymentRecord) : PaymentRecord {
                  if (p.paymentDate == payment.paymentDate) { payment } else { p };
                },
              );
              let updatedPayments = textMap.put(employeePayments, key, updatedList);
              paymentRecords := natMap.put(paymentRecords, payment.employeeId, updatedPayments);
            };
          };
        };
      };
    };

    await calculateAndUpdatePayroll();
  };

  public shared ({ caller }) func deletePayment(employeeId : Nat, month : Nat, year : Nat, paymentDate : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    let key = Nat.toText(month) # "-" # Nat.toText(year);
    switch (natMap.get(paymentRecords, employeeId)) {
      case (null) { Debug.trap("Δεν βρέθηκαν πληρωμές για αυτόν τον εργαζόμενο") };
      case (?payments) {
        switch (textMap.get(payments, key)) {
          case (null) { Debug.trap("Δεν βρέθηκαν πληρωμές για αυτόν τον μήνα") };
          case (?paymentList) {
            let updatedList = Array.filter<PaymentRecord>(
              paymentList,
              func(p : PaymentRecord) : Bool { p.paymentDate != paymentDate },
            );
            let updatedPayments = textMap.put(payments, key, updatedList);
            paymentRecords := natMap.put(paymentRecords, employeeId, updatedPayments);
          };
        };
      };
    };

    await calculateAndUpdatePayroll();
  };

  // ============================================================================
  // MONTHLY BANK SALARY MANAGEMENT FUNCTIONS - ADMIN ONLY
  // ============================================================================

  public shared ({ caller }) func setMonthlyBankSalary(employeeId : Nat, month : Nat, year : Nat, amount : Float) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    let key = Nat.toText(month) # "-" # Nat.toText(year);

    let salary : MonthlyBankSalary = {
      id = nextBankSalaryId;
      employeeId;
      month;
      year;
      amount;
    };

    let currentSalaries = switch (natMap.get(monthlyBankSalaries, employeeId)) {
      case (null) { textMap.empty<[MonthlyBankSalary]>() };
      case (?salaries) { salaries };
    };

    let currentSalaryList = switch (textMap.get(currentSalaries, key)) {
      case (null) { [] };
      case (?list) { list };
    };

    let updatedSalaryList = Array.append(currentSalaryList, [salary]);
    let updatedSalaries = textMap.put(currentSalaries, key, updatedSalaryList);
    monthlyBankSalaries := natMap.put(monthlyBankSalaries, employeeId, updatedSalaries);

    nextBankSalaryId += 1;

    await calculateAndUpdatePayroll();
  };

  public shared ({ caller }) func setMonthlyBankSalariesBulk(salaries : [(Nat, Nat, Nat, Float)]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    for ((employeeId, month, year, amount) in salaries.vals()) {
      let key = Nat.toText(month) # "-" # Nat.toText(year);

      let salary : MonthlyBankSalary = {
        id = nextBankSalaryId;
        employeeId;
        month;
        year;
        amount;
      };

      let employeeSalaries = switch (natMap.get(monthlyBankSalaries, employeeId)) {
        case (null) { textMap.empty<[MonthlyBankSalary]>() };
        case (?existingSalaries) { existingSalaries };
      };

      let salaryList = switch (textMap.get(employeeSalaries, key)) {
        case (null) { [] };
        case (?existingList) { existingList };
      };

      let updatedSalaryList = Array.append(salaryList, [salary]);
      let updatedSalaries = textMap.put(employeeSalaries, key, updatedSalaryList);
      monthlyBankSalaries := natMap.put(monthlyBankSalaries, employeeId, updatedSalaries);

      nextBankSalaryId += 1;
    };

    await calculateAndUpdatePayroll();
  };

  public query func getMonthlyBankSalary(employeeId : Nat, month : Nat, year : Nat) : async ?Float {

    let key = Nat.toText(month) # "-" # Nat.toText(year);
    switch (natMap.get(monthlyBankSalaries, employeeId)) {
      case (null) { null };
      case (?salaries) {
        switch (textMap.get(salaries, key)) {
          case (null) { null };
          case (?salaryList) {
            var totalAmount : Float = 0.0;
            for (salary in salaryList.vals()) {
              totalAmount += salary.amount;
            };
            ?totalAmount;
          };
        };
      };
    };
  };

  public query func getAllMonthlyBankSalaries() : async [MonthlyBankSalary] {

    var result : [MonthlyBankSalary] = [];
    for ((_, salaries) in natMap.entries(monthlyBankSalaries)) {
      for ((_, salaryList) in textMap.entries(salaries)) {
        for (salary in salaryList.vals()) {
          result := Array.append(result, [salary]);
        };
      };
    };
    result;
  };

  public shared ({ caller }) func updateMonthlyBankSalary(id : Nat, employeeId : Nat, month : Nat, year : Nat, amount : Float) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    let key = Nat.toText(month) # "-" # Nat.toText(year);

    switch (natMap.get(monthlyBankSalaries, employeeId)) {
      case (null) { Debug.trap("Δεν βρέθηκαν μισθοί για αυτόν τον εργαζόμενο") };
      case (?salaries) {
        var found = false;
        var updatedSalaries = salaries;

        found := false;

        for ((salaryKey, salaryList) in textMap.entries(salaries)) {
          for (salary in salaryList.vals()) {
            if (salary.id == id) {
              found := true;
            };
          };
        };

        if (not found) {
          Debug.trap("Ο μισθός τράπεζας δεν βρέθηκε για το συγκεκριμένο μήνα");
        };

        updatedSalaries := textMap.map<[MonthlyBankSalary], [MonthlyBankSalary]>(
          salaries,
          func(salaryKey : Text, salaryList : [MonthlyBankSalary]) : [MonthlyBankSalary] {
            if (salaryKey == key) {
              Array.map<MonthlyBankSalary, MonthlyBankSalary>(
                salaryList,
                func(existingSalary : MonthlyBankSalary) : MonthlyBankSalary {
                  if (existingSalary.id == id) {
                    {
                      id;
                      employeeId;
                      month;
                      year;
                      amount;
                    };
                  } else { existingSalary };
                },
              );
            } else { salaryList };
          },
        );

        monthlyBankSalaries := natMap.put(monthlyBankSalaries, employeeId, updatedSalaries);
      };
    };

    await calculateAndUpdatePayroll();
  };

  public shared ({ caller }) func deleteMonthlyBankSalary(id : Nat, employeeId : Nat, month : Nat, year : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    let key = Nat.toText(month) # "-" # Nat.toText(year);
    switch (natMap.get(monthlyBankSalaries, employeeId)) {
      case (null) { Debug.trap("Δεν βρέθηκαν μισθοί τράπεζας για αυτόν τον εργαζόμενο") };
      case (?salaries) {
        var found = false;
        for ((_, salaryList) in textMap.entries(salaries)) {
          for (salary in salaryList.vals()) {
            if (salary.id == id) {
              found := true;
            };
          };
        };
        if (not found) {
          Debug.trap("Ο μισθός τράπεζας δεν βρέθηκε για το συγκεκριμένο μήνα");
        };

        let updatedSalaries = textMap.map<[MonthlyBankSalary], [MonthlyBankSalary]>(
          salaries,
          func(_ : Text, salaryList : [MonthlyBankSalary]) : [MonthlyBankSalary] {
            Array.filter<MonthlyBankSalary>(
              salaryList,
              func(existingSalary : MonthlyBankSalary) : Bool {
                existingSalary.id != id
              },
            );
          },
        );
        monthlyBankSalaries := natMap.put(monthlyBankSalaries, employeeId, updatedSalaries);
      };
    };

    await calculateAndUpdatePayroll();
  };

  // ============================================================================
  // LEAVE MANAGEMENT FUNCTIONS - ADMIN ONLY
  // ============================================================================

  public shared ({ caller }) func toggleLeaveDay(employeeId : Nat, date : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    switch (natMap.get(workDays, employeeId)) {
      case (null) { Debug.trap("Ο εργαζόμενος δεν βρέθηκε") };
      case (?days) {
        switch (textMap.get(days, date)) {
          case (null) {
            let currentLeave = switch (natMap.get(leaveRecords, employeeId)) {
              case (null) {
                Debug.trap("Ο εργαζόμενος δεν βρέθηκε");
              };
              case (?leave) { leave };
            };

            if (currentLeave.remainingLeaveDays == 0) {
              Debug.trap("Ο εργαζόμενος δεν έχει διαθέσιμες ημέρες άδειας");
            };

            let leaveWorkDay : WorkDay = {
              date;
              normalHours = 8.0;
              overtimeHours = 0.0;
              isLeave = true;
              leaveType = ?"Κανονική Άδεια";
            };

            let employeeWorkDays = switch (natMap.get(workDays, employeeId)) {
              case (null) { textMap.empty<WorkDay>() };
              case (?days) { days };
            };
            let updatedWorkDays = textMap.put(employeeWorkDays, date, leaveWorkDay);
            workDays := natMap.put(workDays, employeeId, updatedWorkDays);

            let updatedLeave : LeaveRecord = {
              employeeId;
              totalAnnualLeaveDays = currentLeave.totalAnnualLeaveDays;
              leaveDaysUsed = currentLeave.leaveDaysUsed + 1;
              remainingLeaveDays = currentLeave.remainingLeaveDays - 1;
            };
            leaveRecords := natMap.put(leaveRecords, employeeId, updatedLeave);
          };
          case (?_) {
            await deleteWorkDay(employeeId, date);
          };
        };
      };
    };

    await calculateAndUpdatePayroll();
  };

  public query func getLeaveRecord(employeeId : Nat) : async ?LeaveRecord {

    switch (natMap.get(leaveRecords, employeeId), natMap.get(employees, employeeId)) {
      case (leaveRecord, ?employee) {
        switch (leaveRecord) {
          case (?record) {
            let updatedRecord : LeaveRecord = {
              employeeId;
              totalAnnualLeaveDays = employee.totalAnnualLeaveDays;
              leaveDaysUsed = record.leaveDaysUsed;
              remainingLeaveDays = record.remainingLeaveDays;
            };
            ?updatedRecord;
          };
          case (null) {
            ?{
              employeeId;
              totalAnnualLeaveDays = employee.totalAnnualLeaveDays;
              leaveDaysUsed = 0;
              remainingLeaveDays = employee.totalAnnualLeaveDays;
            };
          };
        };
      };
      case (_, null) { null };
    };
  };

  public query func getAllLeaveRecords() : async [LeaveRecord] {

    var result : [LeaveRecord] = [];
    for ((employeeId, leave) in natMap.entries(leaveRecords)) {
      let hasWorkDays = switch (natMap.get(workDays, employeeId)) {
        case (null) { false };
        case (?_) { true };
      };
      if (hasWorkDays) {
        switch (natMap.get(employees, employeeId)) {
          case (null) {};
          case (?employee) {
            let updatedLeave : LeaveRecord = {
              employeeId;
              totalAnnualLeaveDays = employee.totalAnnualLeaveDays;
              leaveDaysUsed = leave.leaveDaysUsed;
              remainingLeaveDays = leave.remainingLeaveDays;
            };
            result := Array.append(result, [updatedLeave]);
          };
        };
      };
    };
    result;
  };

  public shared ({ caller }) func deleteLeaveRecord(employeeId : Nat, date : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    switch (natMap.get(workDays, employeeId)) {
      case (null) { Debug.trap("Ο εργαζόμενος δεν βρέθηκε") };
      case (?days) {
        switch (textMap.get(days, date)) {
          case (null) { Debug.trap("Η ημέρα άδειας δεν βρέθηκε") };
          case (?leaveWorkDay) {
            if (not leaveWorkDay.isLeave) {
              Debug.trap("Η επιλεγμένη ημέρα δεν είναι ημέρα άδειας");
            };
            await deleteWorkDay(employeeId, date);
          };
        };
      };
    };

    await calculateAndUpdatePayroll();
  };

  public shared ({ caller }) func addBulkLeaveDay(date : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    for ((employeeId, _) in natMap.entries(employees)) {
      let hasWorkDay = switch (natMap.get(workDays, employeeId)) {
        case (null) { false };
        case (?_) { true };
      };

      if (hasWorkDay) {
        let currentLeave = switch (natMap.get(leaveRecords, employeeId)) {
          case (null) { null };
          case (?leave) {
            if (leave.remainingLeaveDays > 0) { ?leave } else { null };
          };
        };

        switch (currentLeave) {
          case (null) {};
          case (?_) {
            let leaveWorkDay : WorkDay = {
              date;
              normalHours = 8.0;
              overtimeHours = 0.0;
              isLeave = true;
              leaveType = ?"Κανονική Άδεια";
            };

            let employeeWorkDays = switch (natMap.get(workDays, employeeId)) {
              case (null) { textMap.empty<WorkDay>() };
              case (?days) { days };
            };
            let updatedWorkDays = textMap.put(employeeWorkDays, date, leaveWorkDay);
            workDays := natMap.put(workDays, employeeId, updatedWorkDays);

            switch (natMap.get(leaveRecords, employeeId)) {
              case (null) {};
              case (?lea) {
                let updatedLeave : LeaveRecord = {
                  employeeId;
                  totalAnnualLeaveDays = lea.totalAnnualLeaveDays;
                  leaveDaysUsed = lea.leaveDaysUsed + 1;
                  remainingLeaveDays = lea.remainingLeaveDays - 1;
                };
                leaveRecords := natMap.put(leaveRecords, employeeId, updatedLeave);
              };
            };

          };
        };
      };
    };

    await calculateAndUpdatePayroll();
  };

  public type EmployeeLeaveRecord = {
    employeeId : Nat;
    employeeName : Text;
    totalAnnualLeaveDays : Nat;
    leaveDaysUsed : Nat;
    remainingLeaveDays : Nat;
  };

  public query func getAllEmployeeLeaveRecords() : async [EmployeeLeaveRecord] {

    var result : [EmployeeLeaveRecord] = [];
    for ((employeeId, employee) in natMap.entries(employees)) {
      switch (natMap.get(leaveRecords, employeeId)) {
        case (null) {
          let employeeLeave : EmployeeLeaveRecord = {
            employeeId;
            employeeName = employee.fullName;
            totalAnnualLeaveDays = employee.totalAnnualLeaveDays;
            leaveDaysUsed = 0;
            remainingLeaveDays = employee.totalAnnualLeaveDays;
          };
          result := Array.append(result, [employeeLeave]);
        };
        case (?leave) {
          let employeeLeave : EmployeeLeaveRecord = {
            employeeId;
            employeeName = employee.fullName;
            totalAnnualLeaveDays = employee.totalAnnualLeaveDays;
            leaveDaysUsed = leave.leaveDaysUsed;
            remainingLeaveDays = leave.remainingLeaveDays;
          };
          result := Array.append(result, [employeeLeave]);
        };
      };
    };
    result;
  };

  public shared ({ caller }) func resetLeaveRecord(employeeId : Nat, newAnnualLeaveDays : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    let updatedLeaveRecord : LeaveRecord = {
      employeeId;
      totalAnnualLeaveDays = newAnnualLeaveDays;
      leaveDaysUsed = 0;
      remainingLeaveDays = newAnnualLeaveDays;
    };

    leaveRecords := natMap.put(leaveRecords, employeeId, updatedLeaveRecord);

    await calculateAndUpdatePayroll();
  };

  // ============================================================================
  // YEARLY RESET FUNCTIONS - ADMIN ONLY
  // ============================================================================

  public shared ({ caller }) func resetAllLeaveRecords(newAnnualLeaveDays : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    for ((employeeId, _) in natMap.entries(employees)) {
      let updatedLeaveRecord : LeaveRecord = {
        employeeId;
        totalAnnualLeaveDays = newAnnualLeaveDays;
        leaveDaysUsed = 0;
        remainingLeaveDays = newAnnualLeaveDays;
      };

      leaveRecords := natMap.put(leaveRecords, employeeId, updatedLeaveRecord);
    };

    await calculateAndUpdatePayroll();
  };
};
