import { useState, useMemo, useEffect } from 'react';
import { useAddPaymentRecordsBulk } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Employee, PaymentRecord } from '../backend';

interface BulkPaymentEntryTableProps {
  employees: Employee[];
}

interface EmployeePaymentEntry {
  employeeId: bigint;
  cashPayment: string;
  bankPayment: string;
}

export default function BulkPaymentEntryTable({ employees }: BulkPaymentEntryTableProps) {
  // State for selected payment date (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<Map<string, EmployeePaymentEntry>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const addPaymentRecordsBulk = useAddPaymentRecordsBulk();

  // Format selected date as YYYY-MM-DD for backend (backend expects this format)
  const dateStr = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  // Initialize entries for all employees
  useEffect(() => {
    if (employees.length === 0) return;
    
    const newEntries = new Map<string, EmployeePaymentEntry>();
    employees.forEach((employee) => {
      newEntries.set(employee.id.toString(), {
        employeeId: employee.id,
        cashPayment: '',
        bankPayment: '',
      });
    });
    setEntries(newEntries);
  }, [employees]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const handleEntryChange = (employeeId: bigint, field: 'cashPayment' | 'bankPayment', value: string) => {
    const key = employeeId.toString();
    const current = entries.get(key) || { employeeId, cashPayment: '', bankPayment: '' };
    const updated = { ...current, [field]: value };
    setEntries(new Map(entries.set(key, updated)));
  };

  const parseDecimalInput = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSaveAll = async () => {
    setIsSaving(true);

    try {
      // Filter entries that have data
      const entriesToSave = Array.from(entries.values()).filter(
        (entry) => entry.cashPayment !== '' || entry.bankPayment !== ''
      );

      if (entriesToSave.length === 0) {
        toast.info('Δεν υπάρχουν δεδομένα για αποθήκευση');
        setIsSaving(false);
        return;
      }

      // Prepare bulk payment records - backend expects PaymentRecord[]
      const paymentsBulk: PaymentRecord[] = [];

      for (const entry of entriesToSave) {
        const cashValue = parseDecimalInput(entry.cashPayment);
        const bankValue = parseDecimalInput(entry.bankPayment);

        if (cashValue === 0 && bankValue === 0) {
          continue;
        }

        const payment: PaymentRecord = {
          employeeId: entry.employeeId,
          month: BigInt(selectedDate.getMonth() + 1),
          year: BigInt(selectedDate.getFullYear()),
          cashPayment: cashValue,
          bankPayment: bankValue,
          paymentDate: dateStr,
        };

        paymentsBulk.push(payment);
      }

      if (paymentsBulk.length === 0) {
        toast.info('Δεν υπάρχουν έγκυρα δεδομένα για αποθήκευση');
        setIsSaving(false);
        return;
      }

      // Save all payments in bulk
      await addPaymentRecordsBulk.mutateAsync(paymentsBulk);

      const dateDisplay = format(selectedDate, 'd MMMM yyyy', { locale: el });
      toast.success(`Αποθηκεύτηκαν επιτυχώς ${paymentsBulk.length} πληρωμές για ${dateDisplay}`);

      // Clear entries after successful save
      const clearedEntries = new Map<string, EmployeePaymentEntry>();
      employees.forEach((employee) => {
        clearedEntries.set(employee.id.toString(), {
          employeeId: employee.id,
          cashPayment: '',
          bankPayment: '',
        });
      });
      setEntries(clearedEntries);
    } catch (error) {
      console.error('Error in handleSaveAll:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setIsSaving(false);
    }
  };

  const getEntry = (employeeId: bigint): EmployeePaymentEntry => {
    const key = employeeId.toString();
    return entries.get(key) || { employeeId, cashPayment: '', bankPayment: '' };
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

  // Format the selected date for display
  const displayDate = format(selectedDate, 'EEEE, d MMMM yyyy', { locale: el });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle>Μαζική Καταχώρηση Πληρωμών</CardTitle>
            <CardDescription>Καταχωρήστε πληρωμές για όλους τους εργαζόμενους για την επιλεγμένη ημερομηνία</CardDescription>
          </div>
          
          {/* Date Picker */}
          <div className="flex flex-col gap-3 p-5 bg-muted/50 rounded-lg border">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ημερομηνία Πληρωμής:</div>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal text-base h-12',
                    !selectedDate && 'text-muted-foreground'
                  )}
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Εργαζόμενος</TableHead>
                <TableHead className="w-[30%]">Πληρωμή Μετρητών (€)</TableHead>
                <TableHead className="w-[30%]">Πληρωμή Τράπεζας (€)</TableHead>
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
                        placeholder="0.00"
                        value={entry.cashPayment}
                        onChange={(e) => handleEntryChange(employee.id, 'cashPayment', e.target.value)}
                        disabled={isSaving}
                        className="w-full"
                        autoComplete="off"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={entry.bankPayment}
                        onChange={(e) => handleEntryChange(employee.id, 'bankPayment', e.target.value)}
                        disabled={isSaving}
                        className="w-full"
                        autoComplete="off"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveAll} disabled={isSaving} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Αποθήκευση...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Αποθήκευση Όλων
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
