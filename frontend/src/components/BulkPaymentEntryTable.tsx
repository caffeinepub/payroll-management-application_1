import React, { useState, useEffect } from 'react';
import { useGetEmployees, useGetPayments, useAddPaymentsBulk } from '../hooks/useQueries';
import { PaymentRecord } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, Users } from 'lucide-react';

interface BulkPaymentEntryTableProps {
  month: number;
  year: number;
}

type PaymentEntry = {
  cashPayment: string;
  bankPayment: string;
};

export default function BulkPaymentEntryTable({ month, year }: BulkPaymentEntryTableProps) {
  const { data: employees = [], isLoading: empLoading } = useGetEmployees();
  const { data: existingPayments = [], isLoading: payLoading } = useGetPayments(undefined, month, year);
  const addPaymentsBulk = useAddPaymentsBulk();
  const [entries, setEntries] = useState<Record<number, PaymentEntry>>({});
  const [saving, setSaving] = useState(false);

  // Pre-populate with existing payments
  useEffect(() => {
    const newEntries: Record<number, PaymentEntry> = {};
    for (const emp of employees) {
      const existing = existingPayments.find((p) => p.employeeId === emp.id);
      newEntries[emp.id] = {
        cashPayment: existing ? String(existing.cashPayment) : '',
        bankPayment: existing ? String(existing.bankPayment) : '',
      };
    }
    setEntries(newEntries);
  }, [employees, existingPayments]);

  const handleChange = (empId: number, field: keyof PaymentEntry, value: string) => {
    setEntries((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const paymentEntries: PaymentRecord[] = employees
        .map((emp) => {
          const entry = entries[emp.id] ?? { cashPayment: '', bankPayment: '' };
          return {
            employeeId: emp.id,
            month,
            year,
            cashPayment: parseFloat(entry.cashPayment) || 0,
            bankPayment: parseFloat(entry.bankPayment) || 0,
            paymentDate: today,
          };
        })
        .filter((e) => e.cashPayment > 0 || e.bankPayment > 0);

      await addPaymentsBulk.mutateAsync({ entries: paymentEntries });
      toast.success('Οι πληρωμές αποθηκεύτηκαν επιτυχώς');
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  if (empLoading || payLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <Skeleton className="h-48 w-full" />
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Μαζική Καταχώρηση Πληρωμών</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Εργαζόμενος</th>
                <th className="text-center px-4 py-2 font-medium text-green-600">Μετρητά (€)</th>
                <th className="text-center px-4 py-2 font-medium text-blue-600">Τράπεζα (€)</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const entry = entries[emp.id] ?? { cashPayment: '', bankPayment: '' };
                return (
                  <tr key={emp.id} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-4 py-2 font-medium">{emp.fullName}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.cashPayment}
                        onChange={(e) => handleChange(emp.id, 'cashPayment', e.target.value)}
                        className="w-28 text-center border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-green-500 mx-auto block"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.bankPayment}
                        onChange={(e) => handleChange(emp.id, 'bankPayment', e.target.value)}
                        className="w-28 text-center border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-blue-500 mx-auto block"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex justify-end border-t border-border">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Αποθήκευση...' : 'Αποθήκευση Πληρωμών'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
