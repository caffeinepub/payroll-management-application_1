import { useState } from 'react';
import { Loader2, TrendingUp, Clock, Umbrella, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEmployees, useGetPayrollData } from '../hooks/useQueries';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const { data: employees = [], isLoading: empLoading } = useEmployees();
  const { data: payrollData = [], isLoading: payrollLoading } = useGetPayrollData(month, year, employees);

  const isLoading = empLoading || payrollLoading;

  const totalSalary = payrollData.reduce((sum, p) => sum + p.totalMonthlySalary, 0);
  const totalCash = payrollData.reduce((sum, p) => sum + p.totalCashPayments, 0);
  const totalBank = payrollData.reduce((sum, p) => sum + p.totalBankPayments, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Μισθοδοσία</h1>
        <p className="text-muted-foreground text-sm mt-1">Μηνιαία σύνοψη μισθοδοσίας ανά εργαζόμενο</p>
      </div>

      {/* Month/Year Selectors */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {!isLoading && payrollData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Συνολικός Μισθός
              </div>
              <div className="text-2xl font-bold text-foreground">{totalSalary.toFixed(2)}€</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Πληρωμές Μετρητά
              </div>
              <div className="text-2xl font-bold text-foreground">{totalCash.toFixed(2)}€</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Πληρωμές Τράπεζα
              </div>
              <div className="text-2xl font-bold text-foreground">{totalBank.toFixed(2)}€</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Φόρτωση...</span>
        </div>
      )}

      {/* Employee Cards */}
      {!isLoading && payrollData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Δεν υπάρχουν δεδομένα μισθοδοσίας για αυτόν τον μήνα.
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {payrollData.map((p) => (
            <Card key={p.employeeId} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="truncate">{p.employeeName}</span>
                  <Badge variant={p.employeeType === 'monthly' ? 'default' : 'secondary'} className="text-xs ml-2 shrink-0">
                    {p.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωρομίσθιος'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Μισθός μήνα:
                  </span>
                  <span className="font-semibold">{p.totalMonthlySalary.toFixed(2)}€</span>
                </div>
                {p.employeeType === 'hourly' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Κανονικές ώρες:
                      </span>
                      <span>{p.normalHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Υπερωρίες:
                      </span>
                      <span>{p.overtimeHours.toFixed(1)}h</span>
                    </div>
                  </>
                )}
                {p.monthlyBankFixedSalary != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Τράπεζα (σταθερό):</span>
                    <span>{p.monthlyBankFixedSalary.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Πληρωμές μετρητά:</span>
                  <span className="text-green-600 dark:text-green-400">{p.totalCashPayments.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Πληρωμές τράπεζα:</span>
                  <span className="text-blue-600 dark:text-blue-400">{p.totalBankPayments.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground font-medium">Υπόλοιπο:</span>
                  <span className={`font-bold ${p.remainingRealSalary < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {p.remainingRealSalary.toFixed(2)}€
                  </span>
                </div>
                {p.leaveDays > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Umbrella className="w-3 h-3" />
                      Ημέρες άδειας:
                    </span>
                    <span>{p.leaveDays}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
