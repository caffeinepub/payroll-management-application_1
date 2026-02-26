import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetEmployees, useAddPayment, useUpdatePayment, PaymentRecord } from '../hooks/useQueries';

const MONTHS = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

interface PaymentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: PaymentRecord;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export default function PaymentEditDialog({ open, onOpenChange, payment }: PaymentEditDialogProps) {
  const now = new Date();
  const [employeeId, setEmployeeId] = useState<string>('');
  const [cashPayment, setCashPayment] = useState('');
  const [bankPayment, setBankPayment] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [paymentDate, setPaymentDate] = useState(todayStr());

  const { data: employees = [] } = useGetEmployees();
  const addPayment = useAddPayment();
  const updatePayment = useUpdatePayment();

  const isLoading = addPayment.isPending || updatePayment.isPending;
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  useEffect(() => {
    if (open) {
      if (payment) {
        setEmployeeId(payment.employeeId.toString());
        setCashPayment(payment.cashPayment.toString());
        setBankPayment(payment.bankPayment.toString());
        setMonth(payment.month);
        setYear(payment.year);
        setPaymentDate(payment.paymentDate);
      } else {
        setEmployeeId('');
        setCashPayment('');
        setBankPayment('');
        setMonth(now.getMonth() + 1);
        setYear(now.getFullYear());
        setPaymentDate(todayStr());
      }
    }
  }, [open, payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error('Επιλέξτε εργαζόμενο');
      return;
    }

    try {
      const data = {
        employeeId: parseInt(employeeId),
        cashPayment: parseFloat(cashPayment) || 0,
        bankPayment: parseFloat(bankPayment) || 0,
        month,
        year,
        paymentDate,
      };

      if (payment) {
        await updatePayment.mutateAsync({ ...data, id: payment.id });
        toast.success('Η πληρωμή ενημερώθηκε');
      } else {
        await addPayment.mutateAsync(data);
        toast.success('Η πληρωμή καταχωρήθηκε');
      }
      onOpenChange(false);
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{payment ? 'Επεξεργασία Πληρωμής' : 'Νέα Πληρωμή'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Εργαζόμενος *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε εργαζόμενο" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={Number(emp.id)} value={Number(emp.id).toString()}>
                    {emp.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Μήνας</Label>
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
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
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cashPayment">Μετρητά (€)</Label>
            <Input
              id="cashPayment"
              type="number"
              min="0"
              step="0.01"
              value={cashPayment}
              onChange={(e) => setCashPayment(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankPayment">Τράπεζα (€)</Label>
            <Input
              id="bankPayment"
              type="number"
              min="0"
              step="0.01"
              value={bankPayment}
              onChange={(e) => setBankPayment(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Ημερομηνία Πληρωμής</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {payment ? 'Αποθήκευση' : 'Καταχώρηση'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
