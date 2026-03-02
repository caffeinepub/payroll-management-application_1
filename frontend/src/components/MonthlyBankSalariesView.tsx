import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useDeleteMonthlyBankSalary, useGetEmployees, useGetMonthlyBankSalaries } from '../hooks/useQueries';
import type { MonthlyBankSalary } from '../types';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

interface SalaryGroup {
  employeeId: number;
  employeeName: string;
  employeeType: string;
  salaries: MonthlyBankSalary[];
  total: number;
}

export default function MonthlyBankSalariesView() {
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  // Pass undefined for employeeId to get all salaries for the month/year
  const { data: salaries = [], isLoading: salariesLoading } = useGetMonthlyBankSalaries(undefined, month, year);
  const { data: employees = [], isLoading: employeesLoading } = useGetEmployees();
  const deleteMutation = useDeleteMonthlyBankSalary();

  const isLoading = salariesLoading || employeesLoading;

  const employeeMap = useMemo(() => {
    const map = new Map<number, { fullName: string; employeeType: string }>();
    employees.forEach((e) => map.set(Number(e.id), { fullName: e.fullName, employeeType: e.employeeType }));
    return map;
  }, [employees]);

  const groups: SalaryGroup[] = useMemo(() => {
    const groupMap = new Map<number, SalaryGroup>();
    salaries.forEach((s) => {
      const emp = employeeMap.get(s.employeeId);
      if (!groupMap.has(s.employeeId)) {
        groupMap.set(s.employeeId, {
          employeeId: s.employeeId,
          employeeName: emp?.fullName ?? `Εργαζόμενος #${s.employeeId}`,
          employeeType: emp?.employeeType ?? 'unknown',
          salaries: [],
          total: 0,
        });
      }
      const group = groupMap.get(s.employeeId)!;
      group.salaries.push(s);
      group.total += s.amount;
    });
    return Array.from(groupMap.values()).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName)
    );
  }, [salaries, employeeMap]);

  const handleDelete = async (salary: MonthlyBankSalary) => {
    await deleteMutation.mutateAsync(salary);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Δεν υπάρχουν εγγραφές για {MONTHS[month - 1]} {year}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        Εμφάνιση για: <strong>{MONTHS[month - 1]} {year}</strong>
      </div>
      {groups.map((group) => (
        <div key={group.employeeId} className="border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{group.employeeName}</span>
              <Badge variant={group.employeeType === 'monthly' ? 'default' : 'secondary'} className="text-xs">
                {group.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωρομίσθιος'}
              </Badge>
            </div>
            <span className="font-bold text-primary">{group.total.toFixed(2)}€</span>
          </div>

          <div className="space-y-1">
            {group.salaries.map((salary) => (
              <div
                key={salary.id}
                className="flex items-center justify-between bg-muted/30 rounded px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {MONTHS[salary.month - 1]} {salary.year}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{salary.amount.toFixed(2)}€</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(salary)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
