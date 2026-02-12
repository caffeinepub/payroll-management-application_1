import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateMonthlyBankSalary } from '../hooks/useQueries';
import { Loader2 } from 'lucide-react';
import type { MonthlyBankSalary } from '../backend';

interface MonthlyBankSalaryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salary: MonthlyBankSalary;
  employeeName: string;
}

export default function MonthlyBankSalaryEditDialog({
  open,
  onOpenChange,
  salary,
  employeeName,
}: MonthlyBankSalaryEditDialogProps) {
  const [month, setMonth] = useState<string>(salary.month.toString());
  const [year, setYear] = useState<string>(salary.year.toString());
  const [amount, setAmount] = useState<string>(salary.amount.toString());

  const updateMutation = useUpdateMonthlyBankSalary();

  useEffect(() => {
    if (open) {
      setMonth(salary.month.toString());
      setYear(salary.year.toString());
      setAmount(salary.amount.toString());
    }
  }, [open, salary]);

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

  const currentDate = new Date();
  const years = Array.from({ length: 10 }, (_, i) => {
    const year = currentDate.getFullYear() - 2 + i;
    return { value: year.toString(), label: year.toString() };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: salary.id,
        employeeId: salary.employeeId,
        month: BigInt(month),
        year: BigInt(year),
        amount: parseFloat(amount),
      });

      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Επεξεργασία Μηνιαίου Μισθού Τράπεζας</DialogTitle>
          <DialogDescription>
            Επεξεργαστείτε τον μηνιαίο μισθό τράπεζας για τον εργαζόμενο: {employeeName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-month">Μήνας</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="edit-month">
                  <SelectValue placeholder="Επιλέξτε μήνα" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-year">Έτος</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="edit-year">
                  <SelectValue placeholder="Επιλέξτε έτος" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.value} value={y.value}>
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-amount">Ποσό (€)</Label>
            <Input
              id="edit-amount"
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="π.χ. 1200,50"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Ακύρωση
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Αποθήκευση
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

