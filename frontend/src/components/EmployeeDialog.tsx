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
import type { Employee } from '../types';

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSave: (data: {
    fullName: string;
    hourlyRate: string;
    overtimeRate: string;
    fixedMonthlySalary: string | null;
    totalAnnualLeaveDays: number | null;
    email: string | null;
    phone: string | null;
    bankIban: string | null;
    employeeType: string;
  }) => void;
  isPending?: boolean;
}

export default function EmployeeDialog({
  open,
  onOpenChange,
  employee,
  onSave,
  isPending = false,
}: EmployeeDialogProps) {
  const [fullName, setFullName] = useState('');
  const [employeeType, setEmployeeType] = useState<'monthly' | 'hourly'>('hourly');
  const [hourlyRate, setHourlyRate] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('');
  const [fixedMonthlySalary, setFixedMonthlySalary] = useState('');
  const [totalAnnualLeaveDays, setTotalAnnualLeaveDays] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (employee) {
        setFullName(employee.fullName);
        setEmployeeType(employee.employeeType as 'monthly' | 'hourly');
        setHourlyRate(employee.hourlyRate.toString());
        setOvertimeRate(employee.overtimeRate.toString());
        setFixedMonthlySalary(employee.fixedMonthlySalary?.toString() ?? '');
        setTotalAnnualLeaveDays(employee.totalAnnualLeaveDays.toString());
        setEmail(employee.email ?? '');
        setPhone(employee.phone ?? '');
        setBankIban(employee.bankIban ?? '');
      } else {
        setFullName('');
        setEmployeeType('hourly');
        setHourlyRate('');
        setOvertimeRate('');
        setFixedMonthlySalary('');
        setTotalAnnualLeaveDays('');
        setEmail('');
        setPhone('');
        setBankIban('');
      }
      setErrors({});
    }
  }, [open, employee]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Το όνομα είναι υποχρεωτικό';
    if (employeeType === 'hourly' && (!hourlyRate || parseFloat(hourlyRate) <= 0)) {
      newErrors.hourlyRate = 'Η ωριαία αμοιβή είναι υποχρεωτική';
    }
    if (!overtimeRate || parseFloat(overtimeRate) <= 0) {
      newErrors.overtimeRate = 'Η αμοιβή υπερωρίας είναι υποχρεωτική';
    }
    if (employeeType === 'monthly' && (!fixedMonthlySalary || parseFloat(fixedMonthlySalary) <= 0)) {
      newErrors.fixedMonthlySalary = 'Ο μηνιαίος μισθός είναι υποχρεωτικός';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      fullName: fullName.trim(),
      hourlyRate: hourlyRate || '0',
      overtimeRate,
      fixedMonthlySalary: employeeType === 'monthly' ? fixedMonthlySalary : null,
      totalAnnualLeaveDays: totalAnnualLeaveDays ? parseInt(totalAnnualLeaveDays) : null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      bankIban: bankIban.trim() || null,
      employeeType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? 'Επεξεργασία Εργαζομένου' : 'Νέος Εργαζόμενος'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1">
            <Label htmlFor="fullName">Ονοματεπώνυμο *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="π.χ. Γιώργος Παπαδόπουλος"
            />
            {errors.fullName && <p className="text-destructive text-xs">{errors.fullName}</p>}
          </div>

          {/* Employee Type */}
          <div className="space-y-1">
            <Label>Τύπος Εργαζομένου *</Label>
            <Select
              value={employeeType}
              onValueChange={(v) => setEmployeeType(v as 'monthly' | 'hourly')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Ωρομίσθιος</SelectItem>
                <SelectItem value="monthly">Μηνιαίος</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hourly Rate */}
          {employeeType === 'hourly' && (
            <div className="space-y-1">
              <Label htmlFor="hourlyRate">Ωριαία Αμοιβή (€) *</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="π.χ. 7.50"
              />
              {errors.hourlyRate && <p className="text-destructive text-xs">{errors.hourlyRate}</p>}
            </div>
          )}

          {/* Fixed Monthly Salary */}
          {employeeType === 'monthly' && (
            <div className="space-y-1">
              <Label htmlFor="fixedMonthlySalary">Μηνιαίος Μισθός (€) *</Label>
              <Input
                id="fixedMonthlySalary"
                type="number"
                step="0.01"
                min="0"
                value={fixedMonthlySalary}
                onChange={(e) => setFixedMonthlySalary(e.target.value)}
                placeholder="π.χ. 1200.00"
              />
              {errors.fixedMonthlySalary && (
                <p className="text-destructive text-xs">{errors.fixedMonthlySalary}</p>
              )}
            </div>
          )}

          {/* Overtime Rate */}
          <div className="space-y-1">
            <Label htmlFor="overtimeRate">Αμοιβή Υπερωρίας (€) *</Label>
            <Input
              id="overtimeRate"
              type="number"
              step="0.01"
              min="0"
              value={overtimeRate}
              onChange={(e) => setOvertimeRate(e.target.value)}
              placeholder="π.χ. 10.00"
            />
            {errors.overtimeRate && (
              <p className="text-destructive text-xs">{errors.overtimeRate}</p>
            )}
          </div>

          {/* Annual Leave Days */}
          <div className="space-y-1">
            <Label htmlFor="totalAnnualLeaveDays">Ετήσιες Άδειες (ημέρες)</Label>
            <Input
              id="totalAnnualLeaveDays"
              type="number"
              min="0"
              value={totalAnnualLeaveDays}
              onChange={(e) => setTotalAnnualLeaveDays(e.target.value)}
              placeholder="π.χ. 20"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="π.χ. example@email.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <Label htmlFor="phone">Τηλέφωνο</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="π.χ. 6912345678"
            />
          </div>

          {/* Bank IBAN */}
          <div className="space-y-1">
            <Label htmlFor="bankIban">IBAN Τράπεζας</Label>
            <Input
              id="bankIban"
              value={bankIban}
              onChange={(e) => setBankIban(e.target.value)}
              placeholder="π.χ. GR1601101250000000012300695"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {employee ? 'Αποθήκευση' : 'Προσθήκη'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
