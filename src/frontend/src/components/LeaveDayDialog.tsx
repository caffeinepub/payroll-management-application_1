import { useState } from 'react';
import { useAddLeaveDay } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Employee } from '../backend';

interface LeaveDayDialogProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeaveDayDialog({ employee, open, onOpenChange }: LeaveDayDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const addLeaveDay = useAddLeaveDay();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      return;
    }

    // Format date as YYYY-MM-DD for backend
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    try {
      await addLeaveDay.mutateAsync({
        employeeId: employee.id,
        date: dateStr,
      });
      
      // Close dialog on success
      onOpenChange(false);
      
      // Reset form
      setSelectedDate(new Date());
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setSelectedDate(new Date());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Προσθήκη Άδειας</DialogTitle>
            <DialogDescription>
              Προσθέστε μια ημέρα άδειας για τον/την {employee.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Ημερομηνία Άδειας</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, 'dd/MM/yyyy', { locale: el })
                    ) : (
                      <span>Επιλέξτε ημερομηνία</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={el}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <p>
                Η άδεια θα καταχωρηθεί ως 8 ώρες εργασίας και θα αφαιρεθεί αυτόματα από το υπόλοιπο των διαθέσιμων ημερών άδειας.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={addLeaveDay.isPending}
            >
              Ακύρωση
            </Button>
            <Button type="submit" disabled={addLeaveDay.isPending || !selectedDate}>
              {addLeaveDay.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                'Προσθήκη Άδειας'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
