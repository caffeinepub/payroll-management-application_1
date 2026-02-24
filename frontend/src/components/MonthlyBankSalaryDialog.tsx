import { useState } from 'react';
import { useSetMonthlyBankSalary } from '../hooks/useQueries';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface MonthlyBankSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: number;
  employeeName: string;
}

export default function MonthlyBankSalaryDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
}: MonthlyBankSalaryDialogProps) {
  const setMonthlyBankSalary = useSetMonthlyBankSalary();
  const currentDate = new Date();

  const [month, setMonth] = useState<string>((currentDate.getMonth() + 1).toString());
  const [year, setYear] = useState<string>(currentDate.getFullYear().toString());
  const [amount, setAmount] = useState<string>('');

  const monthNames = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
    'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
    'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
  ];

  const parseDecimal = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || !isFinite(parsed)) return null;
    return parsed;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseDecimal(amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      toast.error('Το ποσό πρέπει να είναι έγκυρος θετικός αριθμός');
      return;
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      toast.error('Μη έγκυρος μήνας');
      return;
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      toast.error('Μη έγκυρο έτος');
      return;
    }

    setMonthlyBankSalary.mutate(
      {
        employeeId,
        month: monthNum,
        year: yearNum,
        amount: parsedAmount,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setAmount('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Προσθήκη Μηνιαίου Μισθού Τράπεζας</DialogTitle>
          <DialogDescription>
            Προσθέστε μηνιαίο μισθό τράπεζας για τον {employeeName}. Μπορείτε να προσθέσετε πολλαπλές καταχωρήσεις για τον ίδιο μήνα.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Μήνας</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Επιλέξτε μήνα" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Έτος</Label>
              <Input
                id="year"
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="π.χ. 2024"
                disabled={setMonthlyBankSalary.isPending}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Ποσό (€)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="π.χ. 985.86 ή 985,86"
              disabled={setMonthlyBankSalary.isPending}
              required
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Σημείωση: Μπορείτε να προσθέσετε πολλαπλές καταχωρήσεις για τον ίδιο μήνα
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={setMonthlyBankSalary.isPending}
            >
              Ακύρωση
            </Button>
            <Button type="submit" disabled={setMonthlyBankSalary.isPending}>
              {setMonthlyBankSalary.isPending ? 'Αποθήκευση...' : 'Προσθήκη'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
