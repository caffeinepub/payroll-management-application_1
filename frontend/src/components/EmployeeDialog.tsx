import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddEmployee, useUpdateEmployee } from '../hooks/useQueries';
import type { Employee } from '../types';
import { toast } from 'sonner';

interface EmployeeDialogProps {
  open: boolean;
  employee?: Employee | null;
  onClose: () => void;
}

export default function EmployeeDialog({ open, employee, onClose }: EmployeeDialogProps) {
  const isEdit = !!employee;
  const addEmployee = useAddEmployee();
  const updateEmployee = useUpdateEmployee();

  const [form, setForm] = useState({
    fullName: '',
    employeeType: 'monthly',
    hourlyRate: '',
    overtimeRate: '',
    fixedMonthlySalary: '',
    totalAnnualLeaveDays: '0',
    email: '',
    phone: '',
    bankIban: '',
  });

  useEffect(() => {
    if (employee) {
      setForm({
        fullName: employee.fullName,
        employeeType: employee.employeeType,
        hourlyRate: employee.hourlyRate.toString(),
        overtimeRate: employee.overtimeRate.toString(),
        fixedMonthlySalary: employee.fixedMonthlySalary?.toString() ?? '',
        totalAnnualLeaveDays: employee.totalAnnualLeaveDays.toString(),
        email: employee.email ?? '',
        phone: employee.phone ?? '',
        bankIban: employee.bankIban ?? '',
      });
    } else {
      setForm({
        fullName: '',
        employeeType: 'monthly',
        hourlyRate: '',
        overtimeRate: '',
        fixedMonthlySalary: '',
        totalAnnualLeaveDays: '0',
        email: '',
        phone: '',
        bankIban: '',
      });
    }
  }, [employee, open]);

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      toast.error('Το όνομα είναι υποχρεωτικό');
      return;
    }
    if (form.employeeType === 'monthly' && !form.fixedMonthlySalary) {
      toast.error('Ο μηνιαίος μισθός είναι υποχρεωτικός');
      return;
    }
    if (form.employeeType === 'hourly' && !form.hourlyRate) {
      toast.error('Η ωριαία αμοιβή είναι υποχρεωτική');
      return;
    }
    if (!form.overtimeRate) {
      toast.error('Η αμοιβή υπερωρίας είναι υποχρεωτική');
      return;
    }

    try {
      if (isEdit && employee) {
        await updateEmployee.mutateAsync({
          id: employee.id,
          fullName: form.fullName.trim(),
          employeeType: form.employeeType,
          hourlyRate: parseFloat(form.hourlyRate) || 0,
          overtimeRate: parseFloat(form.overtimeRate) || 0,
          fixedMonthlySalary: form.fixedMonthlySalary ? parseFloat(form.fixedMonthlySalary) : undefined,
          totalAnnualLeaveDays: parseInt(form.totalAnnualLeaveDays) || 0,
          email: form.email || undefined,
          phone: form.phone || undefined,
          bankIban: form.bankIban || undefined,
        });
        toast.success('Ο υπάλληλος ενημερώθηκε');
      } else {
        await addEmployee.mutateAsync({
          fullName: form.fullName.trim(),
          employeeType: form.employeeType,
          hourlyRate: form.hourlyRate,
          overtimeRate: form.overtimeRate,
          fixedMonthlySalary: form.fixedMonthlySalary || undefined,
          totalAnnualLeaveDays: parseInt(form.totalAnnualLeaveDays) || 0,
          email: form.email || undefined,
          phone: form.phone || undefined,
          bankIban: form.bankIban || undefined,
        });
        toast.success('Ο υπάλληλος προστέθηκε');
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Σφάλμα κατά την αποθήκευση';
      toast.error(msg);
    }
  };

  const isPending = addEmployee.isPending || updateEmployee.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Επεξεργασία Υπαλλήλου' : 'Νέος Υπάλληλος'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Τύπος Εργαζομένου</Label>
            <Select value={form.employeeType} onValueChange={v => setForm(f => ({ ...f, employeeType: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Μηνιαίος</SelectItem>
                <SelectItem value="hourly">Ωρομίσθιος</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ονοματεπώνυμο *</Label>
            <Input
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder="Εισάγετε ονοματεπώνυμο"
            />
          </div>

          {form.employeeType === 'monthly' && (
            <div className="space-y-2">
              <Label>Μηνιαίος Μισθός (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.fixedMonthlySalary}
                onChange={e => setForm(f => ({ ...f, fixedMonthlySalary: e.target.value }))}
                placeholder="π.χ. 1200.00"
              />
            </div>
          )}

          {form.employeeType === 'hourly' && (
            <div className="space-y-2">
              <Label>Ωριαία Αμοιβή (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.hourlyRate}
                onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                placeholder="π.χ. 8.50"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Αμοιβή Υπερωρίας (€/ώρα) *</Label>
            <Input
              type="number"
              step="0.01"
              value={form.overtimeRate}
              onChange={e => setForm(f => ({ ...f, overtimeRate: e.target.value }))}
              placeholder="π.χ. 12.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Ετήσιες Ημέρες Άδειας</Label>
            <Input
              type="number"
              value={form.totalAnnualLeaveDays}
              onChange={e => setForm(f => ({ ...f, totalAnnualLeaveDays: e.target.value }))}
              placeholder="π.χ. 20"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Τηλέφωνο</Label>
            <Input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="π.χ. 6912345678"
            />
          </div>

          <div className="space-y-2">
            <Label>IBAN Τράπεζας</Label>
            <Input
              value={form.bankIban}
              onChange={e => setForm(f => ({ ...f, bankIban: e.target.value }))}
              placeholder="GR..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
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
