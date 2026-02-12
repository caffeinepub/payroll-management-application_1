import { useEffect, useState } from 'react';
import { useAddEmployee, useUpdateEmployee } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Employee } from '../backend';
import { toast } from 'sonner';

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

/**
 * Parse decimal value supporting both comma and dot separators
 * Returns null if invalid
 */
function parseDecimalValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  // Replace comma with dot for parsing
  const normalized = trimmed.replace(/,/g, '.');
  
  // Validate format (allow decimals and optional negative sign)
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  
  const parsed = parseFloat(normalized);
  if (isNaN(parsed) || !isFinite(parsed)) return null;
  
  return parsed;
}

/**
 * Format number for display
 */
function formatDecimalForDisplay(value: number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return value.toString();
}

export default function EmployeeDialog({ open, onOpenChange, employee }: EmployeeDialogProps) {
  const { actor, isFetching: actorFetching } = useActor();
  const addEmployee = useAddEmployee();
  const updateEmployee = useUpdateEmployee();
  const isEditing = !!employee;

  // Form state
  const [fullName, setFullName] = useState('');
  const [employeeType, setEmployeeType] = useState<'monthly' | 'hourly'>('hourly');
  const [hourlyRate, setHourlyRate] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('');
  const [totalAnnualLeaveDays, setTotalAnnualLeaveDays] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankIban, setBankIban] = useState('');

  // Reset form when dialog opens/closes or employee changes
  useEffect(() => {
    if (open) {
      if (employee) {
        // Editing mode - populate with employee data
        setFullName(employee.fullName);
        setEmployeeType(employee.employeeType === 'monthly' ? 'monthly' : 'hourly');
        setHourlyRate(formatDecimalForDisplay(employee.hourlyRate));
        setMonthlySalary(formatDecimalForDisplay(employee.fixedMonthlySalary));
        setOvertimeRate(formatDecimalForDisplay(employee.overtimeRate));
        setTotalAnnualLeaveDays(employee.totalAnnualLeaveDays.toString());
        setEmail(employee.email || '');
        setPhone(employee.phone || '');
        setBankIban(employee.bankIban || '');
      } else {
        // Add mode - reset to defaults
        setFullName('');
        setEmployeeType('hourly');
        setHourlyRate('');
        setMonthlySalary('');
        setOvertimeRate('');
        setTotalAnnualLeaveDays('');
        setEmail('');
        setPhone('');
        setBankIban('');
      }
    }
  }, [employee, open]);

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if actor is ready before submission
    if (!actor || actorFetching) {
      toast.error('Η σύνδεση δεν είναι έτοιμη. Παρακαλώ περιμένετε λίγο και δοκιμάστε ξανά.', {
        duration: 4000,
      });
      return;
    }

    // Validate full name (MANDATORY)
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error('Το όνομα είναι υποχρεωτικό', {
        duration: 3000,
      });
      return;
    }

    // Validate based on employee type
    let parsedHourlyRate: number | null = null;
    let parsedMonthlySalary: number | null = null;

    if (employeeType === 'hourly') {
      // For hourly employees, hourly rate is mandatory
      parsedHourlyRate = parseDecimalValue(hourlyRate);
      if (parsedHourlyRate === null) {
        toast.error('Η ωριαία αμοιβή είναι υποχρεωτική και πρέπει να είναι έγκυρος αριθμός (π.χ. 10,5 ή 10.5)', {
          duration: 4000,
        });
        return;
      }
      if (parsedHourlyRate <= 0) {
        toast.error('Η ωριαία αμοιβή πρέπει να είναι θετικός αριθμός', {
          duration: 3000,
        });
        return;
      }
    } else {
      // For monthly employees, monthly salary is mandatory
      parsedMonthlySalary = parseDecimalValue(monthlySalary);
      if (parsedMonthlySalary === null) {
        toast.error('Ο μηνιαίος μισθός είναι υποχρεωτικός και πρέπει να είναι έγκυρος αριθμός (π.χ. 1200,50 ή 1200.50)', {
          duration: 4000,
        });
        return;
      }
      if (parsedMonthlySalary <= 0) {
        toast.error('Ο μηνιαίος μισθός πρέπει να είναι θετικός αριθμός', {
          duration: 3000,
        });
        return;
      }
      // For monthly employees, set hourly rate to 0 (backend will use it for overtime calculation if needed)
      parsedHourlyRate = 0;
    }

    // Validate overtime rate (MANDATORY for both types)
    const parsedOvertimeRate = parseDecimalValue(overtimeRate);
    if (parsedOvertimeRate === null) {
      toast.error('Η αμοιβή υπερωριών είναι υποχρεωτική και πρέπει να είναι έγκυρος αριθμός (π.χ. 10,5 ή 10.5)', {
        duration: 4000,
      });
      return;
    }
    if (parsedOvertimeRate <= 0) {
      toast.error('Η αμοιβή υπερωριών πρέπει να είναι θετικός αριθμός', {
        duration: 3000,
      });
      return;
    }

    // Validate leave days (OPTIONAL)
    let parsedLeaveDays: bigint = BigInt(0);
    const trimmedLeaveDays = totalAnnualLeaveDays.trim();
    if (trimmedLeaveDays) {
      const leaveDaysNum = parseInt(trimmedLeaveDays, 10);
      if (isNaN(leaveDaysNum) || leaveDaysNum < 0) {
        toast.error('Οι ετήσιες ημέρες άδειας πρέπει να είναι θετικός αριθμός ή μηδέν', {
          duration: 3000,
        });
        return;
      }
      parsedLeaveDays = BigInt(leaveDaysNum);
    }

    // Validate email (OPTIONAL)
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Το email δεν είναι έγκυρο', {
        duration: 3000,
      });
      return;
    }

    // Prepare optional fields
    const trimmedPhone = phone.trim();
    const trimmedIban = bankIban.trim();

    try {
      if (isEditing) {
        // Update existing employee
        const employeeData: Employee = {
          id: employee.id,
          fullName: trimmedName,
          employeeType,
          hourlyRate: parsedHourlyRate,
          overtimeRate: parsedOvertimeRate,
          fixedMonthlySalary: parsedMonthlySalary !== null ? parsedMonthlySalary : undefined,
          totalAnnualLeaveDays: parsedLeaveDays,
          email: trimmedEmail || undefined,
          phone: trimmedPhone || undefined,
          bankIban: trimmedIban || undefined,
        };

        await updateEmployee.mutateAsync({ employeeId: employee.id, employee: employeeData });
        onOpenChange(false);
      } else {
        // Add new employee
        const newEmployeeData = {
          fullName: trimmedName,
          employeeType,
          hourlyRate: parsedHourlyRate,
          overtimeRate: parsedOvertimeRate,
          fixedMonthlySalary: parsedMonthlySalary,
          totalAnnualLeaveDays: parsedLeaveDays,
          email: trimmedEmail || null,
          phone: trimmedPhone || null,
          bankIban: trimmedIban || null,
        };
        
        // Wait for the mutation to complete
        await addEmployee.mutateAsync(newEmployeeData);
        
        // Close dialog after successful save
        onOpenChange(false);
      }
    } catch (error: any) {
      // Error handling is done in useQueries with toast notifications
      console.error('Employee save error:', error);
    }
  };

  const isPending = addEmployee.isPending || updateEmployee.isPending;
  const isActorReady = !!actor && !actorFetching;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Prevent closing while saving
      if (!newOpen && isPending) {
        toast.info('Παρακαλώ περιμένετε να ολοκληρωθεί η αποθήκευση...', {
          duration: 2000,
        });
        return;
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Επεξεργασία Εργαζομένου' : 'Προσθήκη Νέου Εργαζομένου'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Επεξεργαστείτε τα στοιχεία του εργαζομένου'
              : 'Συμπληρώστε τα υποχρεωτικά πεδία (*) για να προσθέσετε νέο εργαζόμενο'}
          </DialogDescription>
        </DialogHeader>

        {/* Show actor loading state */}
        {actorFetching && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300 font-medium">
              Αρχικοποίηση συστήματος...
            </AlertDescription>
          </Alert>
        )}

        {/* Show actor not ready warning */}
        {!actorFetching && !actor && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              Το σύστημα δεν είναι διαθέσιμο. Παρακαλώ ανανεώστε τη σελίδα.
            </AlertDescription>
          </Alert>
        )}

        {/* Show saving progress indicator */}
        {isPending && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300 font-medium">
              {isEditing ? 'Ενημέρωση εργαζομένου...' : 'Αποθήκευση νέου εργαζομένου...'}
            </AlertDescription>
          </Alert>
        )}

        {/* Show ready indicator when not saving and actor is ready */}
        {!isPending && !actorFetching && isActorReady && (
          <Alert variant="default" className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300 font-medium">
              Το σύστημα είναι έτοιμο. Συμπληρώστε τα στοιχεία και πατήστε "{isEditing ? 'Ενημέρωση' : 'Προσθήκη'}".
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={validateAndSubmit} className="space-y-4">
          {/* MANDATORY: Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-base font-semibold">
              Όνομα <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="π.χ. Γιάννης Παπαδόπουλος"
              disabled={isPending || !isActorReady}
              required
              autoComplete="off"
              className="text-base"
            />
          </div>

          {/* MANDATORY: Employee Type */}
          <div className="space-y-2">
            <Label htmlFor="employeeType" className="text-base font-semibold">
              Τύπος Εργαζομένου <span className="text-red-500">*</span>
            </Label>
            <Select
              value={employeeType}
              onValueChange={(value: 'monthly' | 'hourly') => setEmployeeType(value)}
              disabled={isPending || !isActorReady}
            >
              <SelectTrigger id="employeeType" className="text-base">
                <SelectValue placeholder="Επιλέξτε τύπο εργαζομένου" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Ωριαίος εργαζόμενος</SelectItem>
                <SelectItem value="monthly">Μηνιαίος εργαζόμενος</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {employeeType === 'hourly' 
                ? 'Ο μισθός υπολογίζεται με βάση τις ώρες εργασίας' 
                : 'Σταθερός μηνιαίος μισθός συν υπερωρίες'}
            </p>
          </div>

          {/* Conditional: Hourly Rate OR Monthly Salary */}
          {employeeType === 'hourly' ? (
            <div className="space-y-2">
              <Label htmlFor="hourlyRate" className="text-base font-semibold">
                Ωριαία Αμοιβή (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hourlyRate"
                type="text"
                inputMode="decimal"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="π.χ. 8,84"
                disabled={isPending || !isActorReady}
                required
                autoComplete="off"
                className="text-base"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="monthlySalary" className="text-base font-semibold">
                Μηνιαίος Μισθός (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="monthlySalary"
                type="text"
                inputMode="decimal"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                placeholder="π.χ. 1200,50"
                disabled={isPending || !isActorReady}
                required
                autoComplete="off"
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Σταθερός μηνιαίος μισθός - οι υπερωρίες προστίθενται επιπλέον
              </p>
            </div>
          )}

          {/* MANDATORY: Overtime Rate */}
          <div className="space-y-2">
            <Label htmlFor="overtimeRate" className="text-base font-semibold">
              Αμοιβή Υπερωριών (€) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="overtimeRate"
              type="text"
              inputMode="decimal"
              value={overtimeRate}
              onChange={(e) => setOvertimeRate(e.target.value)}
              placeholder="π.χ. 5,85"
              disabled={isPending || !isActorReady}
              required
              autoComplete="off"
              className="text-base"
            />
          </div>

          {/* OPTIONAL: Total Annual Leave Days */}
          <div className="space-y-2">
            <Label htmlFor="totalAnnualLeaveDays" className="text-base">
              Συνολικές Ημέρες Άδειας (ημέρες/έτος) (προαιρετικό)
            </Label>
            <Input
              id="totalAnnualLeaveDays"
              type="number"
              min="0"
              step="1"
              value={totalAnnualLeaveDays}
              onChange={(e) => setTotalAnnualLeaveDays(e.target.value)}
              placeholder="π.χ. 20"
              disabled={isPending || !isActorReady}
              autoComplete="off"
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Προαιρετικό - Οι ημέρες άδειας που δικαιούται ο εργαζόμενος ετησίως
            </p>
          </div>

          {/* OPTIONAL: Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              Email (προαιρετικό)
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="π.χ. giannis@example.com"
              disabled={isPending || !isActorReady}
              autoComplete="off"
              className="text-base"
            />
          </div>

          {/* OPTIONAL: Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-base">
              Τηλέφωνο (προαιρετικό)
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="π.χ. 6912345678"
              disabled={isPending || !isActorReady}
              autoComplete="off"
              className="text-base"
            />
          </div>

          {/* OPTIONAL: IBAN */}
          <div className="space-y-2">
            <Label htmlFor="bankIban" className="text-base">
              IBAN (προαιρετικό)
            </Label>
            <Input
              id="bankIban"
              value={bankIban}
              onChange={(e) => setBankIban(e.target.value)}
              placeholder="π.χ. GR1601101050000010547023795"
              disabled={isPending || !isActorReady}
              autoComplete="off"
              className="text-base"
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isPending}
              className="min-w-[100px]"
            >
              Ακύρωση
            </Button>
            <Button 
              type="submit" 
              disabled={isPending || !isActorReady}
              className="gap-2 min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
              {isPending ? 'Αποθήκευση...' : isEditing ? 'Ενημέρωση' : 'Προσθήκη'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
