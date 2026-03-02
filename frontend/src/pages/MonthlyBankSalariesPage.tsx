import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetEmployees } from '../hooks/useQueries';
import BulkMonthlyBankSalaryDialog from '../components/BulkMonthlyBankSalaryDialog';
import MonthlyBankSalaryManager from '../components/MonthlyBankSalaryManager';
import MonthlyBankSalariesView from '../components/MonthlyBankSalariesView';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

export default function MonthlyBankSalariesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: employees = [] } = useGetEmployees();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Μηνιαίοι Τραπεζικοί Μισθοί</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Καταχώρηση τραπεζικών μισθών ανά μήνα
        </p>
      </div>

      {/* Month/Year selectors */}
      <div className="flex gap-3 flex-wrap">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
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

        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="bulk">
        <TabsList>
          <TabsTrigger value="bulk">Μαζική Καταχώρηση</TabsTrigger>
          <TabsTrigger value="individual">Ατομική Καταχώρηση</TabsTrigger>
          <TabsTrigger value="view">Προβολή</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk">
          <BulkMonthlyBankSalaryDialog
            month={month}
            year={year}
            inline
            onClose={() => {}}
          />
        </TabsContent>

        <TabsContent value="individual" className="space-y-4 mt-4">
          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Δεν υπάρχουν εργαζόμενοι
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((employee) => (
                <MonthlyBankSalaryManager
                  key={Number(employee.id)}
                  employeeId={Number(employee.id)}
                  employeeName={employee.fullName}
                  month={month}
                  year={year}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="view" className="mt-4">
          <MonthlyBankSalariesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
