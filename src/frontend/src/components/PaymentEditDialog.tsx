import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import type { PaymentRecord } from '../backend';
import { cn } from '@/lib/utils';

interface PaymentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentRecord;
  onSave: (originalPaymentDate: string, updatedPayment: PaymentRecord) => void;
  isPending: boolean;
}

export default function PaymentEditDialog({ open, onOpenChange, payment, onSave, isPending }: PaymentEditDialogProps) {
  const [month, setMonth] = useState<number>(Number(payment.month));
  const [year, setYear] = useState<number>(Number(payment.year));
  const [cashPayment, setCashPayment] = useState<string>(payment.cashPayment.toFixed(2));
  const [bankPayment, setBankPayment] = useState<string>(payment.bankPayment.toFixed(2));
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [isPaymentDateOpen, setIsPaymentDateOpen] = useState(false);
  const [originalPaymentDate, setOriginalPaymentDate] = useState<string>('');

  useEffect(() => {
    if (open) {
      setMonth(Number(payment.month));
      setYear(Number(payment.year));
      setCashPayment(payment.cashPayment.toFixed(2));
      setBankPayment(payment.bankPayment.toFixed(2));
      
      // Store the original payment date for identifying the record to update
      setOriginalPaymentDate(payment.paymentDate);
      
      // Parse payment date from YYYY-MM-DD format (backend format)
      if (payment.paymentDate) {
        const parts = payment.paymentDate.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          setPaymentDate(new Date(year, month, day));
        } else {
          setPaymentDate(new Date());
        }
      } else {
        setPaymentDate(new Date());
      }
    }
  }, [open, payment]);

  const monthNames = [
    'Ιανουάριος',
    'Φεβρουάριος',
    'Μάρτιος',
    'Απρίλιος',
    'Μάιος',
    'Ιούνιος',
    'Ιούλιος',
    'Αύγουστος',
    'Σεπτέμβριος',
    'Οκτώβριος',
    'Νοέμβριος',
    'Δεκέμβριος',
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const parseDecimalInput = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSave = () => {
    const cashValue = parseDecimalInput(cashPayment);
    const bankValue = parseDecimalInput(bankPayment);

    if (cashValue === 0 && bankValue === 0) {
      return;
    }

    const dateStr = formatDateToYYYYMMDD(paymentDate);

    const updatedPayment: PaymentRecord = {
      employeeId: payment.employeeId,
      month: BigInt(month),
      year: BigInt(year),
      cashPayment: cashValue,
      bankPayment: bankValue,
      paymentDate: dateStr,
    };

    // Pass the original payment date to identify which record to update
    onSave(originalPaymentDate, updatedPayment);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Επεξεργασία Πληρωμής</DialogTitle>
          <DialogDescription>Τροποποιήστε τα στοιχεία της πληρωμής. Η υπάρχουσα εγγραφή θα ενημερωθεί.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-month">Μήνας</Label>
              <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
                <SelectTrigger id="edit-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-year">Έτος</Label>
              <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                <SelectTrigger id="edit-year">
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
          </div>

          <div className="space-y-2">
            <Label>Ημερομηνία Πληρωμής</Label>
            <Popover open={isPaymentDateOpen} onOpenChange={setIsPaymentDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !paymentDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, 'dd/MM/yyyy', { locale: el }) : 'Επιλέξτε ημερομηνία'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => {
                    if (date) {
                      setPaymentDate(date);
                      setIsPaymentDateOpen(false);
                    }
                  }}
                  initialFocus
                  locale={el}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cash">Πληρωμή Μετρητών (€)</Label>
            <Input
              id="edit-cash"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={cashPayment}
              onChange={(e) => setCashPayment(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-bank">Πληρωμή Τράπεζας (€)</Label>
            <Input
              id="edit-bank"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={bankPayment}
              onChange={(e) => setBankPayment(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

