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
import type { Employee } from '../backend';
import { useAddEmployee, useUpdateEmployee } from '../hooks/useQueries';

export interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an Employee object to edit, or null/undefined to add a new one */
  employee?: Employee | null;
  /** @deprecated use employee prop instead */
  mode?: 'add' | 'edit';
}

export default function EmployeeDialog({ open, onOpenChange, employee, mode }: EmployeeDialogProps) {
  const isEdit = !!(employee ?? (mode === 'edit'));

  const [fullName, setFullName] = useState('');
  const [employeeType, setEmployeeType] = useState<'monthly' | 'hourly'>('monthly');
  const [hourlyRate, setHourlyRate] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('');
  const [fixedMonthlySalary, setFixedMonthlySalary] = useState('');
  const [totalAnnualLeaveDays, setTotalAnnualLeaveDays] = useState('0');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankIban, setBankIban] = useState('');

  const addEmployee = useAddEmployee();
  const updateEmployee = useUpdateEmployee();

  const isLoading = addEmployee.isPending || updateEmployee.isPending;

  useEffect(() => {
    if (open) {
      if (employee) {
        setFullName(employee.fullName);
        setEmployeeType(employee.employeeType as 'monthly' | 'hourly');
        setHourlyRate(employee.hourlyRate.toString());
        setOvertimeRate(employee.overtimeRate.toString());
        setFixedMonthlySalary(employee.fixedMonthlySalary?.toString() ?? '');
        setTotalAnnualLeaveDays(Number(employee.totalAnnualLeaveDays).toString());
        setEmail(employee.email ?? '');
        setPhone(employee.phone ?? '');
        setBankIban(employee.bankIban ?? '');
      } else {
        setFullName('');
        setEmployeeType('monthly');
        setHourlyRate('');
        setOvertimeRate('');
        setFixedMonthlySalary('');
        setTotalAnnualLeaveDays('0');
        setEmail('');
        setPhone('');
        setBankIban('');
      }
    }
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Το όνομα είναι υποχρεωτικό');
      return;
    }
    if (!overtimeRate || parseFloat(overtimeRate) <= 0) {
      toast.error('Η αμοιβή υπερωρίας είναι υποχρεωτική');
      return;
    }
    if (employeeType === 'monthly' && (!fixedMonthlySalary || parseFloat(fixedMonthlySalary) <= 0)) {
      toast.error('Ο μηνιαίος μισθός είναι υποχρεωτικός');
      return;
    }
    if (employeeType === 'hourly' && (!hourlyRate || parseFloat(hourlyRate) <= 0)) {
      toast.error('Η ωριαία αμοιβή είναι υποχρεωτική');
      return;
    }

    try {
      if (employee) {
        // Edit mode
        await updateEmployee.mutateAsync({
          id: Number(employee.id),
          fullName: fullName.trim(),
          hourlyRate: hourlyRate || '0',
          overtimeRate,
          fixedMonthlySalary: employeeType === 'monthly' ? fixedMonthlySalary : undefined,
          totalAnnualLeaveDays: parseInt(totalAnnualLeaveDays) || 0,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          bankIban: bankIban.trim() || undefined,
          employeeType,
        });
        toast.success('Ο εργαζόμενος ενημερώθηκε επιτυχώς');
      } else {
        // Add mode
        await addEmployee.mutateAsync({
          fullName: fullName.trim(),
          hourlyRate: hourlyRate || '0',
          overtimeRate,
          fixedMonthlySalary: employeeType === 'monthly' ? fixedMonthlySalary : undefined,
          totalAnnualLeaveDays: parseInt(totalAnnualLeaveDays) || 0,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          bankIban: bankIban.trim() || undefined,
          employeeType,
        });
        toast.success('Ο εργαζόμενος προστέθηκε επιτυχώς');
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Σφάλμα κατά την αποθήκευση';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Επεξεργασία Εργαζομένου' : 'Προσθήκη Εργαζομένου'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Ονοματεπώνυμο *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="π.χ. Γιώργος Παπαδόπουλος"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Τύπος Εργαζομένου *</Label>
            <Select value={employeeType} onValueChange={(v) => setEmployeeType(v as 'monthly' | 'hourly')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Μηνιαίος Μισθός</SelectItem>
                <SelectItem value="hourly">Ωρομίσθιος</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {employeeType === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="fixedMonthlySalary">Μηνιαίος Μισθός (€) *</Label>
              <Input
                id="fixedMonthlySalary"
                type="number"
                min="0"
                step="0.01"
                value={fixedMonthlySalary}
                onChange={(e) => setFixedMonthlySalary(e.target.value)}
                placeholder="π.χ. 1500.00"
              />
            </div>
          )}

          {employeeType === 'hourly' && (
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Ωριαία Αμοιβή (€) *</Label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="π.χ. 8.00"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="overtimeRate">Αμοιβή Υπερωρίας (€/ώρα) *</Label>
            <Input
              id="overtimeRate"
              type="number"
              min="0"
              step="0.01"
              value={overtimeRate}
              onChange={(e) => setOvertimeRate(e.target.value)}
              placeholder="π.χ. 12.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalAnnualLeaveDays">Ετήσιες Ημέρες Άδειας</Label>
            <Input
              id="totalAnnualLeaveDays"
              type="number"
              min="0"
              value={totalAnnualLeaveDays}
              onChange={(e) => setTotalAnnualLeaveDays(e.target.value)}
              placeholder="π.χ. 20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Τηλέφωνο</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="π.χ. 6912345678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankIban">IBAN Τράπεζας</Label>
            <Input
              id="bankIban"
              value={bankIban}
              onChange={(e) => setBankIban(e.target.value)}
              placeholder="π.χ. GR1601101250000000012300695"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Αποθήκευση' : 'Προσθήκη'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
