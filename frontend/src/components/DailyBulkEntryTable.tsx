import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Info } from 'lucide-react';
import { useGetAllEmployees, useGetDailyBulkWorkDays, useSaveDailyBulkWorkDays } from '../hooks/useQueries';
import type { Employee, WorkDay } from '../types';

interface DailyBulkEntryTableProps {
  date: string;
}

interface RowState {
  normalHours: string;
  overtimeHours: string;
  isLeave: boolean;
}

export default function DailyBulkEntryTable({ date }: DailyBulkEntryTableProps) {
  const { data: employees = [] } = useGetAllEmployees();
  const { data: existingEntries = [], isLoading } = useGetDailyBulkWorkDays(date);
  const saveBulk = useSaveDailyBulkWorkDays();

  const [rows, setRows] = useState<Record<number, RowState>>({});

  // Pre-fill from existing data
  useEffect(() => {
    const initial: Record<number, RowState> = {};
    employees.forEach((emp: Employee) => {
      const existing = existingEntries.find((e) => e.employeeId === emp.id);
      if (existing?.workDay) {
        initial[emp.id] = {
          normalHours: existing.workDay.normalHours.toString(),
          overtimeHours: existing.workDay.overtimeHours.toString(),
          isLeave: existing.workDay.isLeave,
        };
      } else {
        initial[emp.id] = { normalHours: '', overtimeHours: '', isLeave: false };
      }
    });
    setRows(initial);
  }, [employees, existingEntries]);

  const updateRow = (empId: number, field: keyof RowState, value: string | boolean) => {
    setRows((prev) => {
      const updated = { ...prev, [empId]: { ...prev[empId], [field]: value } };
      // Auto-set 8 hours when leave is toggled on
      if (field === 'isLeave' && value === true) {
        updated[empId].normalHours = '8';
        updated[empId].overtimeHours = '0';
      }
      return updated;
    });
  };

  const handleSave = async () => {
    const entries = employees
      .filter((emp: Employee) => {
        const row = rows[emp.id];
        if (!row) return false;
        return row.isLeave || parseFloat(row.normalHours || '0') > 0 || parseFloat(row.overtimeHours || '0') > 0;
      })
      .map((emp: Employee) => {
        const row = rows[emp.id];
        const workDay: WorkDay = {
          date,
          normalHours: parseFloat(row.normalHours || '0') || 0,
          overtimeHours: parseFloat(row.overtimeHours || '0') || 0,
          isLeave: row.isLeave,
          leaveType: row.isLeave ? 'Κανονική' : null,
        };
        return { employeeId: emp.id, workDay };
      });

    if (entries.length === 0) return;
    await saveBulk.mutateAsync({ date, entries });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Δεν υπάρχουν εργαζόμενοι
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 flex gap-2 text-sm text-blue-700 dark:text-blue-300">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Μαζική καταχώρηση για {date}</p>
          <p>Ωρομίσθιοι άδεια: 8 ώρες × αμοιβή. Μηνιαίοι άδεια: αφαίρεση 1 ημέρας.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-medium">Εργαζόμενος</th>
              <th className="text-left py-2 pr-4 font-medium">Κανονικές Ώρες</th>
              <th className="text-left py-2 pr-4 font-medium">Υπερωρίες</th>
              <th className="text-left py-2 font-medium">Άδεια</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: Employee) => {
              const row = rows[emp.id] ?? { normalHours: '', overtimeHours: '', isLeave: false };
              return (
                <tr key={emp.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <div>
                      <p className="font-medium">{emp.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωρομίσθιος'}
                      </p>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      className="w-24"
                      placeholder="0"
                      value={row.normalHours}
                      disabled={row.isLeave}
                      onChange={(e) => updateRow(emp.id, 'normalHours', e.target.value)}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      className="w-24"
                      placeholder="0"
                      value={row.overtimeHours}
                      disabled={row.isLeave}
                      onChange={(e) => updateRow(emp.id, 'overtimeHours', e.target.value)}
                    />
                  </td>
                  <td className="py-2">
                    <Checkbox
                      checked={row.isLeave}
                      onCheckedChange={(checked) => updateRow(emp.id, 'isLeave', checked === true)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button onClick={handleSave} disabled={saveBulk.isPending} className="w-full">
        {saveBulk.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Αποθήκευση
      </Button>
    </div>
  );
}
