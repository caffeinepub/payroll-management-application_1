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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetEmployees, useToggleLeaveDay } from '../hooks/useQueries';
import { toast } from 'sonner';

interface LeaveDayDialogProps {
  open: boolean;
  onClose: () => void;
  employeeId: number;
}

export default function LeaveDayDialog({ open, onClose, employeeId }: LeaveDayDialogProps) {
  const { data: employees = [] } = useGetEmployees();
  const toggleLeaveDay = useToggleLeaveDay();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(employeeId);
  const [date, setDate] = useState('');

  const handleSubmit = async () => {
    if (!date) return;

    try {
      await toggleLeaveDay.mutateAsync({
        employeeId: selectedEmployeeId,
        date,
      });
      toast.success('Η άδεια καταχωρήθηκε');
      onClose();
    } catch {
      toast.error('Σφάλμα κατά την καταχώρηση');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Καταχώρηση Άδειας</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Εργαζόμενος</Label>
            <Select
              value={String(selectedEmployeeId)}
              onValueChange={(v) => setSelectedEmployeeId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε εργαζόμενο" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={Number(e.id)} value={String(Number(e.id))}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="leaveDate">Ημερομηνία</Label>
            <Input
              id="leaveDate"
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
            disabled={toggleLeaveDay.isPending || !date}
          >
            {toggleLeaveDay.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Καταχώρηση
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
