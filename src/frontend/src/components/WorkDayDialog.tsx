import { useState, useEffect } from 'react';
import { useAddWorkDay } from '../hooks/useQueries';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';
import type { WorkDay } from '../backend';

interface WorkDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: bigint;
  date: string;
  existingWorkDay?: WorkDay;
}

export default function WorkDayDialog({
  open,
  onOpenChange,
  employeeId,
  date,
  existingWorkDay,
}: WorkDayDialogProps) {
  const [normalHours, setNormalHours] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');
  const [isLeave, setIsLeave] = useState(false);
  const [errors, setErrors] = useState<{ normalHours?: string; overtimeHours?: string }>({});

  const addWorkDay = useAddWorkDay();

  useEffect(() => {
    if (open) {
      if (existingWorkDay) {
        setNormalHours(existingWorkDay.isLeave ? '' : existingWorkDay.normalHours.toString());
        setOvertimeHours(existingWorkDay.isLeave ? '' : existingWorkDay.overtimeHours.toString());
        setIsLeave(existingWorkDay.isLeave);
      } else {
        setNormalHours('');
        setOvertimeHours('');
        setIsLeave(false);
      }
      setErrors({});
    }
  }, [existingWorkDay, open]);

  const parseDecimal = (value: string): number | null => {
    if (!value || value.trim() === '') return null;
    
    // Replace comma with dot for decimal parsing
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    
    if (isNaN(parsed)) return null;
    if (parsed < 0) return null;
    
    return parsed;
  };

  const handleSave = async () => {
    const newErrors: { normalHours?: string; overtimeHours?: string } = {};

    if (!isLeave) {
      const normalHoursValue = parseDecimal(normalHours);
      const overtimeHoursValue = parseDecimal(overtimeHours);

      if (normalHours && normalHoursValue === null) {
        newErrors.normalHours = 'Μη έγκυρη τιμή. Χρησιμοποιήστε τελεία ή κόμμα για δεκαδικά (π.χ. 8.5 ή 8,5)';
      }

      if (overtimeHours && overtimeHoursValue === null) {
        newErrors.overtimeHours = 'Μη έγκυρη τιμή. Χρησιμοποιήστε τελεία ή κόμμα για δεκαδικά (π.χ. 2.3 ή 2,3)';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      if (!normalHours && !overtimeHours) {
        newErrors.normalHours = 'Παρακαλώ εισάγετε τουλάχιστον μία τιμή';
        setErrors(newErrors);
        return;
      }
    }

    // For leave days, backend expects 8 hours as normalHours
    const workDay: WorkDay = {
      date: date,
      normalHours: isLeave ? 8 : parseDecimal(normalHours) || 0,
      overtimeHours: isLeave ? 0 : parseDecimal(overtimeHours) || 0,
      isLeave,
      leaveType: isLeave ? 'Κανονική Άδεια' : undefined,
    };

    try {
      await addWorkDay.mutateAsync({ employeeId, workDay });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving work day:', error);
      // Error is already handled by the mutation's onError
    }
  };

  const formatDateDisplay = (dateStr: string): string => {
    // Convert YYYY-MM-DD to DD/MM/YYYY
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {existingWorkDay ? 'Επεξεργασία Ημέρας Εργασίας' : 'Προσθήκη Ημέρας Εργασίας'}
          </DialogTitle>
          <DialogDescription>Ημερομηνία: {formatDateDisplay(date)}</DialogDescription>
        </DialogHeader>

        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
            Οι ώρες που καταχωρείτε εμφανίζονται αυτόματα στο ημερολόγιο και η μισθοδοσία ενημερώνεται άμεσα.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isLeave"
              checked={isLeave}
              onCheckedChange={(checked) => {
                setIsLeave(checked as boolean);
                if (checked) {
                  setNormalHours('');
                  setOvertimeHours('');
                  setErrors({});
                }
              }}
            />
            <Label
              htmlFor="isLeave"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Ημέρα Άδειας
            </Label>
          </div>

          {isLeave && (
            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                Η άδεια υπολογίζεται ως 8 ώρες κανονικής εργασίας. Για ωριαίους εργαζόμενους, προστίθενται 8 ώρες × ωριαία αμοιβή στη μισθοδοσία. Για μηνιαίους εργαζόμενους, αφαιρείται 1 ημέρα από το υπόλοιπο άδειας.
              </AlertDescription>
            </Alert>
          )}

          {!isLeave && (
            <>
              <div className="space-y-2">
                <Label htmlFor="normalHours">Κανονικές Ώρες</Label>
                <Input
                  id="normalHours"
                  type="text"
                  inputMode="decimal"
                  placeholder="π.χ. 8 ή 8.5 ή 8,5"
                  value={normalHours}
                  onChange={(e) => {
                    setNormalHours(e.target.value);
                    if (errors.normalHours) {
                      setErrors({ ...errors, normalHours: undefined });
                    }
                  }}
                  className={errors.normalHours ? 'border-red-500' : ''}
                  disabled={addWorkDay.isPending}
                />
                {errors.normalHours && (
                  <p className="text-sm text-red-500">{errors.normalHours}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="overtimeHours">Υπερωρίες</Label>
                <Input
                  id="overtimeHours"
                  type="text"
                  inputMode="decimal"
                  placeholder="π.χ. 2 ή 2.3 ή 2,3"
                  value={overtimeHours}
                  onChange={(e) => {
                    setOvertimeHours(e.target.value);
                    if (errors.overtimeHours) {
                      setErrors({ ...errors, overtimeHours: undefined });
                    }
                  }}
                  className={errors.overtimeHours ? 'border-red-500' : ''}
                  disabled={addWorkDay.isPending}
                />
                {errors.overtimeHours && (
                  <p className="text-sm text-red-500">{errors.overtimeHours}</p>
                )}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Μπορείτε να χρησιμοποιήσετε τελεία (.) ή κόμμα (,) για δεκαδικούς αριθμούς.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={addWorkDay.isPending}
          >
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={addWorkDay.isPending}>
            {addWorkDay.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Αποθήκευση...
              </>
            ) : (
              'Αποθήκευση'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
