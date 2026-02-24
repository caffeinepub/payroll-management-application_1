import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { useGetAllEmployees, useAddPaymentsBulk } from '../hooks/useQueries';
import type { Employee, PaymentRecord } from '../types';

interface BulkPaymentEntryTableProps {
  selectedDate: string;
  selectedMonth: number;
  selectedYear: number;
}

export default function BulkPaymentEntryTable({
  selectedDate,
  selectedMonth,
  selectedYear,
}: BulkPaymentEntryTableProps) {
  const { data: employees = [] } = useGetAllEmployees();
  const addPaymentsBulk = useAddPaymentsBulk();

  const [cashValues, setCashValues] = useState<Record<number, string>>({});
  const [bankValues, setBankValues] = useState<Record<number, string>>({});

  const handleSave = async () => {
    const payments: PaymentRecord[] = employees
      .filter((emp: Employee) => {
        const cash = parseFloat(cashValues[emp.id] || '0') || 0;
        const bank = parseFloat(bankValues[emp.id] || '0') || 0;
        return cash > 0 || bank > 0;
      })
      .map((emp: Employee) => ({
        employeeId: emp.id,
        month: selectedMonth,
        year: selectedYear,
        cashPayment: parseFloat(cashValues[emp.id] || '0') || 0,
        bankPayment: parseFloat(bankValues[emp.id] || '0') || 0,
        paymentDate: selectedDate,
      }));

    if (payments.length === 0) return;
    await addPaymentsBulk.mutateAsync(payments);

    // Reset values
    setCashValues({});
    setBankValues({});
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Δεν υπάρχουν εργαζόμενοι
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-medium">Εργαζόμενος</th>
              <th className="text-left py-2 pr-4 font-medium">Μετρητά (€)</th>
              <th className="text-left py-2 font-medium">Τράπεζα (€)</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: Employee) => (
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
                    step="0.01"
                    min="0"
                    className="w-28"
                    placeholder="0.00"
                    value={cashValues[emp.id] ?? ''}
                    onChange={(e) =>
                      setCashValues((prev) => ({ ...prev, [emp.id]: e.target.value }))
                    }
                  />
                </td>
                <td className="py-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-28"
                    placeholder="0.00"
                    value={bankValues[emp.id] ?? ''}
                    onChange={(e) =>
                      setBankValues((prev) => ({ ...prev, [emp.id]: e.target.value }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        onClick={handleSave}
        disabled={addPaymentsBulk.isPending}
        className="w-full"
      >
        {addPaymentsBulk.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Αποθήκευση Πληρωμών
      </Button>
    </div>
  );
}
