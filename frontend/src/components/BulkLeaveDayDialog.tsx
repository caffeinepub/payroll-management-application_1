import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAddBulkLeaveDay, useGetEmployees } from '../hooks/useQueries';
import { toast } from 'sonner';

interface BulkLeaveDayDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function BulkLeaveDayDialog({ open, onClose }: BulkLeaveDayDialogProps) {
  const addBulkLeaveDay = useAddBulkLeaveDay();
  const { data: employees = [] } = useGetEmployees();
  const [date, setDate] = useState('');

  const handleSubmit = async () => {
    if (!date) return;

    try {
      const employeeIds = employees.map((e) => Number(e.id));
      await addBulkLeaveDay.mutateAsync({ date, employeeIds });
      toast.success('Η μαζική άδεια καταχωρήθηκε');
      onClose();
    } catch {
      toast.error('Σφάλμα κατά την καταχώρηση');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Μαζική Καταχώρηση Άδειας</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Καταχώρηση άδειας για όλους τους εργαζόμενους ({employees.length}) την ίδια ημέρα.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="bulkLeaveDate">Ημερομηνία</Label>
            <Input
              id="bulkLeaveDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Ακύρωση
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addBulkLeaveDay.isPending || !date}
          >
            {addBulkLeaveDay.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Καταχώρηση
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
