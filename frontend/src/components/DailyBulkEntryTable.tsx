import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetEmployees, useGetDailyWorkEntries, useSetWorkDaysBulk, WorkDay } from '../hooks/useQueries';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

function padDate(n: number): string {
  return n.toString().padStart(2, '0');
}

export default function DailyBulkEntryTable() {
  const now = new Date();
  const [day, setDay] = useState(now.getDate());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const dateStr = `${year}-${padDate(month)}-${padDate(day)}`;
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const daysInMonth = new Date(year, month, 0).getDate();

  const { data: employees = [], isLoading: empLoading } = useGetEmployees();
  // useGetDailyWorkEntries now takes only the date string
  const { data: dailyEntries = {}, isLoading: wdLoading } = useGetDailyWorkEntries(dateStr);
  const setWorkDaysBulk = useSetWorkDaysBulk();

  const [localEntries, setLocalEntries] = useState<
    Record<number, { normal: string; overtime: string; isLeave: boolean }>
  >({});

  const getEntry = (empId: number) => {
    if (localEntries[empId] !== undefined) return localEntries[empId];
    const existing = dailyEntries[empId];
    if (existing) {
      return {
        normal: existing.normalHours.toString(),
        overtime: existing.overtimeHours.toString(),
        isLeave: existing.isLeave,
      };
    }
    return { normal: '', overtime: '', isLeave: false };
  };

  const handleSave = async () => {
    const entries: { employeeId: number; workDay: WorkDay }[] = employees
      .map((emp) => {
        const empId = Number(emp.id);
        const entry = getEntry(empId);
        const normalHours = parseFloat(entry.normal) || 0;
        const overtimeHours = parseFloat(entry.overtime) || 0;
        if (normalHours === 0 && overtimeHours === 0 && !entry.isLeave) return null;
        return {
          employeeId: empId,
          workDay: {
            date: dateStr,
            normalHours,
            overtimeHours,
            isLeave: entry.isLeave,
          },
        };
      })
      .filter(Boolean) as { employeeId: number; workDay: WorkDay }[];

    if (entries.length === 0) {
      toast.warning('Δεν υπάρχουν δεδομένα για αποθήκευση');
      return;
    }

    try {
      await setWorkDaysBulk.mutateAsync(entries);
      toast.success('Οι ώρες αποθηκεύτηκαν επιτυχώς');
      setLocalEntries({});
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

  const isLoading = empLoading || wdLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Φόρτωση...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date selectors */}
      <div className="flex gap-3 flex-wrap items-center">
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
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
        <Button onClick={handleSave} disabled={setWorkDaysBulk.isPending} className="gap-2">
          {setWorkDaysBulk.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Αποθήκευση
        </Button>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Δεν υπάρχουν εργαζόμενοι.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-4 py-2 text-left font-semibold">Εργαζόμενος</th>
                <th className="border border-border px-4 py-2 text-center font-semibold">Κανονικές Ώρες</th>
                <th className="border border-border px-4 py-2 text-center font-semibold">Υπερωρίες</th>
                <th className="border border-border px-4 py-2 text-center font-semibold">Άδεια</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const empId = Number(emp.id);
                const entry = getEntry(empId);
                return (
                  <tr key={empId} className="hover:bg-muted/30">
                    <td className="border border-border px-4 py-2 font-medium">{emp.fullName}</td>
                    <td className="border border-border px-4 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={entry.normal}
                        onChange={(e) =>
                          setLocalEntries((prev) => ({
                            ...prev,
                            [empId]: { ...getEntry(empId), normal: e.target.value },
                          }))
                        }
                        disabled={entry.isLeave}
                        placeholder="0"
                        className="text-center"
                      />
                    </td>
                    <td className="border border-border px-4 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={entry.overtime}
                        onChange={(e) =>
                          setLocalEntries((prev) => ({
                            ...prev,
                            [empId]: { ...getEntry(empId), overtime: e.target.value },
                          }))
                        }
                        disabled={entry.isLeave}
                        placeholder="0"
                        className="text-center"
                      />
                    </td>
                    <td className="border border-border px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={entry.isLeave}
                        onChange={(e) =>
                          setLocalEntries((prev) => ({
                            ...prev,
                            [empId]: { ...getEntry(empId), isLeave: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-primary"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
