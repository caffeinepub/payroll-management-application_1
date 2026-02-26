import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetEmployees, useSetMonthlyBankSalary } from '../hooks/useQueries';
import { toast } from 'sonner';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

interface MonthlyBankSalaryDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function MonthlyBankSalaryDialog({ open, onClose }: MonthlyBankSalaryDialogProps) {
  const { data: employees = [] } = useGetEmployees();
  const setMonthlyBankSalary = useSetMonthlyBankSalary();

  const now = new Date();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(0);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState('');

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const handleSubmit = async () => {
    if (!selectedEmployeeId || !amount) return;

    try {
      await setMonthlyBankSalary.mutateAsync({
        employeeId: selectedEmployeeId,
        month,
        year,
        amount: parseFloat(amount.replace(',', '.')),
      });
      toast.success('Ο μισθός αποθηκεύτηκε');
      onClose();
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Καταχώρηση Τραπεζικού Μισθού</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Εργαζόμενος</Label>
            <Select
              value={String(selectedEmployeeId)}
              onValueChange={(v) => setSelectedEmployeeId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε εργαζόμενο" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={Number(e.id)} value={String(Number(e.id))}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Μήνας</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label>Έτος</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger>
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Ποσό (€)</Label>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Ακύρωση
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={setMonthlyBankSalary.isPending || !selectedEmployeeId || !amount}
          >
            {setMonthlyBankSalary.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Αποθήκευση
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
