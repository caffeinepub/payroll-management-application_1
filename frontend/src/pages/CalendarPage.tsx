import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BulkEntryTable from '../components/BulkEntryTable';
import DailyBulkEntryTable from '../components/DailyBulkEntryTable';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

export default function CalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ημερολόγιο Ωρών</h1>
        <p className="text-muted-foreground text-sm mt-1">Καταχώρηση ωρών εργασίας ανά εργαζόμενο</p>
      </div>

      <Tabs defaultValue="bulk-monthly">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="bulk-monthly">Μηνιαία Καταχώρηση</TabsTrigger>
          <TabsTrigger value="daily">Ημερήσια Καταχώρηση</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk-monthly" className="mt-4">
          {/* Month/Year Selectors */}
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
          <BulkEntryTable month={month} year={year} />
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <DailyBulkEntryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
