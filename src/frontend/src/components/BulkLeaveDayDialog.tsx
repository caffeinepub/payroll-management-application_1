import { useState } from 'react';
import { useAddBulkLeaveDay, useGetAllEmployees } from '../hooks/useQueries';
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
import { CalendarIcon, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BulkLeaveDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkLeaveDayDialog({ open, onOpenChange }: BulkLeaveDayDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { data: employees = [] } = useGetAllEmployees();
  
  const addBulkLeaveDay = useAddBulkLeaveDay();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      return;
    }

    if (employees.length === 0) {
      return;
    }

    // Format date as YYYY-MM-DD for backend
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    try {
      await addBulkLeaveDay.mutateAsync(dateStr);
      
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
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Προσθήκη Άδειας σε Όλους
            </DialogTitle>
            <DialogDescription>
              Προσθέστε μια ημέρα άδειας για όλους τους εργαζομένους ({employees.length} εργαζόμενοι)
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

            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground space-y-2">
              <p className="font-medium">
                Αυτή η ενέργεια θα προσθέσει άδεια για όλους τους εργαζομένους:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Θα καταχωρηθεί ως 8 ώρες εργασίας για κάθε εργαζόμενο</li>
                <li>Θα αφαιρεθεί 1 ημέρα από το υπόλοιπο κάθε εργαζομένου</li>
                <li>Η μισθοδοσία θα ενημερωθεί αυτόματα για όλους</li>
                <li>Το ημερολόγιο θα ενημερωθεί για όλους τους εργαζομένους</li>
              </ul>
            </div>

            {employees.length === 0 && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                Δεν υπάρχουν εργαζόμενοι. Προσθέστε εργαζομένους πρώτα.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={addBulkLeaveDay.isPending}
            >
              Ακύρωση
            </Button>
            <Button 
              type="submit" 
              disabled={addBulkLeaveDay.isPending || !selectedDate || employees.length === 0}
            >
              {addBulkLeaveDay.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Προσθήκη...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Προσθήκη Άδειας σε Όλους
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
