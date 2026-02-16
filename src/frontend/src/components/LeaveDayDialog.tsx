import { useState } from 'react';
import { useToggleLeaveDay } from '../hooks/useQueries';
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

interface LeaveDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: bigint;
  employeeName: string;
}

export default function LeaveDayDialog({ open, onOpenChange, employeeId, employeeName }: LeaveDayDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const toggleLeaveDay = useToggleLeaveDay();

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
      await toggleLeaveDay.mutateAsync({ employeeId, date: dateStr });
      
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
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Προσθήκη Άδειας</DialogTitle>
            <DialogDescription>
              Προσθέστε μια ημέρα άδειας για τον εργαζόμενο: {employeeName}
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
              <p className="font-medium mb-2">Σημείωση:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Η άδεια θα καταχωρηθεί ως 8 ώρες εργασίας</li>
                <li>Θα αφαιρεθεί αυτόματα 1 ημέρα από το υπόλοιπο αδειών του εργαζομένου</li>
                <li>Η μισθοδοσία θα ενημερωθεί αυτόματα</li>
                <li>Το σύστημα παρακολούθησης αδειών θα ενημερωθεί</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={toggleLeaveDay.isPending}
            >
              Ακύρωση
            </Button>
            <Button type="submit" disabled={toggleLeaveDay.isPending || !selectedDate}>
              {toggleLeaveDay.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Προσθήκη...
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
