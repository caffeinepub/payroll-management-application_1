import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BulkPaymentEntryTable from '../components/BulkPaymentEntryTable';
import PaymentEditDialog from '../components/PaymentEditDialog';
import { useGetPayments, useGetEmployees, PaymentRecord } from '../hooks/useQueries';
import type { Employee } from '../backend';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

export default function PaymentsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Πληρωμές</h1>
          <p className="text-muted-foreground text-sm mt-1">Διαχείριση πληρωμών σε μετρητά και τράπεζα</p>
        </div>
        <Button onClick={() => setAddPaymentOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Νέα Πληρωμή
        </Button>
      </div>

      <Tabs defaultValue="bulk">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="bulk">Μαζική Καταχώρηση</TabsTrigger>
          <TabsTrigger value="monthly">Μηνιαία Προβολή</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="mt-4">
          <BulkPaymentEntryTable />
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <div className="flex gap-3 mb-4 flex-wrap">
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
          </div>
          <MonthlyPaymentsView month={month} year={year} />
        </TabsContent>
      </Tabs>

      <PaymentEditDialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen} />
    </div>
  );
}

function MonthlyPaymentsView({ month, year }: { month: number; year: number }) {
  // useGetPayments(month, year) — no employeeId means all employees
  const { data: payments = [] } = useGetPayments(month, year);
  const { data: employees = [] } = useGetEmployees();

  const employeeMap = new Map<number, string>(
    employees.map((e: Employee) => [Number(e.id), e.fullName])
  );

  if (payments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Δεν υπάρχουν πληρωμές για αυτόν τον μήνα.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="border border-border px-4 py-2 text-left">Εργαζόμενος</th>
            <th className="border border-border px-4 py-2 text-right">Μετρητά (€)</th>
            <th className="border border-border px-4 py-2 text-right">Τράπεζα (€)</th>
            <th className="border border-border px-4 py-2 text-right">Σύνολο (€)</th>
            <th className="border border-border px-4 py-2 text-center">Ημερομηνία</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p: PaymentRecord) => (
            <tr key={p.id} className="hover:bg-muted/30">
              <td className="border border-border px-4 py-2">
                {employeeMap.get(p.employeeId) ?? `Εργαζόμενος #${p.employeeId}`}
              </td>
              <td className="border border-border px-4 py-2 text-right">{p.cashPayment.toFixed(2)}</td>
              <td className="border border-border px-4 py-2 text-right">{p.bankPayment.toFixed(2)}</td>
              <td className="border border-border px-4 py-2 text-right font-medium">
                {(p.cashPayment + p.bankPayment).toFixed(2)}
              </td>
              <td className="border border-border px-4 py-2 text-center">{p.paymentDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
