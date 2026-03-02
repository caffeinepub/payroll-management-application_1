import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetEmployees, useAddPayment } from '../hooks/useQueries';
import type { PaymentRecord } from '../types';
import { toast } from 'sonner';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

interface PaymentEditDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function PaymentEditDialog({ open, onClose }: PaymentEditDialogProps) {
  const now = new Date();
  const { data: employees = [] } = useGetEmployees();
  const addPayment = useAddPayment();

  const [form, setForm] = useState({
    employeeId: '',
    month: (now.getMonth() + 1).toString(),
    year: now.getFullYear().toString(),
    cashPayment: '0',
    bankPayment: '0',
    paymentDate: now.toISOString().split('T')[0],
  });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const handleSave = async () => {
    if (!form.employeeId) {
      toast.error('Επιλέξτε εργαζόμενο');
      return;
    }

    const record: PaymentRecord = {
      employeeId: parseInt(form.employeeId),
      month: parseInt(form.month),
      year: parseInt(form.year),
      cashPayment: parseFloat(form.cashPayment) || 0,
      bankPayment: parseFloat(form.bankPayment) || 0,
      paymentDate: form.paymentDate,
    };

    try {
      await addPayment.mutateAsync(record);
      toast.success('Η πληρωμή καταχωρήθηκε');
      onClose();
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Νέα Πληρωμή</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Εργαζόμενος</Label>
            <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε εργαζόμενο" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Μήνας</Label>
              <Select value={form.month} onValueChange={v => setForm(f => ({ ...f, month: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Έτος</Label>
              <Select value={form.year} onValueChange={v => setForm(f => ({ ...f, year: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Μετρητά (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cashPayment}
                onChange={e => setForm(f => ({ ...f, cashPayment: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Τράπεζα (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.bankPayment}
                onChange={e => setForm(f => ({ ...f, bankPayment: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ημερομηνία Πληρωμής</Label>
            <Input
              type="date"
              value={form.paymentDate}
              onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={addPayment.isPending}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={addPayment.isPending}>
            {addPayment.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
