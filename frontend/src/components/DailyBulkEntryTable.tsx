import React, { useState, useEffect } from 'react';
import { useGetEmployees, useSetWorkDaysBulk } from '../hooks/useQueries';
import { WorkDay } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface DailyBulkEntryTableProps {
  month: number;
  year: number;
}

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

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

const DAY_NAMES = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

type DayEntry = {
  normalHours: string;
  overtimeHours: string;
  isLeave: boolean;
};

export default function DailyBulkEntryTable({ month, year }: DailyBulkEntryTableProps) {
  const { data: employees = [], isLoading } = useGetEmployees();
  const setWorkDaysBulk = useSetWorkDaysBulk();

  const daysInMonth = getDaysInMonth(month, year);
  const [selectedDay, setSelectedDay] = useState(1);
  const [entries, setEntries] = useState<Record<number, DayEntry>>({});
  const [saving, setSaving] = useState(false);

  // Clamp selectedDay when month changes
  useEffect(() => {
    if (selectedDay > daysInMonth) setSelectedDay(daysInMonth);
  }, [month, year, daysInMonth, selectedDay]);

  // Load data for selected day
  useEffect(() => {
    const store = getFromLS<Record<number, Record<string, WorkDay>>>(LS_KEY, {});
    const date = formatDate(year, month, selectedDay);
    const newEntries: Record<number, DayEntry> = {};
    for (const emp of employees) {
      const wd = store[emp.id]?.[date];
      newEntries[emp.id] = {
        normalHours: wd ? String(wd.normalHours) : '',
        overtimeHours: wd ? String(wd.overtimeHours) : '',
        isLeave: wd?.isLeave ?? false,
      };
    }
    setEntries(newEntries);
  }, [employees, selectedDay, month, year]);

  const handleChange = (empId: number, field: keyof DayEntry, value: string | boolean) => {
    setEntries((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const date = formatDate(year, month, selectedDay);
      const workDayEntries: { employeeId: number; workDay: WorkDay }[] = [];
      for (const emp of employees) {
        const entry = entries[emp.id];
        if (!entry) continue;
        const normalHours = parseFloat(entry.normalHours) || 0;
        const overtimeHours = parseFloat(entry.overtimeHours) || 0;
        if (normalHours > 0 || overtimeHours > 0 || entry.isLeave) {
          workDayEntries.push({
            employeeId: emp.id,
            workDay: { date, normalHours, overtimeHours, isLeave: entry.isLeave },
          });
        }
      }
      await setWorkDaysBulk.mutateAsync(workDayEntries);
      toast.success(`Αποθηκεύτηκαν οι ώρες για ${selectedDay}/${month}/${year}`);
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const selectedDate = new Date(year, month - 1, selectedDay);
  const dayName = DAY_NAMES[selectedDate.getDay()];
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;

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

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
              disabled={selectedDay === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className={`text-xl font-bold ${isWeekend ? 'text-red-500' : 'text-foreground'}`}>
                {selectedDay} / {month} / {year}
              </p>
              <p className={`text-sm ${isWeekend ? 'text-red-400' : 'text-muted-foreground'}`}>
                {dayName}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDay((d) => Math.min(daysInMonth, d + 1))}
              disabled={selectedDay === daysInMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Day quick-select */}
          <div className="mt-3 flex flex-wrap gap-1 justify-center">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
              const dt = new Date(year, month - 1, d);
              const isWknd = dt.getDay() === 0 || dt.getDay() === 6;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`w-7 h-7 text-xs rounded transition-colors ${
                    d === selectedDay
                      ? 'bg-primary text-primary-foreground font-bold'
                      : isWknd
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Entry table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Καταχώρηση για {selectedDay}/{month}/{year} — {dayName}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Εργαζόμενος
                  </th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground">
                    Κανονικές Ώρες
                  </th>
                  <th className="text-center px-4 py-2 font-medium text-orange-600">
                    Υπερωρίες
                  </th>
                  <th className="text-center px-4 py-2 font-medium text-yellow-600">
                    Άδεια
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => {
                  const entry = entries[emp.id] ?? {
                    normalHours: '',
                    overtimeHours: '',
                    isLeave: false,
                  };
                  return (
                    <tr
                      key={emp.id}
                      className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-muted/20'} ${
                        entry.isLeave ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-2 font-medium">{emp.fullName}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.normalHours}
                          onChange={(e) => handleChange(emp.id, 'normalHours', e.target.value)}
                          className="w-20 text-center border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary mx-auto block"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.overtimeHours}
                          onChange={(e) => handleChange(emp.id, 'overtimeHours', e.target.value)}
                          className="w-20 text-center border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary text-orange-600 mx-auto block"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={entry.isLeave}
                          onChange={(e) => handleChange(emp.id, 'isLeave', e.target.checked)}
                          className="w-4 h-4 accent-yellow-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Αποθήκευση...' : 'Αποθήκευση Ημέρας'}
        </Button>
      </div>
    </div>
  );
}
