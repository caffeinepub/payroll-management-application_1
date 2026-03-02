import React from 'react';
import { useGetLeaveDays, useDeleteLeaveDay } from '../hooks/useQueries';
import { Employee, LeaveDay } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Umbrella } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveEditDialogProps {
  employee: Employee;
  open: boolean;
  onClose: () => void;
}

export default function LeaveEditDialog({ employee, open, onClose }: LeaveEditDialogProps) {
  const { data: leaveDays = [], isLoading } = useGetLeaveDays(employee.id);
  const deleteLeaveDay = useDeleteLeaveDay();

  const handleDelete = async (leaveDay: LeaveDay) => {
    try {
      await deleteLeaveDay.mutateAsync({ employeeId: employee.id, date: leaveDay.date });
      toast.success('Η άδεια διαγράφηκε');
    } catch {
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const sorted = [...leaveDays].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Άδειες — {employee.fullName}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : sorted.length === 0 ? (
            <div className="py-8 text-center">
              <Umbrella className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Δεν υπάρχουν καταχωρημένες άδειες</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((ld, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                >
                  <div>
                    <p className="font-medium text-sm">{ld.date}</p>
                    {ld.leaveType && (
                      <p className="text-xs text-muted-foreground">{ld.leaveType}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(ld)}
                    disabled={deleteLeaveDay.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
