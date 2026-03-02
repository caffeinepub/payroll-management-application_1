import React, { useState } from 'react';
import { useGetEmployees, useGetAllPayrollData } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Clock, TrendingUp, CreditCard, Building2, AlertCircle } from 'lucide-react';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function PayrollPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: employees = [], isLoading: empLoading } = useGetEmployees();
  const { data: payrollData = [], isLoading: payrollLoading } = useGetAllPayrollData(selectedMonth, selectedYear);

  const isLoading = empLoading || payrollLoading;

  const totalSalaries = payrollData.reduce((sum, p) => sum + p.totalMonthlySalary, 0);
  const totalCash = payrollData.reduce((sum, p) => sum + p.totalCashPayments, 0);
  const totalBank = payrollData.reduce((sum, p) => sum + p.totalBankPayments, 0);
  const totalRemaining = payrollData.reduce((sum, p) => sum + Math.max(0, p.remainingRealSalary), 0);

  const fmt = (n: number) =>
    n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Μισθοδοσία</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Υπολογισμός μισθοδοσίας εργαζομένων
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(Number(v))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Σύνολο Μισθών</span>
            </div>
            <p className="text-lg font-bold text-foreground">{fmt(totalSalaries)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Πληρωμές Μετρητά</span>
            </div>
            <p className="text-lg font-bold text-foreground">{fmt(totalCash)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Πληρωμές Τράπεζα</span>
            </div>
            <p className="text-lg font-bold text-foreground">{fmt(totalBank)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Υπόλοιπο</span>
            </div>
            <p className="text-lg font-bold text-foreground">{fmt(totalRemaining)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Payroll Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-6 w-48 mb-3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-16" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Δεν υπάρχουν εργαζόμενοι</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payrollData.map((pd) => {
            const emp = employees.find((e) => e.id === pd.employeeId);
            if (!emp) return null;
            const remaining = pd.remainingRealSalary;
            const bankRemaining = pd.remainingBankBalance;

            return (
              <Card key={pd.employeeId} className="overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">
                          {emp.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-base">{emp.fullName}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {emp.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωρομίσθιος'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={remaining <= 0 ? 'secondary' : 'default'}
                      className={remaining <= 0 ? '' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}
                    >
                      {remaining <= 0 ? 'Εξοφλημένος' : `Υπόλοιπο: ${fmt(remaining)}`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Μικτός Μισθός</p>
                      <p className="font-semibold text-sm">{fmt(pd.totalMonthlySalary)}</p>
                    </div>
                    {pd.monthlyBankFixedSalary != null && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Τράπεζα (Ορισμένο)</p>
                        <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                          {fmt(pd.monthlyBankFixedSalary)}
                        </p>
                      </div>
                    )}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Ώρες Εργασίας</p>
                      <p className="font-semibold text-sm">{pd.normalHours.toFixed(1)}h</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Υπερωρίες</p>
                      <p className="font-semibold text-sm">{pd.overtimeHours.toFixed(1)}h</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Πληρωμές Μετρητά</p>
                      <p className="font-semibold text-sm text-green-700 dark:text-green-400">
                        {fmt(pd.totalCashPayments)}
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Πληρωμές Τράπεζα</p>
                      <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                        {fmt(pd.totalBankPayments)}
                      </p>
                    </div>
                  </div>

                  {/* Additional info row */}
                  <div className="mt-3 flex flex-wrap gap-3">
                    {pd.leaveDays > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                        Άδειες: {pd.leaveDays} ημέρες
                      </div>
                    )}
                    {pd.previousMonthSalaryCarryover > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                        Υπόλοιπο προηγ. μήνα: {fmt(pd.previousMonthSalaryCarryover)}
                      </div>
                    )}
                    {bankRemaining !== 0 && pd.monthlyBankFixedSalary != null && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                        Υπόλοιπο τράπεζας: {fmt(bankRemaining)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
