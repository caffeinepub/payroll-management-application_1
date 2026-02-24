import { useState } from 'react';
import { useGetAllEmployees, useGetAllEmployeesPayments, useAddPayment, useUpdatePayment, useDeletePayment } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PaymentRecord } from '../types';
import BulkPaymentEntryTable from '../components/BulkPaymentEntryTable';
import PaymentEditDialog from '../components/PaymentEditDialog';

export default function PaymentsPage() {
  const { data: employees = [], isLoading: employeesLoading } = useGetAllEmployees();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentDate.getFullYear().toString());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [cashPayment, setCashPayment] = useState<string>('');
  const [bankPayment, setBankPayment] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);

  const addPayment = useAddPayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const { data: allEmployeesPayments = [], isLoading: paymentsLoading } = useGetAllEmployeesPayments(
    parseInt(selectedMonth),
    parseInt(selectedYear)
  );

  const months = [
    { value: '1', label: 'Ιανουάριος' },
    { value: '2', label: 'Φεβρουάριος' },
    { value: '3', label: 'Μάρτιος' },
    { value: '4', label: 'Απρίλιος' },
    { value: '5', label: 'Μάιος' },
    { value: '6', label: 'Ιούνιος' },
    { value: '7', label: 'Ιούλιος' },
    { value: '8', label: 'Αύγουστος' },
    { value: '9', label: 'Σεπτέμβριος' },
    { value: '10', label: 'Οκτώβριος' },
    { value: '11', label: 'Νοέμβριος' },
    { value: '12', label: 'Δεκέμβριος' },
  ];

  const years = Array.from({ length: 10 }, (_, i) => {
    const year = currentDate.getFullYear() - 2 + i;
    return { value: year.toString(), label: year.toString() };
  });

  const parseDecimal = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setPaymentDate(date);
      setIsCalendarOpen(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeId) {
      toast.error('Παρακαλώ επιλέξτε εργαζόμενο');
      return;
    }

    const cashValue = parseDecimal(cashPayment);
    const bankValue = parseDecimal(bankPayment);

    if (cashValue === 0 && bankValue === 0) {
      toast.error('Παρακαλώ εισάγετε τουλάχιστον μία πληρωμή');
      return;
    }

    const y = paymentDate.getFullYear();
    const m = String(paymentDate.getMonth() + 1).padStart(2, '0');
    const d = String(paymentDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const payment: PaymentRecord = {
      employeeId: parseInt(selectedEmployeeId),
      month: parseInt(selectedMonth),
      year: parseInt(selectedYear),
      cashPayment: cashValue,
      bankPayment: bankValue,
      paymentDate: dateStr,
    };

    try {
      await addPayment.mutateAsync(payment);
      setSelectedEmployeeId('');
      setCashPayment('');
      setBankPayment('');
      setPaymentDate(new Date());
    } catch (error) {
      // handled by mutation
    }
  };

  const handleEditPayment = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setEditDialogOpen(true);
  };

  const handleSaveEditedPayment = async (updatedPayment: PaymentRecord, originalDate: string) => {
    try {
      await updatePayment.mutateAsync({
        employeeId: updatedPayment.employeeId,
        month: updatedPayment.month,
        year: updatedPayment.year,
        paymentDate: originalDate,
        updatedPayment,
      });
      setEditDialogOpen(false);
      setEditingPayment(null);
    } catch (error) {
      // handled by mutation
    }
  };

  const handleDeletePayment = async (payment: PaymentRecord) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την πληρωμή;')) {
      return;
    }
    try {
      await deletePayment.mutateAsync({
        employeeId: payment.employeeId,
        month: payment.month,
        year: payment.year,
        paymentDate: payment.paymentDate,
      });
    } catch (error) {
      // handled by mutation
    }
  };

  // Helper to get employee name from id
  const getEmployeeName = (employeeId: number) => {
    return employees.find((e) => e.id === employeeId)?.fullName ?? `Εργαζόμενος #${employeeId}`;
  };

  // Format date for bulk payment table
  const bulkDateStr = (() => {
    const y = paymentDate.getFullYear();
    const m = String(paymentDate.getMonth() + 1).padStart(2, '0');
    const d = String(paymentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Πληρωμές</h1>
        <p className="text-muted-foreground">
          Διαχειριστείτε τις πληρωμές των εργαζομένων
        </p>
      </div>

      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="individual">Ατομική Καταχώρηση</TabsTrigger>
          <TabsTrigger value="bulk">Μαζική Καταχώρηση</TabsTrigger>
          <TabsTrigger value="monthly">Μηνιαία Προβολή</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Προσθήκη Πληρωμής</CardTitle>
              <CardDescription>
                Καταχωρήστε μια νέα πληρωμή για έναν εργαζόμενο
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">Μήνας</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger id="month">
                        <SelectValue placeholder="Επιλέξτε μήνα" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Έτος</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger id="year">
                        <SelectValue placeholder="Επιλέξτε έτος" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                            {year.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee">Εργαζόμενος</Label>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger id="employee">
                      <SelectValue placeholder="Επιλέξτε εργαζόμενο" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id.toString()} value={employee.id.toString()}>
                          {employee.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Ημερομηνία Πληρωμής</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="paymentDate"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !paymentDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {paymentDate ? format(paymentDate, 'dd/MM/yyyy', { locale: el }) : <span>Επιλέξτε ημερομηνία</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={handleDateSelect}
                        locale={el}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cashPayment">Πληρωμή Μετρητών (€)</Label>
                    <Input
                      id="cashPayment"
                      type="text"
                      placeholder="0.00"
                      value={cashPayment}
                      onChange={(e) => setCashPayment(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankPayment">Πληρωμή Τράπεζας (€)</Label>
                    <Input
                      id="bankPayment"
                      type="text"
                      placeholder="0.00"
                      value={bankPayment}
                      onChange={(e) => setBankPayment(e.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={addPayment.isPending} className="w-full">
                  {addPayment.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Προσθήκη...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Προσθήκη Πληρωμής
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <BulkPaymentEntryTable
            selectedDate={bulkDateStr}
            selectedMonth={parseInt(selectedMonth)}
            selectedYear={parseInt(selectedYear)}
          />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Μηνιαία Προβολή Πληρωμών</CardTitle>
              <CardDescription>
                Προβολή όλων των πληρωμών για τον επιλεγμένο μήνα
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="viewMonth">Μήνας</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger id="viewMonth">
                      <SelectValue placeholder="Επιλέξτε μήνα" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="viewYear">Έτος</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="viewYear">
                      <SelectValue placeholder="Επιλέξτε έτος" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allEmployeesPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Δεν υπάρχουν πληρωμές για αυτόν τον μήνα
                </div>
              ) : (
                <div className="space-y-6">
                  {allEmployeesPayments.map((employeePayments) => {
                    const totalCash = employeePayments.payments.reduce((s, p) => s + p.cashPayment, 0);
                    const totalBank = employeePayments.payments.reduce((s, p) => s + p.bankPayment, 0);
                    return (
                      <div key={employeePayments.employeeId.toString()} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">{getEmployeeName(employeePayments.employeeId)}</h3>
                          <div className="text-sm text-muted-foreground">
                            Σύνολο: €{(totalCash + totalBank).toFixed(2)}
                          </div>
                        </div>

                        {employeePayments.payments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Δεν υπάρχουν πληρωμές</p>
                        ) : (
                          <div className="border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Ημερομηνία</TableHead>
                                  <TableHead>Μετρητά (€)</TableHead>
                                  <TableHead>Τράπεζα (€)</TableHead>
                                  <TableHead>Σύνολο (€)</TableHead>
                                  <TableHead className="text-right">Ενέργειες</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {employeePayments.payments.map((payment, index) => (
                                  <TableRow key={`${payment.paymentDate}-${index}`}>
                                    <TableCell>{payment.paymentDate}</TableCell>
                                    <TableCell>€{payment.cashPayment.toFixed(2)}</TableCell>
                                    <TableCell>€{payment.bankPayment.toFixed(2)}</TableCell>
                                    <TableCell>€{(payment.cashPayment + payment.bankPayment).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditPayment(payment)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeletePayment(payment)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingPayment && (
        <PaymentEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          payment={editingPayment}
          onSave={handleSaveEditedPayment}
          isPending={updatePayment.isPending}
        />
      )}
    </div>
  );
}
