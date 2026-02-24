import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2 } from 'lucide-react';
import { useGetWorkDays, useDeleteLeaveRecord } from '../hooks/useQueries';
import type { Employee } from '../types';

interface LeaveEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export default function LeaveEditDialog({
  open,
  onOpenChange,
  employee,
}: LeaveEditDialogProps) {
  const { data: workDays = [] } = useGetWorkDays(employee?.id ?? null);
  const deleteLeaveRecord = useDeleteLeaveRecord();
  const [deletingDate, setDeletingDate] = useState<string | null>(null);

  const leaveDays = workDays.filter((wd) => wd.isLeave);

  // Group by year
  const byYear: Record<number, typeof leaveDays> = {};
  leaveDays.forEach((wd) => {
    const year = parseInt(wd.date.split('-')[0]);
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(wd);
  });

  const sortedYears = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  const handleDelete = async (date: string) => {
    if (!employee) return;
    setDeletingDate(date);
    try {
      await deleteLeaveRecord.mutateAsync({ employeeId: employee.id, date });
    } finally {
      setDeletingDate(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Άδειες — {employee?.fullName}
          </DialogTitle>
        </DialogHeader>

        {leaveDays.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Δεν υπάρχουν καταχωρημένες άδειες
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {sortedYears.map((year) => (
                <div key={year}>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                    {year} ({byYear[year].length} ημέρες)
                  </h3>
                  <div className="space-y-1">
                    {byYear[year]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((wd) => (
                        <div
                          key={wd.date}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{formatDate(wd.date)}</span>
                            {wd.leaveType && (
                              <Badge variant="outline" className="text-xs">
                                {wd.leaveType}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(wd.date)}
                            disabled={deletingDate === wd.date}
                          >
                            {deletingDate === wd.date ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Κλείσιμο
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
