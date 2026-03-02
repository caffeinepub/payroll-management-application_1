import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useSetWorkDay } from '../hooks/useQueries';
import type { WorkDay } from '../types';
import type { Employee } from '../types';
import { toast } from 'sonner';

interface WorkDayDialogProps {
  open: boolean;
  employee: Employee;
  date: string;
  existingWorkDay?: WorkDay | null;
  onClose: () => void;
}

export default function WorkDayDialog({
  open,
  employee,
  date,
  existingWorkDay,
  onClose,
}: WorkDayDialogProps) {
  const setWorkDay = useSetWorkDay();

  const [normalHours, setNormalHours] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');
  const [isLeave, setIsLeave] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingWorkDay) {
        setNormalHours(existingWorkDay.normalHours.toString());
        setOvertimeHours(existingWorkDay.overtimeHours.toString());
        setIsLeave(existingWorkDay.isLeave);
      } else {
        setNormalHours('');
        setOvertimeHours('');
        setIsLeave(false);
      }
    }
  }, [open, existingWorkDay]);

  const handleSave = async () => {
    const workDay: WorkDay = {
      date,
      normalHours: isLeave ? 0 : parseFloat(normalHours) || 0,
      overtimeHours: isLeave ? 0 : parseFloat(overtimeHours) || 0,
      isLeave,
    };

    try {
      await setWorkDay.mutateAsync({ employeeId: employee.id, workDay });
      toast.success('Η εργάσιμη ημέρα αποθηκεύτηκε');
      onClose();
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {employee.fullName} — {date}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="isLeave"
              checked={isLeave}
              onCheckedChange={(checked) => setIsLeave(!!checked)}
            />
            <Label htmlFor="isLeave">Ημέρα Άδειας</Label>
          </div>

          {!isLeave && (
            <>
              <div className="space-y-2">
                <Label>Κανονικές Ώρες</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={normalHours}
                  onChange={(e) => setNormalHours(e.target.value)}
                  placeholder="π.χ. 8"
                />
              </div>
              <div className="space-y-2">
                <Label>Υπερωρίες</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(e.target.value)}
                  placeholder="π.χ. 2"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={setWorkDay.isPending}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={setWorkDay.isPending}>
            {setWorkDay.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
