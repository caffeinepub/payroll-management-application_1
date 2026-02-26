import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGetLeaveDays, useDeleteLeaveDay, LeaveDay } from '../hooks/useQueries';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Employee } from '../backend';

interface LeaveEditDialogProps {
  employee: Employee;
  open: boolean;
  onClose: () => void;
}

export default function LeaveEditDialog({ employee, open, onClose }: LeaveEditDialogProps) {
  const employeeId = Number(employee.id);
  const { data: leaveDays = [] } = useGetLeaveDays(employeeId);
  const deleteLeaveDay = useDeleteLeaveDay();

  const handleDelete = async (leaveDay: LeaveDay) => {
    try {
      await deleteLeaveDay.mutateAsync({ employeeId, leaveDayId: leaveDay.id });
      toast.success('Η άδεια διαγράφηκε');
    } catch {
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  // Sort leave days by date descending
  const sorted = [...leaveDays].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Άδειες - {employee.fullName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {sorted.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Δεν υπάρχουν καταχωρημένες άδειες
            </p>
          ) : (
            sorted.map((leaveDay) => (
              <div
                key={leaveDay.id}
                className="flex items-center justify-between bg-muted/50 rounded px-3 py-2"
              >
                <span className="text-sm">{leaveDay.date}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(leaveDay)}
                  disabled={deleteLeaveDay.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? 'άδεια' : 'άδειες'} συνολικά
          </span>
          <Button variant="outline" onClick={onClose}>
            Κλείσιμο
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
