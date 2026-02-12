import { useState, useMemo } from 'react';
import { useGetWorkDays, useDeleteLeaveRecord } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { el } from 'date-fns/locale';
import type { Employee } from '../backend';

interface LeaveEditDialogProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeaveEditDialog({ employee, open, onOpenChange }: LeaveEditDialogProps) {
  const { data: workDays = [], isLoading } = useGetWorkDays(employee.id);
  const deleteLeaveRecord = useDeleteLeaveRecord();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState<string | null>(null);

  // Filter work days to only show leave days and group by year
  const leaveDaysByYear = useMemo(() => {
    const leaveDays = workDays.filter(day => day.isLeave);
    
    // Group by year
    const grouped = new Map<number, typeof leaveDays>();
    
    leaveDays.forEach(day => {
      try {
        const date = parse(day.date, 'yyyy-MM-dd', new Date());
        const year = date.getFullYear();
        
        if (!grouped.has(year)) {
          grouped.set(year, []);
        }
        grouped.get(year)!.push(day);
      } catch (error) {
        console.error('Error parsing date:', day.date, error);
      }
    });
    
    // Sort each year's leave days by date (most recent first)
    grouped.forEach((days, year) => {
      days.sort((a, b) => {
        const dateA = parse(a.date, 'yyyy-MM-dd', new Date());
        const dateB = parse(b.date, 'yyyy-MM-dd', new Date());
        return dateB.getTime() - dateA.getTime();
      });
    });
    
    // Convert to array and sort by year (most recent first)
    return Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]);
  }, [workDays]);

  const handleDeleteClick = (date: string) => {
    setSelectedLeaveDate(date);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedLeaveDate) return;

    try {
      await deleteLeaveRecord.mutateAsync({
        employeeId: employee.id,
        date: selectedLeaveDate,
      });
      
      setDeleteConfirmOpen(false);
      setSelectedLeaveDate(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setSelectedLeaveDate(null);
  };

  const totalLeaveDays = workDays.filter(day => day.isLeave).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Επεξεργασία Αδειών - {employee.fullName}
            </DialogTitle>
            <DialogDescription>
              Προβολή και διαγραφή ημερών άδειας ανά έτος
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : leaveDaysByYear.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Δεν υπάρχουν καταχωρημένες άδειες για αυτόν τον εργαζόμενο</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Συνολικές Ημέρες Άδειας</p>
                    <p className="text-2xl font-bold">{totalLeaveDays}</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {leaveDaysByYear.length} {leaveDaysByYear.length === 1 ? 'Έτος' : 'Έτη'}
                  </Badge>
                </div>

                {leaveDaysByYear.map(([year, days]) => (
                  <div key={year} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Έτος {year}</h3>
                      <Badge variant="outline">{days.length} {days.length === 1 ? 'ημέρα' : 'ημέρες'}</Badge>
                    </div>
                    
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ημερομηνία</TableHead>
                            <TableHead>Τύπος</TableHead>
                            <TableHead className="text-right">Ενέργειες</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {days.map((day) => {
                            const date = parse(day.date, 'yyyy-MM-dd', new Date());
                            const formattedDate = format(date, 'EEEE, d MMMM yyyy', { locale: el });
                            
                            return (
                              <TableRow key={day.date}>
                                <TableCell className="font-medium">{formattedDate}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {day.leaveType || 'Κανονική Άδεια'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteClick(day.date)}
                                    disabled={deleteLeaveRecord.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Διαγραφή
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Επιβεβαίωση Διαγραφής</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την ημέρα άδειας;
              <br />
              <br />
              Η ημέρα άδειας θα επιστραφεί στο υπόλοιπο του εργαζομένου και η μισθοδοσία θα ενημερωθεί αυτόματα.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={deleteLeaveRecord.isPending}>
              Όχι
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteLeaveRecord.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLeaveRecord.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Διαγραφή...
                </>
              ) : (
                'Ναι, Διαγραφή'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
