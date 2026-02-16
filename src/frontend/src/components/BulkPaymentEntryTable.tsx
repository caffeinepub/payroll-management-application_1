import { useState, useMemo, useEffect } from 'react';
import { useAddPaymentsBulk } from '../hooks/useQueries';
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

  const addPaymentsBulk = useAddPaymentsBulk();

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

      // Save all payments using the bulk mutation
      await addPaymentsBulk.mutateAsync(paymentsBulk);

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
    } catch (error: any) {
      // Error is already handled by the mutation
      console.error('Error saving bulk payments:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Μαζική Καταχώρηση Πληρωμών</CardTitle>
        <CardDescription>
          Καταχωρήστε πληρωμές για όλους τους εργαζομένους για μια συγκεκριμένη ημερομηνία
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: el }) : <span>Επιλέξτε ημερομηνία</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={el}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={handleSaveAll} disabled={isSaving || addPaymentsBulk.isPending} className="gap-2">
            {isSaving || addPaymentsBulk.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Αποθήκευση...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Αποθήκευση Όλων
              </>
            )}
          </Button>
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Δεν υπάρχουν εργαζόμενοι
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Όνομα Εργαζομένου</TableHead>
                  <TableHead className="w-[30%]">Πληρωμή Μετρητών (€)</TableHead>
                  <TableHead className="w-[30%]">Πληρωμή Τράπεζας (€)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const entry = entries.get(employee.id.toString());
                  return (
                    <TableRow key={employee.id.toString()}>
                      <TableCell className="font-medium">{employee.fullName}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={entry?.cashPayment || ''}
                          onChange={(e) => handleEntryChange(employee.id, 'cashPayment', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={entry?.bankPayment || ''}
                          onChange={(e) => handleEntryChange(employee.id, 'bankPayment', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
