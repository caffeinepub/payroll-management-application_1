import React, { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import type { MonthlyBankSalary } from '../types';

interface MonthlyBankSalaryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salary: MonthlyBankSalary | null;
  onSave: (data: { id: number; employeeId: number; month: number; year: number; amount: number }) => void;
  isPending?: boolean;
}

const MONTHS = [
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

export default function MonthlyBankSalaryEditDialog({
  open,
  onOpenChange,
  salary,
  onSave,
  isPending = false,
}: MonthlyBankSalaryEditDialogProps) {
  const [month, setMonth] = useState('1');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (open && salary) {
      setMonth(salary.month.toString());
      setYear(salary.year.toString());
      setAmount(salary.amount.toString());
    }
  }, [open, salary]);

  const handleSave = () => {
    if (!salary) return;
    onSave({
      id: salary.id,
      employeeId: salary.employeeId,
      month: parseInt(month),
      year: parseInt(year),
      amount: parseFloat(amount) || 0,
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Επεξεργασία Μισθού Τράπεζας</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Μήνας</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Έτος</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="amount">Ποσό (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="π.χ. 1200.00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Αποθήκευση
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
