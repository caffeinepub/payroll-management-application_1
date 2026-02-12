import { useState } from 'react';
import { useGetAllEmployees, useGetPaymentRecords, useAddPaymentRecord, useUpdatePaymentRecord, useDeletePaymentRecord } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CreditCard, Plus, Users, CalendarIcon, Info, Receipt, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import BulkPaymentEntryTable from '../components/BulkPaymentEntryTable';
import PaymentEditDialog from '../components/PaymentEditDialog';
import type { PaymentRecord } from '../backend';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGetAllEmployeesPayments } from '../hooks/useQueries';
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

export default function PaymentsPage() {
  const { data: employees = [], isLoading: employeesLoading } = useGetAllEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<bigint | null>(null);
  const [cashPayment, setCashPayment] = useState('');
  const [bankPayment, setBankPayment] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [isPaymentDateOpen, setIsPaymentDateOpen] = useState(false);

  // For viewing payments by month
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewEmployeeId, setViewEmployeeId] = useState<string>('all'); // 'all' or employee ID

  // For editing and deleting payments
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<PaymentRecord | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: payments = [] } = useGetPaymentRecords(selectedEmployeeId);
  
  // Fetch all employees' payments for the monthly view - independent of individual selection
  const { data: allEmployeesPayments = [] } = useGetAllEmployeesPayments(
    BigInt(viewMonth),
    BigInt(viewYear)
  );
  
  const addPaymentRecord = useAddPaymentRecord();
  const updatePaymentRecord = useUpdatePaymentRecord();
  const deletePaymentRecord = useDeletePaymentRecord();

  const parseDecimalInput = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleAddPayment = () => {
    if (!selectedEmployeeId) {
      return;
    }

    const cashValue = parseDecimalInput(cashPayment);
    const bankValue = parseDecimalInput(bankPayment);

    if (cashValue === 0 && bankValue === 0) {
      return;
    }

    const dateStr = formatDateToYYYYMMDD(paymentDate);

    const payment: PaymentRecord = {
      employeeId: selectedEmployeeId,
      month: BigInt(paymentDate.getMonth() + 1),
      year: BigInt(paymentDate.getFullYear()),
      cashPayment: cashValue,
      bankPayment: bankValue,
      paymentDate: dateStr,
    };

    addPaymentRecord.mutate(payment, {
      onSuccess: () => {
        setCashPayment('');
        setBankPayment('');
        setPaymentDate(new Date());
      },
    });
  };

  const handleEditPayment = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedPayment = (originalPaymentDate: string, updatedPayment: PaymentRecord) => {
    if (!editingPayment) return;

    updatePaymentRecord.mutate(
      {
        employeeId: editingPayment.employeeId,
        originalPaymentDate: originalPaymentDate,
        updatedPayment: updatedPayment,
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingPayment(null);
        },
      }
    );
  };

  const handleDeletePayment = (payment: PaymentRecord) => {
    setDeletingPayment(payment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeletePayment = () => {
    if (!deletingPayment) return;

    deletePaymentRecord.mutate(
      {
        employeeId: deletingPayment.employeeId,
        month: deletingPayment.month,
        year: deletingPayment.year,
        paymentDate: deletingPayment.paymentDate,
      },
      {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setDeletingPayment(null);
        },
      }
    );
  };

  const getEmployeeName = (employeeId: bigint): string => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee ? employee.fullName : 'Άγνωστος';
  };

  const monthNames = [
    'Ιανουάριος',
    'Φεβρουάριος',
    'Μάρτιος',
    'Απρίλιος',
    'Μάιος',
    'Ιούνιος',
    'Ιούλιος',
    'Αύγουστος',
    'Σεπτέμβριος',
    'Οκτώβριος',
    'Νοέμβριος',
    'Δεκέμβριος',
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Filter payments for selected employee and month
  const filteredPayments = selectedEmployeeId
    ? payments.filter((p) => p.employeeId === selectedEmployeeId)
    : [];

  // Group filtered payments by month/year
  const groupedByMonth = new Map<string, PaymentRecord[]>();
  filteredPayments.forEach((payment) => {
    const key = `${payment.month}-${payment.year}`;
    if (!groupedByMonth.has(key)) {
      groupedByMonth.set(key, []);
    }
    groupedByMonth.get(key)!.push(payment);
  });

  // Sort months chronologically (most recent first)
  const sortedMonthKeys = Array.from(groupedByMonth.keys()).sort((a, b) => {
    const [monthA, yearA] = a.split('-').map(Number);
    const [monthB, yearB] = b.split('-').map(Number);
    if (yearA !== yearB) return yearB - yearA;
    return monthB - monthA;
  });

  // Get employees to display in monthly view based on selection
  // This is now completely independent of the individual payment entry selection
  const getEmployeesToDisplayInMonthlyView = () => {
    if (viewEmployeeId === 'all') {
      // Return all employees' payment data from the backend query
      return allEmployeesPayments;
    } else {
      // Return only the selected employee's payment data
      const employeePaymentData = allEmployeesPayments.find(
        (ep) => ep.employeeId.toString() === viewEmployeeId
      );
      return employeePaymentData ? [employeePaymentData] : [];
    }
  };

  const employeePaymentsToDisplay = getEmployeesToDisplayInMonthlyView();

  // Calculate grand totals for all employees view
  const grandTotalCash = employeePaymentsToDisplay.reduce((sum, ep) => sum + ep.totalCashPayments, 0);
  const grandTotalBank = employeePaymentsToDisplay.reduce((sum, ep) => sum + ep.totalBankPayments, 0);
  const grandTotal = grandTotalCash + grandTotalBank;

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Πληρωμές</h2>
        <p className="text-muted-foreground">Καταχώρηση και διαχείριση μηνιαίων πληρωμών</p>
      </div>

      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="individual" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Ατομική Καταχώρηση
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <Users className="h-4 w-4" />
            Μαζική Καταχώρηση
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2">
            <Receipt className="h-4 w-4" />
            Προβολή ανά Μήνα
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Νέα Πληρωμή</CardTitle>
              <CardDescription>Καταχωρήστε πληρωμή για εργαζόμενο</CardDescription>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Φόρτωση εργαζομένων...</div>
                </div>
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν εργαζόμενοι</h3>
                  <p className="text-muted-foreground text-center">
                    Προσθέστε εργαζόμενους πρώτα για να καταχωρήσετε πληρωμές
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Εργαζόμενος</Label>
                    <Select
                      value={selectedEmployeeId?.toString() || ''}
                      onValueChange={(value) => setSelectedEmployeeId(BigInt(value))}
                    >
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
                    <Label>Ημερομηνία Πληρωμής</Label>
                    <Popover open={isPaymentDateOpen} onOpenChange={setIsPaymentDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !paymentDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {paymentDate ? format(paymentDate, 'dd/MM/yyyy', { locale: el }) : 'Επιλέξτε ημερομηνία'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={paymentDate}
                          onSelect={(date) => {
                            if (date) {
                              setPaymentDate(date);
                              setIsPaymentDateOpen(false);
                            }
                          }}
                          initialFocus
                          locale={el}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cashPayment">Πληρωμή Μετρητών (€)</Label>
                      <Input
                        id="cashPayment"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={cashPayment}
                        onChange={(e) => setCashPayment(e.target.value)}
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bankPayment">Πληρωμή Τράπεζας (€)</Label>
                      <Input
                        id="bankPayment"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={bankPayment}
                        onChange={(e) => setBankPayment(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleAddPayment}
                    disabled={!selectedEmployeeId || addPaymentRecord.isPending}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {addPaymentRecord.isPending ? 'Αποθήκευση...' : 'Προσθήκη Πληρωμής'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedEmployeeId && (
            <Card>
              <CardHeader>
                <CardTitle>Ιστορικό Πληρωμών - {getEmployeeName(selectedEmployeeId)}</CardTitle>
                <CardDescription>Όλες οι καταχωρημένες πληρωμές ομαδοποιημένες ανά μήνα</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPayments.length > 0 ? (
                  <div className="space-y-6">
                    {sortedMonthKeys.map((monthKey) => {
                      const [month, year] = monthKey.split('-').map(Number);
                      const monthPayments = groupedByMonth.get(monthKey)!;
                      
                      // Sort payments by date within the month
                      const sortedPayments = [...monthPayments].sort((a, b) => {
                        const dateA = new Date(a.paymentDate.split('-').reverse().join('-'));
                        const dateB = new Date(b.paymentDate.split('-').reverse().join('-'));
                        return dateB.getTime() - dateA.getTime();
                      });

                      const totalCash = monthPayments.reduce((sum, p) => sum + p.cashPayment, 0);
                      const totalBank = monthPayments.reduce((sum, p) => sum + p.bankPayment, 0);
                      const totalAll = totalCash + totalBank;

                      return (
                        <div key={monthKey} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{monthNames[month - 1]} {year}</h3>
                              <p className="text-sm text-muted-foreground">
                                {monthPayments.length} {monthPayments.length === 1 ? 'πληρωμή' : 'πληρωμές'}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">{totalAll.toFixed(2)}€</div>
                              <div className="text-xs text-muted-foreground">Σύνολο Μήνα</div>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            {sortedPayments.map((payment, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                                <div className="flex items-center gap-3">
                                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{payment.paymentDate}</span>
                                </div>
                                <div className="flex gap-4 items-center">
                                  {payment.cashPayment > 0 && (
                                    <Badge variant="secondary" className="gap-1">
                                      <span className="text-xs">Μετρητά:</span>
                                      <span className="font-semibold">{payment.cashPayment.toFixed(2)}€</span>
                                    </Badge>
                                  )}
                                  {payment.bankPayment > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                      <span className="text-xs">Τράπεζα:</span>
                                      <span className="font-semibold">{payment.bankPayment.toFixed(2)}€</span>
                                    </Badge>
                                  )}
                                  <span className="font-bold min-w-[80px] text-right">
                                    {(payment.cashPayment + payment.bankPayment).toFixed(2)}€
                                  </span>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditPayment(payment)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                      <span className="sr-only">Επεξεργασία</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeletePayment(payment)}
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Διαγραφή</span>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <Separator />

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center p-2 bg-secondary/50 rounded">
                              <div className="text-muted-foreground">Σύνολο Μετρητών</div>
                              <div className="font-bold text-lg">{totalCash.toFixed(2)}€</div>
                            </div>
                            <div className="text-center p-2 bg-secondary/50 rounded">
                              <div className="text-muted-foreground">Σύνολο Τράπεζας</div>
                              <div className="font-bold text-lg">{totalBank.toFixed(2)}€</div>
                            </div>
                            <div className="text-center p-2 bg-primary/10 rounded">
                              <div className="text-muted-foreground">Γενικό Σύνολο</div>
                              <div className="font-bold text-lg text-primary">{totalAll.toFixed(2)}€</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν πληρωμές</h3>
                    <p className="text-muted-foreground text-center">
                      Δεν έχουν καταχωρηθεί πληρωμές για αυτόν τον εργαζόμενο
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              <strong>Πολλαπλές Πληρωμές:</strong> Μπορείτε να προσθέσετε πολλαπλές πληρωμές για τον ίδιο εργαζόμενο στον ίδιο μήνα με διαφορετικές ημερομηνίες. Όλες οι πληρωμές θα αθροιστούν αυτόματα στη μισθοδοσία.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <BulkPaymentEntryTable employees={employees} />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Προβολή Πληρωμών ανά Μήνα</CardTitle>
              <CardDescription>Δείτε πληρωμές για συγκεκριμένο εργαζόμενο ή όλους τους εργαζόμενους</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="view-employee">Εργαζόμενος</Label>
                  <Select value={viewEmployeeId} onValueChange={setViewEmployeeId}>
                    <SelectTrigger id="view-employee">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Όλοι οι εργαζόμενοι</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id.toString()} value={employee.id.toString()}>
                          {employee.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="view-month">Μήνας</Label>
                  <Select value={viewMonth.toString()} onValueChange={(value) => setViewMonth(parseInt(value))}>
                    <SelectTrigger id="view-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((name, index) => (
                        <SelectItem key={index} value={(index + 1).toString()}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="view-year">Έτος</Label>
                  <Select value={viewYear.toString()} onValueChange={(value) => setViewYear(parseInt(value))}>
                    <SelectTrigger id="view-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-6">
                {employeePaymentsToDisplay.length > 0 ? (
                  <>
                    {employeePaymentsToDisplay.map((employeePayment) => {
                      if (employeePayment.payments.length === 0) return null;

                      // Sort by date
                      const sortedPayments = [...employeePayment.payments].sort((a, b) => {
                        const dateA = new Date(a.paymentDate.split('-').reverse().join('-'));
                        const dateB = new Date(b.paymentDate.split('-').reverse().join('-'));
                        return dateA.getTime() - dateB.getTime();
                      });

                      return (
                        <Card key={employeePayment.employeeId.toString()}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-xl">{employeePayment.employeeName}</CardTitle>
                                <CardDescription>
                                  {employeePayment.payments.length}{' '}
                                  {employeePayment.payments.length === 1 ? 'πληρωμή' : 'πληρωμές'} για{' '}
                                  {monthNames[viewMonth - 1]} {viewYear}
                                </CardDescription>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold">
                                  {(employeePayment.totalCashPayments + employeePayment.totalBankPayments).toFixed(2)}€
                                </div>
                                <div className="text-xs text-muted-foreground">Σύνολο</div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              {sortedPayments.map((payment, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                                  <div className="flex items-center gap-3">
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{payment.paymentDate}</span>
                                  </div>
                                  <div className="flex gap-4 items-center">
                                    {payment.cashPayment > 0 && (
                                      <Badge variant="secondary" className="gap-1">
                                        <span className="text-xs">Μετρητά:</span>
                                        <span className="font-semibold">{payment.cashPayment.toFixed(2)}€</span>
                                      </Badge>
                                    )}
                                    {payment.bankPayment > 0 && (
                                      <Badge variant="outline" className="gap-1">
                                        <span className="text-xs">Τράπεζα:</span>
                                        <span className="font-semibold">{payment.bankPayment.toFixed(2)}€</span>
                                      </Badge>
                                    )}
                                    <span className="font-bold min-w-[80px] text-right">
                                      {(payment.cashPayment + payment.bankPayment).toFixed(2)}€
                                    </span>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditPayment(payment)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Επεξεργασία</span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeletePayment(payment)}
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Διαγραφή</span>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <Separator />

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="text-center p-2 bg-secondary/50 rounded">
                                <div className="text-muted-foreground">Σύνολο Μετρητών</div>
                                <div className="font-bold text-lg">{employeePayment.totalCashPayments.toFixed(2)}€</div>
                              </div>
                              <div className="text-center p-2 bg-secondary/50 rounded">
                                <div className="text-muted-foreground">Σύνολο Τράπεζας</div>
                                <div className="font-bold text-lg">{employeePayment.totalBankPayments.toFixed(2)}€</div>
                              </div>
                              <div className="text-center p-2 bg-primary/10 rounded">
                                <div className="text-muted-foreground">Γενικό Σύνολο</div>
                                <div className="font-bold text-lg text-primary">
                                  {(employeePayment.totalCashPayments + employeePayment.totalBankPayments).toFixed(2)}€
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {viewEmployeeId === 'all' && employeePaymentsToDisplay.length > 1 && (
                      <Card className="border-primary/50 bg-primary/5">
                        <CardHeader>
                          <CardTitle className="text-xl">Γενικό Σύνολο Όλων των Εργαζομένων</CardTitle>
                          <CardDescription>
                            Συνολικές πληρωμές για {monthNames[viewMonth - 1]} {viewYear}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-secondary/50 rounded-lg">
                              <div className="text-muted-foreground mb-2">Σύνολο Μετρητών</div>
                              <div className="font-bold text-2xl">{grandTotalCash.toFixed(2)}€</div>
                            </div>
                            <div className="text-center p-4 bg-secondary/50 rounded-lg">
                              <div className="text-muted-foreground mb-2">Σύνολο Τράπεζας</div>
                              <div className="font-bold text-2xl">{grandTotalBank.toFixed(2)}€</div>
                            </div>
                            <div className="text-center p-4 bg-primary/20 rounded-lg">
                              <div className="text-muted-foreground mb-2">Γενικό Σύνολο</div>
                              <div className="font-bold text-3xl text-primary">{grandTotal.toFixed(2)}€</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <Receipt className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν πληρωμές</h3>
                    <p className="text-muted-foreground text-center">
                      {viewEmployeeId === 'all'
                        ? `Δεν έχουν καταχωρηθεί πληρωμές για ${monthNames[viewMonth - 1]} ${viewYear}`
                        : `Δεν έχουν καταχωρηθεί πληρωμές για τον επιλεγμένο εργαζόμενο για ${monthNames[viewMonth - 1]} ${viewYear}`}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Payment Dialog */}
      {editingPayment && (
        <PaymentEditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          payment={editingPayment}
          onSave={handleSaveEditedPayment}
          isPending={updatePaymentRecord.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Επιβεβαίωση διαγραφής</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την πληρωμή;
              <br />
              <br />
              {deletingPayment && (
                <div className="space-y-1 text-sm">
                  <div>
                    <strong>Ημερομηνία:</strong> {deletingPayment.paymentDate}
                  </div>
                  <div>
                    <strong>Μετρητά:</strong> {deletingPayment.cashPayment.toFixed(2)}€
                  </div>
                  <div>
                    <strong>Τράπεζα:</strong> {deletingPayment.bankPayment.toFixed(2)}€
                  </div>
                </div>
              )}
              <br />
              Η ενέργεια αυτή δεν μπορεί να αναιρεθεί και η μισθοδοσία θα επανυπολογιστεί αυτόματα.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePaymentRecord.isPending}>Όχι</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePayment}
              disabled={deletePaymentRecord.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePaymentRecord.isPending ? 'Διαγραφή...' : 'Ναι'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

