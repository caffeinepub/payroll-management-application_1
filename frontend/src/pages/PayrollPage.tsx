import { useState } from 'react';
import { useGetAllEmployees, useGetAllEmployeesPayrollData } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, ChevronLeft, ChevronRight, Users, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import type { PayrollData } from '../types';

export default function PayrollPage() {
  const { data: employees = [] } = useGetAllEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | 'all'>('all');
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const monthNames = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
    'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
    'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
  ];

  const { data: allPayrollData = [], isLoading: payrollLoading } = useGetAllEmployeesPayrollData(
    month,
    year
  );

  const singlePayrollData: PayrollData | null = selectedEmployeeId !== 'all'
    ? allPayrollData.find(data => data.employeeId === selectedEmployeeId) ?? null
    : null;

  const selectedEmployee = selectedEmployeeId !== 'all'
    ? employees.find((e) => e.id === selectedEmployeeId) ?? null
    : null;

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 2, 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(year, month, 1);
    setCurrentDate(newDate);
  };

  const renderSingleEmployeePayroll = () => {
    if (!singlePayrollData || !selectedEmployee) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Calculator className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν δεδομένα μισθοδοσίας</h3>
          <p className="text-muted-foreground text-center">
            Δεν έχουν καταχωρηθεί ώρες εργασίας για αυτόν τον μήνα
          </p>
        </div>
      );
    }

    const totalPayments = singlePayrollData.totalCashPayments + singlePayrollData.totalBankPayments;
    const totalHoursWorked = singlePayrollData.normalHours + singlePayrollData.leaveDays;

    let currentMonthSalary = 0;
    if (selectedEmployee.employeeType === 'monthly' && selectedEmployee.fixedMonthlySalary) {
      currentMonthSalary = selectedEmployee.fixedMonthlySalary + (singlePayrollData.overtimeHours * selectedEmployee.overtimeRate);
    } else {
      currentMonthSalary = (totalHoursWorked * selectedEmployee.hourlyRate) + (singlePayrollData.overtimeHours * selectedEmployee.overtimeRate);
    }

    const currentMonthBankSalary = singlePayrollData.monthlyBankFixedSalary ?? 0;
    const currentMonthSalaryBalance = currentMonthSalary - singlePayrollData.totalCashPayments - singlePayrollData.totalBankPayments;
    const currentMonthBankBalance = currentMonthBankSalary - singlePayrollData.totalBankPayments;

    return (
      <div className="space-y-6">
        {/* 1. Συνολικός Μηνιαίος Μισθός */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
              1. Συνολικός Μηνιαίος Μισθός
            </CardTitle>
            <CardDescription className="text-indigo-700 dark:text-indigo-400">
              Μισθός του τρέχοντος μήνα
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mb-2">
              {currentMonthSalary.toFixed(2)}€
            </div>
            <div className="space-y-1 text-sm text-indigo-600 dark:text-indigo-400">
              {selectedEmployee.employeeType === 'monthly' ? (
                <>
                  <p className="font-medium">
                    Σταθερός Μηνιαίος Μισθός: {(selectedEmployee.fixedMonthlySalary ?? 0).toFixed(2)}€
                  </p>
                  <p className="font-medium">
                    + Υπερωρίες: {(singlePayrollData.overtimeHours * selectedEmployee.overtimeRate).toFixed(2)}€
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">
                    Κανονικές Ώρες + Άδειες: {totalHoursWorked.toFixed(2)} × {selectedEmployee.hourlyRate.toFixed(2)}€ = {(totalHoursWorked * selectedEmployee.hourlyRate).toFixed(2)}€
                  </p>
                  <p className="font-medium">
                    + Υπερωρίες: {singlePayrollData.overtimeHours.toFixed(2)} × {selectedEmployee.overtimeRate.toFixed(2)}€ = {(singlePayrollData.overtimeHours * selectedEmployee.overtimeRate).toFixed(2)}€
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Μηνιαίος Μισθός Τράπεζας */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-green-900 dark:text-green-100">
              2. Μηνιαίος Μισθός Τράπεζας
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-400">
              Μισθός τράπεζας του μήνα
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300 mb-2">
              {currentMonthBankSalary.toFixed(2)}€
            </div>
            <div className="space-y-1 text-sm text-green-600 dark:text-green-400">
              <p className="font-medium">
                Μισθός Τράπεζας Μήνα: {currentMonthBankSalary.toFixed(2)}€
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Συνολικές Πληρωμές */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">3. Συνολικές Πληρωμές</CardTitle>
            <CardDescription>
              Άθροισμα όλων των πληρωμών (μετρητά + τράπεζα) για τον τρέχοντα μήνα
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Πληρωμές Μετρητών</p>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {singlePayrollData.totalCashPayments.toFixed(2)}€
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Πληρωμές Τράπεζας</p>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {singlePayrollData.totalBankPayments.toFixed(2)}€
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Σύνολο Πληρωμών</p>
              <div className="text-2xl font-bold">{totalPayments.toFixed(2)}€</div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Υπόλοιπο Συνολικού Μισθού */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              4. Υπόλοιπο Συνολικού Μισθού
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-400">
              Συνολικός Μηνιαίος Μισθός − Πληρωμές Μετρητά − Πληρωμές Τράπεζα
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300 mb-2">
              {currentMonthSalaryBalance.toFixed(2)}€
            </div>
            <div className="space-y-1 text-sm text-amber-600 dark:text-amber-400">
              <p className="font-medium">Συνολικός Μηνιαίος Μισθός: {currentMonthSalary.toFixed(2)}€</p>
              <p className="font-medium">− Πληρωμές Μετρητά: {singlePayrollData.totalCashPayments.toFixed(2)}€</p>
              <p className="font-medium">− Πληρωμές Τράπεζα: {singlePayrollData.totalBankPayments.toFixed(2)}€</p>
              <Separator className="my-2" />
              <p className="font-semibold text-base">= Υπόλοιπο: {currentMonthSalaryBalance.toFixed(2)}€</p>
            </div>
          </CardContent>
        </Card>

        {/* 5. Υπόλοιπο Τράπεζας */}
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/30 border-teal-200 dark:border-teal-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-teal-900 dark:text-teal-100">
              5. Υπόλοιπο Τράπεζας
            </CardTitle>
            <CardDescription className="text-teal-700 dark:text-teal-400">
              Μηνιαίος Μισθός Τράπεζας − Πληρωμές Τράπεζα
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-700 dark:text-teal-300 mb-2">
              {currentMonthBankBalance.toFixed(2)}€
            </div>
            <div className="space-y-1 text-sm text-teal-600 dark:text-teal-400">
              <p className="font-medium">Μηνιαίος Μισθός Τράπεζας: {currentMonthBankSalary.toFixed(2)}€</p>
              <p className="font-medium">− Πληρωμές Τράπεζας: {singlePayrollData.totalBankPayments.toFixed(2)}€</p>
              <Separator className="my-2" />
              <p className="font-semibold text-base">= Υπόλοιπο Τράπεζας: {currentMonthBankBalance.toFixed(2)}€</p>
            </div>
          </CardContent>
        </Card>

        {/* 6. Ανάλυση Ωρών */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">6. Ανάλυση Ωρών</CardTitle>
            <CardDescription>Λεπτομερής ανάλυση των ωρών εργασίας</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Τύπος Ωρών</TableHead>
                  <TableHead className="text-right">Ποσότητα</TableHead>
                  <TableHead className="text-right">Αμοιβή</TableHead>
                  <TableHead className="text-right">Σύνολο</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedEmployee.employeeType === 'hourly' ? (
                  <>
                    <TableRow>
                      <TableCell className="font-medium">Κανονικές Ώρες</TableCell>
                      <TableCell className="text-right">{singlePayrollData.normalHours.toFixed(2)} ώρες</TableCell>
                      <TableCell className="text-right">{selectedEmployee.hourlyRate.toFixed(2)}€/ώρα</TableCell>
                      <TableCell className="text-right font-medium">
                        {(singlePayrollData.normalHours * selectedEmployee.hourlyRate).toFixed(2)}€
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Υπερωρίες</TableCell>
                      <TableCell className="text-right">{singlePayrollData.overtimeHours.toFixed(2)} ώρες</TableCell>
                      <TableCell className="text-right">{selectedEmployee.overtimeRate.toFixed(2)}€/ώρα</TableCell>
                      <TableCell className="text-right font-medium">
                        {(singlePayrollData.overtimeHours * selectedEmployee.overtimeRate).toFixed(2)}€
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Ώρες Άδειας</TableCell>
                      <TableCell className="text-right">{singlePayrollData.leaveDays.toFixed(2)} ώρες</TableCell>
                      <TableCell className="text-right">{selectedEmployee.hourlyRate.toFixed(2)}€/ώρα</TableCell>
                      <TableCell className="text-right font-medium">
                        {(singlePayrollData.leaveDays * selectedEmployee.hourlyRate).toFixed(2)}€
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Σύνολο</TableCell>
                      <TableCell className="text-right">{totalHoursWorked.toFixed(2)} ώρες</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">{currentMonthSalary.toFixed(2)}€</TableCell>
                    </TableRow>
                  </>
                ) : (
                  <>
                    <TableRow>
                      <TableCell className="font-medium">Σταθερός Μηνιαίος Μισθός</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right font-medium">
                        {(selectedEmployee.fixedMonthlySalary ?? 0).toFixed(2)}€
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Υπερωρίες</TableCell>
                      <TableCell className="text-right">{singlePayrollData.overtimeHours.toFixed(2)} ώρες</TableCell>
                      <TableCell className="text-right">{selectedEmployee.overtimeRate.toFixed(2)}€/ώρα</TableCell>
                      <TableCell className="text-right font-medium">
                        {(singlePayrollData.overtimeHours * selectedEmployee.overtimeRate).toFixed(2)}€
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Ημέρες Άδειας</TableCell>
                      <TableCell className="text-right">{singlePayrollData.leaveDays.toFixed(1)} ημέρες</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right font-medium">-</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Σύνολο Μισθού</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">{currentMonthSalary.toFixed(2)}€</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAllEmployeesPayroll = () => {
    if (allPayrollData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Calculator className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν δεδομένα μισθοδοσίας</h3>
          <p className="text-muted-foreground text-center">
            Δεν έχουν καταχωρηθεί ώρες εργασίας για αυτόν τον μήνα
          </p>
        </div>
      );
    }

    const totals = allPayrollData.reduce(
      (acc, data) => {
        const employee = employees.find(e => e.id === data.employeeId);
        if (!employee) return acc;

        const totalHoursWorked = data.normalHours + data.leaveDays;
        let currentMonthSalary = 0;
        if (employee.employeeType === 'monthly' && employee.fixedMonthlySalary) {
          currentMonthSalary = employee.fixedMonthlySalary + (data.overtimeHours * employee.overtimeRate);
        } else {
          currentMonthSalary = (totalHoursWorked * employee.hourlyRate) + (data.overtimeHours * employee.overtimeRate);
        }

        const currentMonthBankSalary = data.monthlyBankFixedSalary ?? 0;
        const currentMonthSalaryBalance = currentMonthSalary - data.totalCashPayments - data.totalBankPayments;
        const currentMonthBankBalance = currentMonthBankSalary - data.totalBankPayments;

        return {
          totalSalary: acc.totalSalary + currentMonthSalary,
          totalBankSalary: acc.totalBankSalary + currentMonthBankSalary,
          totalCashPayments: acc.totalCashPayments + data.totalCashPayments,
          totalBankPayments: acc.totalBankPayments + data.totalBankPayments,
          totalSalaryBalance: acc.totalSalaryBalance + currentMonthSalaryBalance,
          totalBankBalance: acc.totalBankBalance + currentMonthBankBalance,
          totalNormalHours: acc.totalNormalHours + data.normalHours,
          totalOvertimeHours: acc.totalOvertimeHours + data.overtimeHours,
          totalLeaveHours: acc.totalLeaveHours + data.leaveDays,
          totalPayments: acc.totalPayments + data.totalCashPayments + data.totalBankPayments,
        };
      },
      {
        totalSalary: 0,
        totalBankSalary: 0,
        totalCashPayments: 0,
        totalBankPayments: 0,
        totalSalaryBalance: 0,
        totalBankBalance: 0,
        totalNormalHours: 0,
        totalOvertimeHours: 0,
        totalLeaveHours: 0,
        totalPayments: 0,
      }
    );

    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Εμφανίζονται δεδομένα μισθοδοσίας για {monthNames[month - 1]} {year}
          </AlertDescription>
        </Alert>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Εργαζόμενος</TableHead>
                <TableHead className="text-right">Μισθός</TableHead>
                <TableHead className="text-right">Μισθός Τράπεζας</TableHead>
                <TableHead className="text-right">Πληρωμές Μετρητά</TableHead>
                <TableHead className="text-right">Πληρωμές Τράπεζα</TableHead>
                <TableHead className="text-right">Υπόλοιπο Μισθού</TableHead>
                <TableHead className="text-right">Υπόλοιπο Τράπεζας</TableHead>
                <TableHead className="text-right">Κανονικές Ώρες</TableHead>
                <TableHead className="text-right">Υπερωρίες</TableHead>
                <TableHead className="text-right">Άδεια</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPayrollData.map((data) => {
                const employee = employees.find(e => e.id === data.employeeId);
                if (!employee) return null;

                const totalHoursWorked = data.normalHours + data.leaveDays;
                let currentMonthSalary = 0;
                if (employee.employeeType === 'monthly' && employee.fixedMonthlySalary) {
                  currentMonthSalary = employee.fixedMonthlySalary + (data.overtimeHours * employee.overtimeRate);
                } else {
                  currentMonthSalary = (totalHoursWorked * employee.hourlyRate) + (data.overtimeHours * employee.overtimeRate);
                }

                const currentMonthBankSalary = data.monthlyBankFixedSalary ?? 0;
                const currentMonthSalaryBalance = currentMonthSalary - data.totalCashPayments - data.totalBankPayments;
                const currentMonthBankBalance = currentMonthBankSalary - data.totalBankPayments;

                return (
                  <TableRow key={data.employeeId.toString()}>
                    <TableCell className="font-medium">{data.employeeName}</TableCell>
                    <TableCell className="text-right">{currentMonthSalary.toFixed(2)}€</TableCell>
                    <TableCell className="text-right">{currentMonthBankSalary.toFixed(2)}€</TableCell>
                    <TableCell className="text-right">{data.totalCashPayments.toFixed(2)}€</TableCell>
                    <TableCell className="text-right">{data.totalBankPayments.toFixed(2)}€</TableCell>
                    <TableCell className={`text-right font-medium ${currentMonthSalaryBalance < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                      {currentMonthSalaryBalance.toFixed(2)}€
                    </TableCell>
                    <TableCell className={`text-right font-medium ${currentMonthBankBalance < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                      {currentMonthBankBalance.toFixed(2)}€
                    </TableCell>
                    <TableCell className="text-right">{data.normalHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{data.overtimeHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{data.leaveDays.toFixed(1)}</TableCell>
                  </TableRow>
                );
              })}
              {/* Totals row */}
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell>Σύνολα</TableCell>
                <TableCell className="text-right">{totals.totalSalary.toFixed(2)}€</TableCell>
                <TableCell className="text-right">{totals.totalBankSalary.toFixed(2)}€</TableCell>
                <TableCell className="text-right">{totals.totalCashPayments.toFixed(2)}€</TableCell>
                <TableCell className="text-right">{totals.totalBankPayments.toFixed(2)}€</TableCell>
                <TableCell className="text-right">{totals.totalSalaryBalance.toFixed(2)}€</TableCell>
                <TableCell className="text-right">{totals.totalBankBalance.toFixed(2)}€</TableCell>
                <TableCell className="text-right">{totals.totalNormalHours.toFixed(1)}</TableCell>
                <TableCell className="text-right">{totals.totalOvertimeHours.toFixed(1)}</TableCell>
                <TableCell className="text-right">{totals.totalLeaveHours.toFixed(1)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Μισθοδοσία</h2>
        <p className="text-muted-foreground">Υπολογισμός και ανάλυση μισθοδοσίας εργαζομένων</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{monthNames[month - 1]} {year}</CardTitle>
              <CardDescription>Επιλέξτε μήνα και εργαζόμενο</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedEmployeeId === 'all' ? 'all' : selectedEmployeeId.toString()}
            onValueChange={(v) => setSelectedEmployeeId(v === 'all' ? 'all' : parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε εργαζόμενο" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Όλοι οι Εργαζόμενοι
                </div>
              </SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id.toString()} value={employee.id.toString()}>
                  {employee.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {payrollLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : selectedEmployeeId === 'all' ? (
        renderAllEmployeesPayroll()
      ) : (
        renderSingleEmployeePayroll()
      )}
    </div>
  );
}
