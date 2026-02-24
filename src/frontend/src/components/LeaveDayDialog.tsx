import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { useToggleLeaveDay } from '../hooks/useQueries';
import { format } from 'date-fns';

interface LeaveDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: bigint;
  employeeName: string;
}

export default function LeaveDayDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
}: LeaveDayDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const toggleLeaveDay = useToggleLeaveDay();

  const handleSave = async () => {
    if (!selectedDate) return;

    const dateString = format(selectedDate, 'yyyy-MM-dd');

    try {
      await toggleLeaveDay.mutateAsync({ employeeId, date: dateString });
      onOpenChange(false);
    } catch (error) {
      console.error('Error toggling leave day:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Προσθήκη Ημέρας Άδειας - {employeeName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">Σημείωση:</p>
            <p>
              Η άδεια υπολογίζεται ως 8 ώρες κανονικής εργασίας. Για ωριαίους εργαζόμενους, θα προστεθούν 8 ώρες × ωριαία αμοιβή στη μισθοδοσία. Για μηνιαίους εργαζόμενους, θα αφαιρεθεί 1 ημέρα από το υπόλοιπο άδειας.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Επιλέξτε Ημερομηνία</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={toggleLeaveDay.isPending}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={!selectedDate || toggleLeaveDay.isPending}>
            {toggleLeaveDay.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
