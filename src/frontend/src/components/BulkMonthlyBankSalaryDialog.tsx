import { useState } from 'react';
import { useGetAllEmployees, useSetMonthlyBankSalariesBulk } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface BulkMonthlyBankSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkMonthlyBankSalaryDialog({
  open,
  onOpenChange,
}: BulkMonthlyBankSalaryDialogProps) {
  const { data: employees = [], isLoading: employeesLoading } = useGetAllEmployees();
  const setMonthlyBankSalariesBulk = useSetMonthlyBankSalariesBulk();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentDate.getFullYear().toString());
  const [salaryValues, setSalaryValues] = useState<Record<string, string>>({});

  const months = [
    { value: '1', label: 'Ιανουάριος' },
    { value: '2', label: 'Φεβρουάριος' },
    { value: '3', label: 'Μάρτιος' },
    { value: '4', label: 'Απρίλιος' },
    { value: '5', label: 'Μάιος' },
    { value: '6', label: 'Ιούνιος' },
    { value: '7', label: 'Ιούλιος' },
    { value: '8', label: 'Αύγουστος' },
    { value: '9', label: 'Σεπτέμβριος' },
    { value: '10', label: 'Οκτώβριος' },
    { value: '11', label: 'Νοέμβριος' },
    { value: '12', label: 'Δεκέμβριος' },
  ];

  const years = Array.from({ length: 10 }, (_, i) => {
    const year = currentDate.getFullYear() - 2 + i;
    return { value: year.toString(), label: year.toString() };
  });

  const handleSalaryChange = (employeeId: string, value: string) => {
    setSalaryValues((prev) => ({
      ...prev,
      [employeeId]: value,
    }));
  };

  const parseDecimal = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSaveAll = async () => {
    try {
      const month = BigInt(selectedMonth);
      const year = BigInt(selectedYear);

      // Prepare bulk data - only include employees with entered values
      const bulkData: Array<[bigint, bigint, bigint, number]> = [];

      for (const employee of employees) {
        const salaryStr = salaryValues[employee.id.toString()];
        if (salaryStr && salaryStr.trim() !== '') {
          const amount = parseDecimal(salaryStr);
          if (amount > 0) {
            bulkData.push([employee.id, month, year, amount]);
          }
        }
      }

      if (bulkData.length === 0) {
        toast.error('Παρακαλώ εισάγετε τουλάχιστον έναν μισθό', {
          duration: 3000,
        });
        return;
      }

      await setMonthlyBankSalariesBulk.mutateAsync(bulkData);

      // Reset form and close dialog
      setSalaryValues({});
      onOpenChange(false);
    } catch (error: any) {
      // Error is already handled by the mutation
      console.error('Error saving bulk bank salaries:', error);
    }
  };

  const handleCancel = () => {
    setSalaryValues({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Μαζική Προσθήκη Μηνιαίων Μισθών Τράπεζας</DialogTitle>
          <DialogDescription>
            Προσθέστε μηνιαίο μισθό τράπεζας για όλους τους εργαζομένους για τον επιλεγμένο μήνα. Μπορείτε να χρησιμοποιήσετε αυτή τη λειτουργία πολλές φορές για τον ίδιο μήνα - το σύστημα θα αθροίσει αυτόματα όλες τις καταχωρήσεις στη μισθοδοσία.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Μήνας</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Επιλέξτε μήνα" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Έτος</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Επιλέξτε έτος" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {employeesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Δεν υπάρχουν εργαζόμενοι
            </div>
          ) : (
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
                  {employees.map((employee) => (
                    <TableRow key={employee.id.toString()}>
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
                          value={salaryValues[employee.id.toString()] || ''}
                          onChange={(e) => handleSalaryChange(employee.id.toString(), e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={setMonthlyBankSalariesBulk.isPending}
          >
            Ακύρωση
          </Button>
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
                Προσθήκη Όλων
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
