import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Info } from 'lucide-react';
import type { PaymentRecord } from '../types';

interface PaymentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentRecord | null;
  onSave: (data: PaymentRecord, originalDate: string) => void;
  isPending?: boolean;
}

export default function PaymentEditDialog({
  open,
  onOpenChange,
  payment,
  onSave,
  isPending = false,
}: PaymentEditDialogProps) {
  const [cashPayment, setCashPayment] = useState('');
  const [bankPayment, setBankPayment] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [originalDate, setOriginalDate] = useState('');

  useEffect(() => {
    if (open && payment) {
      setCashPayment(payment.cashPayment.toString());
      setBankPayment(payment.bankPayment.toString());
      setPaymentDate(payment.paymentDate);
      setOriginalDate(payment.paymentDate);
    }
  }, [open, payment]);

  const handleSave = () => {
    if (!payment) return;
    onSave(
      {
        ...payment,
        cashPayment: parseFloat(cashPayment) || 0,
        bankPayment: parseFloat(bankPayment) || 0,
        paymentDate,
      },
      originalDate
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Επεξεργασία Πληρωμής</DialogTitle>
          <DialogDescription>
            Επεξεργασία υπάρχουσας εγγραφής πληρωμής
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 flex gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Η αλλαγή θα ενημερώσει την υπάρχουσα εγγραφή.</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="paymentDate">Ημερομηνία Πληρωμής</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cashPayment">Μετρητά (€)</Label>
            <Input
              id="cashPayment"
              type="number"
              step="0.01"
              min="0"
              value={cashPayment}
              onChange={(e) => setCashPayment(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="bankPayment">Τράπεζα (€)</Label>
            <Input
              id="bankPayment"
              type="number"
              step="0.01"
              min="0"
              value={bankPayment}
              onChange={(e) => setBankPayment(e.target.value)}
              placeholder="0.00"
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
