import React, { useState, useEffect, useCallback } from 'react';
import { useGetEmployees, useSetWorkDaysBulk } from '../hooks/useQueries';
import { WorkDay } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkEntryTableProps {
  month: number;
  year: number;
}

type CellData = {
  normalHours: string;
  overtimeHours: string;
  isLeave: boolean;
};

type TableData = Record<number, Record<string, CellData>>;

const LS_KEY = 'workDays_v1';

function getFromLS<T>(key: string, def: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return def;
    return JSON.parse(raw) as T;
  } catch {
    return def;
  }
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function BulkEntryTable({ month, year }: BulkEntryTableProps) {
  const { data: employees = [], isLoading } = useGetEmployees();
  const setWorkDaysBulk = useSetWorkDaysBulk();
  const [tableData, setTableData] = useState<TableData>({});
  const [saving, setSaving] = useState(false);

  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Load data from localStorage
  useEffect(() => {
    const store = getFromLS<Record<number, Record<string, WorkDay>>>(LS_KEY, {});
    const newTableData: TableData = {};
    for (const emp of employees) {
      newTableData[emp.id] = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const date = formatDate(year, month, d);
        const wd = store[emp.id]?.[date];
        newTableData[emp.id][date] = {
          normalHours: wd ? String(wd.normalHours) : '',
          overtimeHours: wd ? String(wd.overtimeHours) : '',
          isLeave: wd?.isLeave ?? false,
        };
      }
    }
    setTableData(newTableData);
  }, [employees, month, year, daysInMonth]);

  const handleCellChange = useCallback(
    (empId: number, date: string, field: keyof CellData, value: string | boolean) => {
      setTableData((prev) => ({
        ...prev,
        [empId]: {
          ...prev[empId],
          [date]: {
            ...prev[empId]?.[date],
            [field]: value,
          },
        },
      }));
    },
    [],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries: { employeeId: number; workDay: WorkDay }[] = [];
      for (const emp of employees) {
        for (let d = 1; d <= daysInMonth; d++) {
          const date = formatDate(year, month, d);
          const cell = tableData[emp.id]?.[date];
          if (!cell) continue;
          const normalHours = parseFloat(cell.normalHours) || 0;
          const overtimeHours = parseFloat(cell.overtimeHours) || 0;
          if (normalHours > 0 || overtimeHours > 0 || cell.isLeave) {
            entries.push({
              employeeId: emp.id,
              workDay: {
                date,
                normalHours,
                overtimeHours,
                isLeave: cell.isLeave,
              },
            });
          }
        }
      }
      await setWorkDaysBulk.mutateAsync(entries);
      toast.success('Οι ώρες αποθηκεύτηκαν επιτυχώς');
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Δεν υπάρχουν εργαζόμενοι</p>
        </CardContent>
      </Card>
    );
  }

  // Show only first 15 days and last days to keep table manageable
  const dayGroups = [
    days.slice(0, 15),
    days.slice(15),
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
        </Button>
      </div>

      {dayGroups.map((group, gi) => (
        <Card key={gi} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-muted/50 min-w-[140px]">
                      Εργαζόμενος
                    </th>
                    {group.map((day) => {
                      const date = new Date(year, month - 1, day);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <th
                          key={day}
                          className={`px-1 py-2 font-medium text-center min-w-[60px] ${
                            isWeekend ? 'text-red-500' : 'text-muted-foreground'
                          }`}
                        >
                          <div>{day}</div>
                          <div className="text-[10px]">
                            {['Κυ', 'Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα'][date.getDay()]}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, ei) => (
                    <tr
                      key={emp.id}
                      className={`border-b border-border ${ei % 2 === 0 ? '' : 'bg-muted/20'}`}
                    >
                      <td className="px-3 py-1 font-medium sticky left-0 bg-card border-r border-border">
                        <div className="truncate max-w-[130px]" title={emp.fullName}>
                          {emp.fullName}
                        </div>
                      </td>
                      {group.map((day) => {
                        const date = formatDate(year, month, day);
                        const cell = tableData[emp.id]?.[date] ?? {
                          normalHours: '',
                          overtimeHours: '',
                          isLeave: false,
                        };
                        const isWeekend =
                          new Date(year, month - 1, day).getDay() === 0 ||
                          new Date(year, month - 1, day).getDay() === 6;

                        return (
                          <td
                            key={day}
                            className={`px-1 py-1 ${isWeekend ? 'bg-red-50/30 dark:bg-red-900/10' : ''} ${
                              cell.isLeave ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={cell.normalHours}
                                onChange={(e) =>
                                  handleCellChange(emp.id, date, 'normalHours', e.target.value)
                                }
                                className="w-12 text-center text-xs border border-border rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="0"
                                title="Κανονικές ώρες"
                              />
                              <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={cell.overtimeHours}
                                onChange={(e) =>
                                  handleCellChange(emp.id, date, 'overtimeHours', e.target.value)
                                }
                                className="w-12 text-center text-xs border border-border rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary text-orange-600"
                                placeholder="0"
                                title="Υπερωρίες"
                              />
                              <label className="flex items-center justify-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={cell.isLeave}
                                  onChange={(e) =>
                                    handleCellChange(emp.id, date, 'isLeave', e.target.checked)
                                  }
                                  className="w-3 h-3 accent-yellow-500"
                                  title="Άδεια"
                                />
                              </label>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border bg-muted/20">
              <span className="text-foreground font-medium">Υπόμνημα:</span> Γραμμή 1 = Κανονικές ώρες | Γραμμή 2 = Υπερωρίες (πορτοκαλί) | Checkbox = Άδεια (κίτρινο)
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
