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
import type { WorkDay } from '../hooks/useQueries';
import type { Employee } from '../backend';

interface WorkDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: number;
  employee: Employee;
  date: string;
  existingWorkDay: WorkDay | null;
}

export default function WorkDayDialog({
  open,
  onOpenChange,
  employeeId,
  employee,
  date,
  existingWorkDay,
}: WorkDayDialogProps) {
  const [normalHours, setNormalHours] = useState('8');
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [isLeave, setIsLeave] = useState(false);

  const setWorkDay = useSetWorkDay();

  useEffect(() => {
    if (existingWorkDay) {
      setNormalHours(existingWorkDay.normalHours.toString());
      setOvertimeHours(existingWorkDay.overtimeHours.toString());
      setIsLeave(existingWorkDay.isLeave);
    } else {
      setNormalHours('8');
      setOvertimeHours('0');
      setIsLeave(false);
    }
  }, [existingWorkDay, open]);

  useEffect(() => {
    if (isLeave) {
      setNormalHours('8');
      setOvertimeHours('0');
    }
  }, [isLeave]);

  const handleSave = async () => {
    await setWorkDay.mutateAsync({
      employeeId,
      workDay: {
        date,
        normalHours: parseFloat(normalHours) || 0,
        overtimeHours: parseFloat(overtimeHours) || 0,
        isLeave,
      },
    });
    onOpenChange(false);
  };

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('el-GR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Καταχώρηση Ημέρας</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{employee.fullName}</p>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isLeave"
              checked={isLeave}
              onCheckedChange={(checked) => setIsLeave(!!checked)}
            />
            <Label htmlFor="isLeave">Ημέρα Άδειας</Label>
          </div>

          {isLeave && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
              {employee.employeeType === 'hourly'
                ? 'Υπολογισμός: 8 ώρες × ωριαία αμοιβή'
                : 'Υπολογισμός: αφαίρεση 1 ημέρας από μηνιαίο μισθό'}
            </div>
          )}

          <div className="space-y-1">
            <Label>Κανονικές Ώρες</Label>
            <Input
              type="number"
              value={normalHours}
              onChange={(e) => setNormalHours(e.target.value)}
              disabled={isLeave}
              min="0"
              max="24"
              step="0.5"
            />
          </div>

          <div className="space-y-1">
            <Label>Ώρες Υπερωρίας</Label>
            <Input
              type="number"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
              disabled={isLeave}
              min="0"
              max="24"
              step="0.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={setWorkDay.isPending}>
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
