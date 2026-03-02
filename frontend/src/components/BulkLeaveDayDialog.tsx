import React, { useState } from 'react';
import { useGetEmployees, useAddBulkLeaveDay } from '../hooks/useQueries';
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

interface BulkLeaveDayDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function BulkLeaveDayDialog({ open, onClose }: BulkLeaveDayDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const { data: employees = [] } = useGetEmployees();
  const addBulkLeaveDay = useAddBulkLeaveDay();

  const handleSave = async () => {
    try {
      const employeeIds = employees.map((e) => e.id);
      await addBulkLeaveDay.mutateAsync({ date, employeeIds });
      toast.success(`Η άδεια καταχωρήθηκε για όλους τους εργαζόμενους`);
      onClose();
    } catch {
      toast.error('Σφάλμα κατά την καταχώρηση');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Μαζική Καταχώρηση Άδειας</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Η άδεια θα καταχωρηθεί για όλους τους εργαζόμενους ({employees.length} άτομα).
          </p>
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
          <Button onClick={handleSave} disabled={addBulkLeaveDay.isPending}>
            {addBulkLeaveDay.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
