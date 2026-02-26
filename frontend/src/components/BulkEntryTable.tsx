import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useGetEmployees, useGetAllWorkDaysForMonth, useSetWorkDay, WorkDay } from '../hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BulkEntryTableProps {
  month: number;
  year: number;
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function padDate(n: number): string {
  return n.toString().padStart(2, '0');
}

export default function BulkEntryTable({ month, year }: BulkEntryTableProps) {
  const { data: employees = [], isLoading: empLoading } = useGetEmployees();
  const employeeIds = employees.map((e) => Number(e.id));
  const { data: allWorkDays = {}, isLoading: wdLoading } = useGetAllWorkDaysForMonth(month, year, employeeIds);
  const setWorkDay = useSetWorkDay();

  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Local state for editing: keyed by `${empId}_${dateStr}`
  const [localData, setLocalData] = useState<Record<string, { normal: string; overtime: string; isLeave: boolean }>>({});

  useEffect(() => {
    const newLocal: Record<string, { normal: string; overtime: string; isLeave: boolean }> = {};
    for (const emp of employees) {
      const empId = Number(emp.id);
      // allWorkDays[empId] is WorkDay[] (array)
      const empDays: WorkDay[] = allWorkDays[empId] ?? [];
      for (const day of days) {
        const dateStr = `${year}-${padDate(month)}-${padDate(day)}`;
        const existing = empDays.find((d) => d.date === dateStr);
        newLocal[`${empId}_${dateStr}`] = {
          normal: existing ? existing.normalHours.toString() : '',
          overtime: existing ? existing.overtimeHours.toString() : '',
          isLeave: existing?.isLeave ?? false,
        };
      }
    }
    setLocalData(newLocal);
  }, [allWorkDays, employees, month, year]);

  const handleBlur = async (employeeId: number, dateStr: string) => {
    const key = `${employeeId}_${dateStr}`;
    const entry = localData[key];
    if (!entry) return;

    const normalHours = parseFloat(entry.normal) || 0;
    const overtimeHours = parseFloat(entry.overtime) || 0;

    const workDay: WorkDay = {
      date: dateStr,
      normalHours,
      overtimeHours,
      isLeave: entry.isLeave,
    };

    await setWorkDay.mutateAsync({ employeeId, workDay });
  };

  const handleLeaveToggle = async (employeeId: number, dateStr: string) => {
    const key = `${employeeId}_${dateStr}`;
    const entry = localData[key];
    if (!entry) return;

    const newIsLeave = !entry.isLeave;
    setLocalData((prev) => ({ ...prev, [key]: { ...prev[key], isLeave: newIsLeave } }));

    const workDay: WorkDay = {
      date: dateStr,
      normalHours: parseFloat(entry.normal) || 0,
      overtimeHours: parseFloat(entry.overtime) || 0,
      isLeave: newIsLeave,
    };
    await setWorkDay.mutateAsync({ employeeId, workDay });
  };

  if (empLoading || wdLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Φόρτωση...</span>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Δεν υπάρχουν εργαζόμενοι. Προσθέστε εργαζόμενους πρώτα.
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="overflow-x-auto">
        <table className="min-w-max border-collapse text-xs">
          <thead>
            <tr className="bg-muted">
              <th className="sticky left-0 bg-muted border border-border px-3 py-2 text-left font-semibold min-w-[140px] z-10">
                Εργαζόμενος
              </th>
              {days.map((day) => {
                const dateStr = `${year}-${padDate(month)}-${padDate(day)}`;
                const dow = new Date(dateStr).getDay();
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <th
                    key={day}
                    className={`border border-border px-1 py-2 text-center font-medium min-w-[70px] ${
                      isWeekend ? 'bg-muted/70 text-muted-foreground' : ''
                    }`}
                  >
                    <div>{day}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {['Κυ', 'Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα'][dow]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const empId = Number(emp.id);
              return (
                <tr key={empId} className="hover:bg-muted/30">
                  <td className="sticky left-0 bg-background border border-border px-3 py-1 font-medium z-10 whitespace-nowrap">
                    {emp.fullName}
                  </td>
                  {days.map((day) => {
                    const dateStr = `${year}-${padDate(month)}-${padDate(day)}`;
                    const key = `${empId}_${dateStr}`;
                    const entry = localData[key] ?? { normal: '', overtime: '', isLeave: false };
                    const dow = new Date(dateStr).getDay();
                    const isWeekend = dow === 0 || dow === 6;

                    return (
                      <td
                        key={day}
                        className={`border border-border px-1 py-1 ${isWeekend ? 'bg-muted/30' : ''}`}
                      >
                        {entry.isLeave ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-primary font-medium">ΑΔΕΙΑ</span>
                            <button
                              onClick={() => handleLeaveToggle(empId, dateStr)}
                              className="text-[9px] text-muted-foreground hover:text-destructive"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={entry.normal}
                              onChange={(e) =>
                                setLocalData((prev) => ({
                                  ...prev,
                                  [key]: { ...prev[key], normal: e.target.value },
                                }))
                              }
                              onBlur={() => handleBlur(empId, dateStr)}
                              placeholder="Κ"
                              className="w-full text-center text-[11px] border border-border rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={entry.overtime}
                              onChange={(e) =>
                                setLocalData((prev) => ({
                                  ...prev,
                                  [key]: { ...prev[key], overtime: e.target.value },
                                }))
                              }
                              onBlur={() => handleBlur(empId, dateStr)}
                              placeholder="Υ"
                              className="w-full text-center text-[11px] border border-border rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              onClick={() => handleLeaveToggle(empId, dateStr)}
                              className="text-[9px] text-muted-foreground hover:text-primary"
                              title="Σήμανση ως άδεια"
                            >
                              Α
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ScrollArea>
  );
}
