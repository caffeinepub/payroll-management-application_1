import React, { useState } from 'react';
import { useToggleLeaveDay } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface LeaveDayDialogProps {
  employeeId: number;
  employeeName: string;
  open: boolean;
  onClose: () => void;
}

export default function LeaveDayDialog({ employeeId, employeeName, open, onClose }: LeaveDayDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const toggleLeaveDay = useToggleLeaveDay();

  const handleSave = async () => {
    try {
      await toggleLeaveDay.mutateAsync({ employeeId, date });
      toast.success(`Η άδεια καταχωρήθηκε για ${employeeName}`);
      onClose();
    } catch {
      toast.error('Σφάλμα κατά την καταχώρηση');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Καταχώρηση Άδειας — {employeeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Ημερομηνία Άδειας</Label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={toggleLeaveDay.isPending}>
            {toggleLeaveDay.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
