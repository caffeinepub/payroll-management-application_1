import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Users } from 'lucide-react';
import BulkEntryTable from '../components/BulkEntryTable';
import DailyBulkEntryTable from '../components/DailyBulkEntryTable';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function CalendarPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ημερολόγιο Εργαζομένων</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Καταχώριση ωρών εργασίας και υπερωριών
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

      <Tabs defaultValue="bulk">
        <TabsList className="mb-4">
          <TabsTrigger value="bulk" className="gap-2">
            <Users className="w-4 h-4" />
            Μαζική Καταχώριση
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-2">
            <CalendarDays className="w-4 h-4" />
            Ημερήσια Μαζική Καταχώριση
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk">
          <BulkEntryTable month={selectedMonth} year={selectedYear} />
        </TabsContent>

        <TabsContent value="daily">
          <DailyBulkEntryTable month={selectedMonth} year={selectedYear} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
