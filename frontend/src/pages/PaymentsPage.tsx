import React, { useState } from 'react';
import { useGetEmployees, useGetPayments } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Building2 } from 'lucide-react';
import BulkPaymentEntryTable from '../components/BulkPaymentEntryTable';
import MonthlyPaymentsView from '../components/MonthlyPaymentsView';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function PaymentsPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: payments = [] } = useGetPayments(undefined, selectedMonth, selectedYear);

  const totalCash = payments.reduce((sum, p) => sum + p.cashPayment, 0);
  const totalBank = payments.reduce((sum, p) => sum + p.bankPayment, 0);

  const fmt = (n: number) =>
    n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Πληρωμές</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Καταχώρηση και παρακολούθηση πληρωμών
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(Number(v))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Σύνολο Μετρητά</span>
            </div>
            <p className="text-xl font-bold text-foreground">{fmt(totalCash)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Σύνολο Τράπεζα</span>
            </div>
            <p className="text-xl font-bold text-foreground">{fmt(totalBank)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bulk">
        <TabsList className="mb-4">
          <TabsTrigger value="bulk">Μαζική Καταχώρηση</TabsTrigger>
          <TabsTrigger value="view">Προβολή Πληρωμών</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk">
          <BulkPaymentEntryTable month={selectedMonth} year={selectedYear} />
        </TabsContent>

        <TabsContent value="view">
          <MonthlyPaymentsView month={selectedMonth} year={selectedYear} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
