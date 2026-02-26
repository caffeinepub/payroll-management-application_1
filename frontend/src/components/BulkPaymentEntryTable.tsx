import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetEmployees, useAddPaymentsBulk, PaymentRecord } from '../hooks/useQueries';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export default function BulkPaymentEntryTable() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [entries, setEntries] = useState<Record<number, { cash: string; bank: string }>>({});

  const { data: employees = [], isLoading } = useGetEmployees();
  const addPaymentsBulk = useAddPaymentsBulk();

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const getEntry = (empId: number) => entries[empId] ?? { cash: '', bank: '' };

  const handleSave = async () => {
    const toSave: Omit<PaymentRecord, 'id'>[] = employees
      .map((emp) => {
        const empId = Number(emp.id);
        const entry = getEntry(empId);
        const cash = parseFloat(entry.cash) || 0;
        const bank = parseFloat(entry.bank) || 0;
        if (cash === 0 && bank === 0) return null;
        return {
          employeeId: empId,
          month,
          year,
          cashPayment: cash,
          bankPayment: bank,
          paymentDate,
        };
      })
      .filter(Boolean) as Omit<PaymentRecord, 'id'>[];

    if (toSave.length === 0) {
      toast.warning('Δεν υπάρχουν ποσά για αποθήκευση');
      return;
    }

    try {
      await addPaymentsBulk.mutateAsync({ entries: toSave });
      toast.success('Οι πληρωμές αποθηκεύτηκαν επιτυχώς');
      setEntries({});
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

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
      <div className="flex gap-3 flex-wrap items-center">
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
        <Input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          className="w-auto"
        />
        <Button onClick={handleSave} disabled={addPaymentsBulk.isPending} className="gap-2">
          {addPaymentsBulk.isPending ? (
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
                <th className="border border-border px-4 py-2 text-center font-semibold">Μετρητά (€)</th>
                <th className="border border-border px-4 py-2 text-center font-semibold">Τράπεζα (€)</th>
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
                        step="0.01"
                        value={entry.cash}
                        onChange={(e) =>
                          setEntries((prev) => ({
                            ...prev,
                            [empId]: { ...getEntry(empId), cash: e.target.value },
                          }))
                        }
                        placeholder="0.00"
                        className="text-center"
                      />
                    </td>
                    <td className="border border-border px-4 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.bank}
                        onChange={(e) =>
                          setEntries((prev) => ({
                            ...prev,
                            [empId]: { ...getEntry(empId), bank: e.target.value },
                          }))
                        }
                        placeholder="0.00"
                        className="text-center"
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
