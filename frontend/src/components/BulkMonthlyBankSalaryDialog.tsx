import { useState } from 'react';
import { useGetEmployees, useSetMonthlyBankSalariesBulk } from '../hooks/useQueries';
import type { MonthlyBankSalary } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface BulkMonthlyBankSalaryDialogProps {
  month: number;
  year: number;
  inline?: boolean;
  onClose?: () => void;
}

export default function BulkMonthlyBankSalaryDialog({
  month,
  year,
  inline,
  onClose,
}: BulkMonthlyBankSalaryDialogProps) {
  const { data: employees = [], isLoading: employeesLoading } = useGetEmployees();
  const setMonthlyBankSalariesBulk = useSetMonthlyBankSalariesBulk();

  const [salaryValues, setSalaryValues] = useState<Record<string, string>>({});

  // suppress unused warning for inline prop
  void inline;

  const handleSalaryChange = (employeeId: string, value: string) => {
    setSalaryValues((prev) => ({ ...prev, [employeeId]: value }));
  };

  const parseDecimal = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSaveAll = async () => {
    const entries: { employeeId: number; month: number; year: number; amount: number }[] = [];

    for (const employee of employees) {
      const empId = Number(employee.id);
      const salaryStr = salaryValues[empId.toString()];
      if (salaryStr && salaryStr.trim() !== '') {
        const amount = parseDecimal(salaryStr);
        if (amount > 0) {
          entries.push({ employeeId: empId, month, year, amount });
        }
      }
    }

    if (entries.length === 0) {
      toast.error('Παρακαλώ εισάγετε τουλάχιστον έναν μισθό');
      return;
    }

    try {
      await setMonthlyBankSalariesBulk.mutateAsync(entries);
      toast.success('Οι μισθοί αποθηκεύτηκαν επιτυχώς');
      setSalaryValues({});
      if (onClose) onClose();
    } catch (error: unknown) {
      console.error('Error saving bulk bank salaries:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Δεν υπάρχουν εργαζόμενοι
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Όνομα Εργαζομένου</TableHead>
              <TableHead className="w-[25%]">Τύπος</TableHead>
              <TableHead className="w-[25%]">Μηνιαίος Μισθός Τράπεζας (€)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const empId = Number(employee.id);
              return (
                <TableRow key={empId}>
                  <TableCell className="font-medium">{employee.fullName}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted">
                      {employee.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωριαίος'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={salaryValues[empId.toString()] || ''}
                      onChange={(e) => handleSalaryChange(empId.toString(), e.target.value)}
                      className="w-full"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2 justify-end">
        {onClose && (
          <Button
            variant="outline"
            onClick={onClose}
            disabled={setMonthlyBankSalariesBulk.isPending}
          >
            Ακύρωση
          </Button>
        )}
        <Button
          onClick={handleSaveAll}
          disabled={setMonthlyBankSalariesBulk.isPending || employees.length === 0}
          className="gap-2"
        >
          {setMonthlyBankSalariesBulk.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Αποθήκευση...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Αποθήκευση Όλων
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
