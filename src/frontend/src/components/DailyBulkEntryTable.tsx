import { useState, useMemo, useEffect } from 'react';
import { useGetDailyBulkWorkDays, useSaveDailyBulkWorkDays } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Employee, WorkDay } from '../backend';

interface DailyBulkEntryTableProps {
  employees: Employee[];
}

interface EmployeeEntry {
  employeeId: bigint;
  normalHours: string;
  overtimeHours: string;
  isLeave: boolean;
}

export default function DailyBulkEntryTable({ employees }: DailyBulkEntryTableProps) {
  // State for selected date (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<Map<string, EmployeeEntry>>(new Map());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const saveDailyBulkWorkDays = useSaveDailyBulkWorkDays();

  // Format selected date as YYYY-MM-DD for backend (backend expects this format)
  const dateStr = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  // Fetch previously saved work days for the selected date
  const { data: savedWorkDays, isLoading: isLoadingSavedData } = useGetDailyBulkWorkDays(dateStr);

  // Initialize entries from employees and pre-fill with saved data
  useEffect(() => {
    if (employees.length === 0) {
      setEntries(new Map());
      return;
    }
    
    const newEntries = new Map<string, EmployeeEntry>();
    
    // Create a map of saved work days for quick lookup
    const savedWorkDaysMap = new Map<string, WorkDay>();
    if (savedWorkDays && savedWorkDays.length > 0) {
      savedWorkDays.forEach(([employeeId, workDay]) => {
        savedWorkDaysMap.set(employeeId.toString(), workDay);
      });
    }
    
    // Initialize entries for all employees, pre-filling with saved data if available
    employees.forEach((employee) => {
      const employeeIdStr = employee.id.toString();
      const savedWorkDay = savedWorkDaysMap.get(employeeIdStr);
      
      if (savedWorkDay) {
        // Pre-fill with saved data
        newEntries.set(employeeIdStr, {
          employeeId: employee.id,
          normalHours: savedWorkDay.normalHours > 0 ? savedWorkDay.normalHours.toString().replace('.', ',') : '',
          overtimeHours: savedWorkDay.overtimeHours > 0 ? savedWorkDay.overtimeHours.toString().replace('.', ',') : '',
          isLeave: savedWorkDay.isLeave,
        });
      } else {
        // Empty entry for employees without saved data
        newEntries.set(employeeIdStr, {
          employeeId: employee.id,
          normalHours: '',
          overtimeHours: '',
          isLeave: false,
        });
      }
    });
    
    setEntries(newEntries);
  }, [employees, savedWorkDays, dateStr]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
      // Entries will be automatically updated by the useEffect above when savedWorkDays changes
    }
  };

  const handleEntryChange = (employeeId: bigint, field: 'normalHours' | 'overtimeHours', value: string) => {
    const key = employeeId.toString();
    const current = entries.get(key) || { employeeId, normalHours: '', overtimeHours: '', isLeave: false };
    const updated = { ...current, [field]: value };
    setEntries(new Map(entries.set(key, updated)));
  };

  const handleLeaveChange = (employeeId: bigint, checked: boolean) => {
    const key = employeeId.toString();
    const current = entries.get(key) || { employeeId, normalHours: '', overtimeHours: '', isLeave: false };
    const updated = { ...current, isLeave: checked };
    setEntries(new Map(entries.set(key, updated)));
  };

  const validateDecimal = (value: string): boolean => {
    if (!value || value.trim() === '') return true; // Empty is valid
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return !isNaN(parsed) && parsed >= 0;
  };

  const handleSaveAll = async () => {
    try {
      // Filter entries that have data (hours or leave)
      const entriesToSave = Array.from(entries.values()).filter(
        (entry) => entry.normalHours !== '' || entry.overtimeHours !== '' || entry.isLeave
      );

      if (entriesToSave.length === 0) {
        toast.info('Δεν υπάρχουν δεδομένα για αποθήκευση');
        return;
      }

      // Validate all entries first
      const invalidEntries: string[] = [];
      for (const entry of entriesToSave) {
        if (!validateDecimal(entry.normalHours) || !validateDecimal(entry.overtimeHours)) {
          const employee = employees.find(e => e.id === entry.employeeId);
          invalidEntries.push(employee?.fullName || entry.employeeId.toString());
        }
      }

      if (invalidEntries.length > 0) {
        toast.error(`Μη έγκυρες τιμές για: ${invalidEntries.join(', ')}`);
        return;
      }

      // Prepare bulk work days array
      const workDaysBulk: Array<[bigint, WorkDay]> = [];

      for (const entry of entriesToSave) {
        // Replace comma with dot for decimal parsing
        const normalHoursStr = entry.normalHours.replace(',', '.');
        const overtimeHoursStr = entry.overtimeHours.replace(',', '.');
        
        let normalHours = parseFloat(normalHoursStr || '0');
        const overtimeHours = parseFloat(overtimeHoursStr || '0');

        // If leave is checked, automatically set normal hours to 8
        if (entry.isLeave) {
          normalHours = 8.0;
        }

        if (normalHours === 0 && overtimeHours === 0 && !entry.isLeave) {
          continue;
        }

        const workDay: WorkDay = {
          date: dateStr,
          normalHours: normalHours,
          overtimeHours: overtimeHours,
          isLeave: entry.isLeave,
          leaveType: entry.isLeave ? 'Κανονική Άδεια' : undefined,
        };

        workDaysBulk.push([entry.employeeId, workDay]);
      }

      if (workDaysBulk.length === 0) {
        toast.info('Δεν υπάρχουν έγκυρα δεδομένα για αποθήκευση');
        return;
      }

      console.log('Saving bulk work days:', workDaysBulk.length, 'entries for date:', dateStr);

      // Use the saveDailyBulkWorkDays mutation which handles updates
      await saveDailyBulkWorkDays.mutateAsync({ date: dateStr, entries: workDaysBulk });

      const dateDisplay = format(selectedDate, 'd MMMM yyyy', { locale: el });
      
      // Check if any entries were marked as leave
      const leaveCount = workDaysBulk.filter(([_, workDay]) => workDay.isLeave).length;
      
      // Show success message with confirmation that payroll and calendar were updated
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-semibold">Επιτυχής Αποθήκευση</span>
          </div>
          <div className="text-sm">
            Αποθηκεύτηκαν {workDaysBulk.length} καταχωρήσεις για {dateDisplay}
            {leaveCount > 0 && ` (${leaveCount} άδειες)`}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">
            ✓ Η μισθοδοσία και το ημερολόγιο ενημερώθηκαν αυτόματα
          </div>
          {leaveCount > 0 && (
            <div className="text-sm text-green-600 dark:text-green-400">
              ✓ Τα υπόλοιπα αδειών ενημερώθηκαν αυτόματα
            </div>
          )}
        </div>,
        { duration: 5000 }
      );
      
      console.log('Bulk save completed successfully with calendar synchronization');
    } catch (error) {
      console.error('Error in handleSaveAll:', error);
      // Error toast is already handled by the mutation's onError
    }
  };

  const getEntry = (employeeId: bigint): EmployeeEntry => {
    const key = employeeId.toString();
    return entries.get(key) || { employeeId, normalHours: '', overtimeHours: '', isLeave: false };
  };

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CalendarIcon className="h-12 w-12 mb-4" />
          <p>Δεν υπάρχουν εργαζόμενοι</p>
        </CardContent>
      </Card>
    );
  }

  const isSaving = saveDailyBulkWorkDays.isPending;
  const isLoading = isLoadingSavedData;

  // Format the selected date for display
  const displayDate = format(selectedDate, 'EEEE, d MMMM yyyy', { locale: el });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle>Μαζική Καταχώρηση Ωρών Εργασίας</CardTitle>
            <CardDescription>Καταχωρήστε ώρες για όλους τους εργαζομένους για την επιλεγμένη ημερομηνία</CardDescription>
          </div>
          
          {/* Date Picker */}
          <div className="flex flex-col gap-3 p-5 bg-muted/50 rounded-lg border">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Επιλογή Ημερομηνίας:</div>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal text-base h-12',
                    !selectedDate && 'text-muted-foreground'
                  )}
                  disabled={isSaving}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {selectedDate ? displayDate : 'Επιλέξτε ημερομηνία'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 calendar-enhanced-large" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  locale={el}
                />
              </PopoverContent>
            </Popover>
            
            {/* Loading indicator when fetching saved data */}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Φόρτωση αποθηκευμένων δεδομένων...</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Εργαζόμενος</TableHead>
                <TableHead className="w-[20%]">Κανονικές Ώρες</TableHead>
                <TableHead className="w-[20%]">Υπερωρίες</TableHead>
                <TableHead className="w-[15%] text-center">Άδεια</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const entry = getEntry(employee.id);

                return (
                  <TableRow key={employee.id.toString()}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{employee.fullName}</span>
                        <span className="text-xs text-muted-foreground">{employee.email || 'Χωρίς email'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="π.χ. 8.5 ή 8,5"
                        value={entry.normalHours}
                        onChange={(e) => handleEntryChange(employee.id, 'normalHours', e.target.value)}
                        disabled={isSaving || isLoading || entry.isLeave}
                        className={cn("w-full", entry.isLeave && "bg-muted")}
                        autoComplete="off"
                      />
                      {entry.isLeave && (
                        <p className="text-xs text-muted-foreground mt-1">Αυτόματα 8 ώρες</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="π.χ. 2.3 ή 2,3"
                        value={entry.overtimeHours}
                        onChange={(e) => handleEntryChange(employee.id, 'overtimeHours', e.target.value)}
                        disabled={isSaving || isLoading}
                        className="w-full"
                        autoComplete="off"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={entry.isLeave}
                          onCheckedChange={(checked) => handleLeaveChange(employee.id, checked === true)}
                          disabled={isSaving || isLoading}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium">Σημείωση για την Άδεια:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Όταν επιλέγετε "Άδεια", οι κανονικές ώρες ορίζονται αυτόματα σε 8</li>
            <li>Η άδεια αφαιρείται αυτόματα από το υπόλοιπο του εργαζομένου</li>
            <li>Η μισθοδοσία υπολογίζεται αυτόματα με τις 8 ώρες άδειας</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveAll} disabled={isSaving || isLoading} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Αποθήκευση και Συγχρονισμός...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Αποθήκευση Ημέρας
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
