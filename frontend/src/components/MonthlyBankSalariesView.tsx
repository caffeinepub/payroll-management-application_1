import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { useGetAllMonthlyBankSalaries, useDeleteMonthlyBankSalary, useGetAllEmployees } from '../hooks/useQueries';
import type { MonthlyBankSalary, Employee } from '../types';

interface MonthlyBankSalariesViewProps {
  onEdit?: (salary: MonthlyBankSalary) => void;
}

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

export default function MonthlyBankSalariesView({ onEdit }: MonthlyBankSalariesViewProps) {
  const { data: salaries = [], isLoading: salariesLoading } = useGetAllMonthlyBankSalaries();
  const { data: employees = [], isLoading: employeesLoading } = useGetAllEmployees();
  const deleteMutation = useDeleteMonthlyBankSalary();

  const isLoading = salariesLoading || employeesLoading;

  const employeeMap = React.useMemo(() => {
    const map = new Map<number, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  // Group salaries by employee
  const groups: SalaryGroup[] = React.useMemo(() => {
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
    await deleteMutation.mutateAsync({
      id: salary.id,
      employeeId: salary.employeeId,
      month: salary.month,
      year: salary.year,
    });
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
        Δεν υπάρχουν καταχωρημένοι μηνιαίοι μισθοί τράπεζας
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.employeeId.toString()} className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{group.employeeName}</h3>
              <Badge variant="outline" className="text-xs">
                {group.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωριαίος'}
              </Badge>
            </div>
            {group.salaries.length > 1 && (
              <span className="text-sm text-muted-foreground">
                Σύνολο: €{group.total.toFixed(2)} ({group.salaries.length} καταχωρήσεις)
              </span>
            )}
          </div>
          {group.salaries.map((salary) => (
            <div
              key={salary.id}
              className="flex items-center justify-between px-4 py-3 border-t first:border-t-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {MONTHS[salary.month - 1]} {salary.year}
                </span>
                <span className="text-sm text-muted-foreground">€{salary.amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(salary)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(salary)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
