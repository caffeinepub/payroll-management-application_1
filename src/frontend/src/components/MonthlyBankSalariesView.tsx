import { useState } from 'react';
import { useGetAllEmployees, useDeleteMonthlyBankSalary } from '../hooks/useQueries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useActor } from '../hooks/useActor';
import type { MonthlyBankSalary } from '../backend';
import MonthlyBankSalaryEditDialog from './MonthlyBankSalaryEditDialog';

export default function MonthlyBankSalariesView() {
  const { data: employees = [], isLoading: employeesLoading } = useGetAllEmployees();
  const { actor, isFetching: actorFetching } = useActor();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentDate.getFullYear().toString());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<MonthlyBankSalary | null>(null);

  const deleteMutation = useDeleteMonthlyBankSalary();

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

  // Fetch bank salaries for all employees for the selected month/year
  const { data: bankSalaries = [], isLoading: salariesLoading } = useQuery({
    queryKey: ['monthlyBankSalaries', 'all', selectedMonth, selectedYear],
    queryFn: async () => {
      if (!actor) return [];
      
      const allSalaries = await actor.getAllMonthlyBankSalaries();
      
      // Filter by selected month and year
      const month = BigInt(selectedMonth);
      const year = BigInt(selectedYear);
      
      return allSalaries.filter(s => s.month === month && s.year === year);
    },
    enabled: !!actor && !actorFetching && employees.length > 0,
    retry: 2,
    retryDelay: 1000,
  });

  const isLoading = employeesLoading || salariesLoading;

  const handleEdit = (salary: MonthlyBankSalary) => {
    setSelectedSalary(salary);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (salary: MonthlyBankSalary) => {
    setSelectedSalary(salary);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSalary) return;

    try {
      await deleteMutation.mutateAsync({
        id: selectedSalary.id,
        employeeId: selectedSalary.employeeId,
        month: selectedSalary.month,
        year: selectedSalary.year,
      });

      setDeleteDialogOpen(false);
      setSelectedSalary(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getEmployeeName = (employeeId: bigint) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.fullName || 'Άγνωστος';
  };

  const getEmployeeType = (employeeId: bigint) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.employeeType || 'unknown';
  };

  // Group salaries by employee and calculate totals
  const salariesByEmployee = bankSalaries.reduce((acc, salary) => {
    const empId = salary.employeeId.toString();
    if (!acc[empId]) {
      acc[empId] = {
        employeeId: salary.employeeId,
        employeeName: getEmployeeName(salary.employeeId),
        employeeType: getEmployeeType(salary.employeeId),
        salaries: [],
        total: 0,
      };
    }
    acc[empId].salaries.push(salary);
    acc[empId].total += salary.amount;
    return acc;
  }, {} as Record<string, { employeeId: bigint; employeeName: string; employeeType: string; salaries: MonthlyBankSalary[]; total: number }>);

  const employeeGroups = Object.values(salariesByEmployee);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="view-month">Μήνας</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger id="view-month">
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
          <Label htmlFor="view-year">Έτος</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger id="view-year">
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

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : bankSalaries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Δεν υπάρχουν καταχωρημένοι μηνιαίοι μισθοί τράπεζας για τον επιλεγμένο μήνα
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Σημείωση:</strong> Εμφανίζονται όλες οι μεμονωμένες καταχωρήσεις μηνιαίων μισθών τράπεζας. Όταν υπάρχουν πολλαπλές καταχωρήσεις για τον ίδιο εργαζόμενο και μήνα, το σύστημα τις αθροίζει αυτόματα στη μισθοδοσία.
            </p>
          </div>

          {employeeGroups.map((group) => (
            <div key={group.employeeId.toString()} className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{group.employeeName}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-background">
                    {group.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωριαίος'}
                  </span>
                </div>
                {group.salaries.length > 1 && (
                  <div className="text-sm font-medium">
                    Σύνολο: €{group.total.toFixed(2)} ({group.salaries.length} καταχωρήσεις)
                  </div>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Μήνας</TableHead>
                    <TableHead>Έτος</TableHead>
                    <TableHead className="text-right">Ποσό (€)</TableHead>
                    <TableHead className="text-right">Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.salaries.map((salary) => (
                    <TableRow key={`${salary.id.toString()}-${salary.employeeId.toString()}`}>
                      <TableCell>{months.find(m => m.value === salary.month.toString())?.label}</TableCell>
                      <TableCell>{salary.year.toString()}</TableCell>
                      <TableCell className="text-right font-medium">
                        €{salary.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(salary)}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Επεξεργασία
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(salary)}
                            className="gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Διαγραφή
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}

      {selectedSalary && (
        <MonthlyBankSalaryEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          salary={selectedSalary}
          employeeName={getEmployeeName(selectedSalary.employeeId)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Επιβεβαίωση διαγραφής</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την καταχώρηση μηνιαίου μισθού τράπεζας;
              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί και θα επηρεάσει τη μισθοδοσία.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Όχι</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ναι
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
