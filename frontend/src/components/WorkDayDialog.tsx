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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Info } from 'lucide-react';
import type { WorkDay, Employee } from '../types';

interface WorkDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  date: string | null;
  existingWorkDay?: WorkDay | null;
  onSave: (workDay: WorkDay) => void;
  isPending?: boolean;
}

export default function WorkDayDialog({
  open,
  onOpenChange,
  employee,
  date,
  existingWorkDay,
  onSave,
  isPending = false,
}: WorkDayDialogProps) {
  const [normalHours, setNormalHours] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');
  const [isLeave, setIsLeave] = useState(false);
  const [leaveType, setLeaveType] = useState('');

  useEffect(() => {
    if (open) {
      if (existingWorkDay) {
        setNormalHours(existingWorkDay.normalHours.toString());
        setOvertimeHours(existingWorkDay.overtimeHours.toString());
        setIsLeave(existingWorkDay.isLeave);
        setLeaveType(existingWorkDay.leaveType ?? '');
      } else {
        setNormalHours('');
        setOvertimeHours('');
        setIsLeave(false);
        setLeaveType('');
      }
    }
  }, [open, existingWorkDay]);

  // When leave is toggled on, auto-set 8 hours
  useEffect(() => {
    if (isLeave) {
      setNormalHours('8');
      setOvertimeHours('0');
    }
  }, [isLeave]);

  const handleSave = () => {
    if (!date) return;
    onSave({
      date,
      normalHours: parseFloat(normalHours) || 0,
      overtimeHours: parseFloat(overtimeHours) || 0,
      isLeave,
      leaveType: leaveType.trim() || null,
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingWorkDay ? 'Επεξεργασία Ημέρας' : 'Καταχώρηση Ημέρας'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {employee && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{employee.fullName}</span>
              {date && <span> — {formatDate(date)}</span>}
            </div>
          )}

          {/* Leave checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isLeave"
              checked={isLeave}
              onCheckedChange={(checked) => setIsLeave(checked === true)}
            />
            <Label htmlFor="isLeave" className="cursor-pointer">
              Ημέρα Άδειας
            </Label>
          </div>

          {isLeave && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 flex gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Υπολογισμός Άδειας:</p>
                {employee?.employeeType === 'hourly' ? (
                  <p>Ωρομίσθιος: 8 ώρες × ωριαία αμοιβή</p>
                ) : (
                  <p>Μηνιαίος: αφαίρεση 1 ημέρας από μισθό</p>
                )}
              </div>
            </div>
          )}

          {/* Leave type */}
          {isLeave && (
            <div className="space-y-1">
              <Label htmlFor="leaveType">Τύπος Άδειας</Label>
              <Input
                id="leaveType"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                placeholder="π.χ. Κανονική, Ασθένεια..."
              />
            </div>
          )}

          {/* Normal Hours */}
          <div className="space-y-1">
            <Label htmlFor="normalHours">Κανονικές Ώρες</Label>
            <Input
              id="normalHours"
              type="number"
              step="0.5"
              min="0"
              value={normalHours}
              onChange={(e) => setNormalHours(e.target.value)}
              placeholder="π.χ. 8"
              disabled={isLeave}
            />
          </div>

          {/* Overtime Hours */}
          <div className="space-y-1">
            <Label htmlFor="overtimeHours">Υπερωρίες</Label>
            <Input
              id="overtimeHours"
              type="number"
              step="0.5"
              min="0"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
              placeholder="π.χ. 2"
              disabled={isLeave}
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
