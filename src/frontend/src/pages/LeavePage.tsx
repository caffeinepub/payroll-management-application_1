import { useState, useMemo } from 'react';
import { useGetAllEmployees, useGetAllLeaveRecords, useUpdateLeaveDaysUsed, useResetAllLeaveRecords } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Umbrella, Edit, Users, Check, X, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import BulkLeaveDayDialog from '../components/BulkLeaveDayDialog';
import LeaveEditDialog from '../components/LeaveEditDialog';
import type { Employee } from '../backend';

export default function LeavePage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  const { data: employees = [], isLoading: employeesLoading } = useGetAllEmployees();
  const { data: leaveRecords = [], isLoading: leaveRecordsLoading } = useGetAllLeaveRecords();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  
  // State for inline editing of used leave days
  const [editingEmployeeId, setEditingEmployeeId] = useState<bigint | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  const updateLeaveDaysUsed = useUpdateLeaveDaysUsed();
  const resetAllLeaveRecords = useResetAllLeaveRecords();

  // Generate year options (current year and 5 years back)
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let i = 0; i < 6; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, [currentYear]);

  const employeeLeaveData = useMemo(() => {
    return employees.map((employee) => {
      // Find the leave record for this employee
      const leaveRecord = leaveRecords.find(
        (record) => record.employeeId.toString() === employee.id.toString()
      );
      
      // ALWAYS use the employee's totalAnnualLeaveDays as the source of truth
      const totalDays = Number(employee.totalAnnualLeaveDays);
      
      // Get used days from leave record, or 0 if no record exists
      const usedDays = leaveRecord ? Number(leaveRecord.leaveDaysUsed) : 0;
      
      // Calculate remaining days based on employee's current total and used days
      const remainingDays = Math.max(0, totalDays - usedDays);
      
      return {
        employee,
        totalDays,
        usedDays,
        remainingDays,
      };
    });
  }, [employees, leaveRecords]);

  const isLoading = employeesLoading || leaveRecordsLoading;

  const handleEditLeave = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleBulkAddLeave = () => {
    setIsBulkDialogOpen(true);
  };

  const handleCloseBulkDialog = () => {
    setIsBulkDialogOpen(false);
  };

  const handleStartEditingUsedDays = (employeeId: bigint, currentUsedDays: number) => {
    setEditingEmployeeId(employeeId);
    setEditingValue(currentUsedDays.toString());
  };

  const handleCancelEditingUsedDays = () => {
    setEditingEmployeeId(null);
    setEditingValue('');
  };

  const handleSaveUsedDays = async (employeeId: bigint, totalDays: number) => {
    const newUsedDays = parseInt(editingValue, 10);
    
    // Validation
    if (isNaN(newUsedDays) || newUsedDays < 0) {
      return;
    }
    
    if (newUsedDays > totalDays) {
      return;
    }
    
    try {
      await updateLeaveDaysUsed.mutateAsync({
        employeeId,
        newLeaveDaysUsed: BigInt(newUsedDays),
      });
      
      setEditingEmployeeId(null);
      setEditingValue('');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, employeeId: bigint, totalDays: number) => {
    if (e.key === 'Enter') {
      handleSaveUsedDays(employeeId, totalDays);
    } else if (e.key === 'Escape') {
      handleCancelEditingUsedDays();
    }
  };

  const handleResetAllLeaves = () => {
    setResetDialogOpen(true);
  };

  const handleConfirmReset = async () => {
    try {
      // Get the default annual leave days (we'll use the first employee's value or 20 as default)
      const defaultLeaveDays = employees.length > 0 ? Number(employees[0].totalAnnualLeaveDays) : 20;
      
      await resetAllLeaveRecords.mutateAsync(BigInt(defaultLeaveDays));
      setResetDialogOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Διαχείριση Αδειών</h2>
          <p className="text-muted-foreground">Παρακολουθήστε τις άδειες των εργαζομένων</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Φόρτωση...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Διαχείριση Αδειών</h2>
          <p className="text-muted-foreground">Παρακολουθήστε τις άδειες των εργαζομένων ανά έτος</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Επιλέξτε έτος" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  Έτος {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {employeeLeaveData.length > 0 && (
            <>
              <Button onClick={handleBulkAddLeave} size="lg">
                <Users className="h-5 w-5 mr-2" />
                Προσθήκη Άδειας σε Όλους
              </Button>
              {selectedYear === currentYear && (
                <Button onClick={handleResetAllLeaves} size="lg" variant="outline">
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Επαναφορά Αδειών
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {employeeLeaveData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Umbrella className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν εργαζόμενοι</h3>
            <p className="text-muted-foreground text-center">
              Προσθέστε εργαζομένους για να διαχειριστείτε τις άδειές τους
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Κατάσταση Αδειών - Έτος {selectedYear}</CardTitle>
            <CardDescription>Επισκόπηση αδειών όλων των εργαζομένων για το επιλεγμένο έτος</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Εργαζόμενος</TableHead>
                  <TableHead className="text-center">Σύνολο Ημερών</TableHead>
                  <TableHead className="text-center">Χρησιμοποιημένες</TableHead>
                  <TableHead className="text-center">Υπόλοιπο</TableHead>
                  <TableHead>Πρόοδος</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeLeaveData.map(({ employee, totalDays, usedDays, remainingDays }) => {
                  const usagePercentage = totalDays > 0 ? (usedDays / totalDays) * 100 : 0;
                  const isEditing = editingEmployeeId?.toString() === employee.id.toString();

                  return (
                    <TableRow key={employee.id.toString()}>
                      <TableCell className="font-medium">{employee.fullName}</TableCell>
                      <TableCell className="text-center">{totalDays}</TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max={totalDays}
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, employee.id, totalDays)}
                              className="w-16 h-8 text-center"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSaveUsedDays(employee.id, totalDays)}
                              disabled={updateLeaveDaysUsed.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={handleCancelEditingUsedDays}
                              disabled={updateLeaveDaysUsed.isPending}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant={usedDays > totalDays * 0.8 ? 'destructive' : 'secondary'}
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => handleStartEditingUsedDays(employee.id, usedDays)}
                          >
                            {usedDays}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={remainingDays < totalDays * 0.2 ? 'outline' : 'default'}>
                          {remainingDays}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={usagePercentage} className="flex-1" />
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {usagePercentage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditLeave(employee)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Επεξεργασία
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Αυτόματη Ενημέρωση Αδειών & Ετήσια Επαναφορά</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Οι ημέρες άδειας υπολογίζονται και ενημερώνονται <strong>αυτόματα</strong> όταν προσθέτετε μια άδεια.
          </p>
          <p>
            Κάθε φορά που προσθέτετε μια άδεια, το σύστημα:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Αυξάνει τις χρησιμοποιημένες ημέρες άδειας κατά 1</li>
            <li>Μειώνει το υπόλοιπο διαθέσιμων ημερών κατά 1</li>
            <li>Ενημερώνει αμέσως την κατάσταση που βλέπετε εδώ</li>
            <li>Καταχωρεί την άδεια στο ημερολόγιο εργασίας (8 ώρες)</li>
            <li>Ανανεώνει αυτόματα τη μισθοδοσία</li>
          </ul>
          <p className="pt-2">
            Μπορείτε επίσης να σημειώσετε μια ημέρα ως "Άδεια" απευθείας από το ημερολόγιο εργασίας!
          </p>
          <p className="pt-2 font-medium">
            Χρησιμοποιήστε το κουμπί "Προσθήκη Άδειας σε Όλους" για να προσθέσετε μια ημέρα άδειας σε όλους τους εργαζομένους ταυτόχρονα.
          </p>
          <p className="pt-2 font-medium">
            Χρησιμοποιήστε το κουμπί "Επεξεργασία" για να δείτε και να διαγράψετε συγκεκριμένες ημέρες άδειας ανά έτος.
          </p>
          <p className="pt-2 text-blue-600 dark:text-blue-400 font-medium">
            Σημείωση: Το σύνολο ημερών άδειας συγχρονίζεται αυτόματα με το πεδίο "Συνολικές ημέρες άδειας" του προφίλ κάθε εργαζομένου.
          </p>
          <p className="pt-2 text-green-600 dark:text-green-400 font-medium">
            💡 Συμβουλή: Κάντε κλικ στον αριθμό των χρησιμοποιημένων ημερών για να τον επεξεργαστείτε απευθείας!
          </p>
          <p className="pt-2 text-orange-600 dark:text-orange-400 font-medium">
            🔄 Ετήσια Επαναφορά: Χρησιμοποιήστε το κουμπί "Επαναφορά Αδειών" κάθε Ιανουάριο για να μηδενίσετε τις χρησιμοποιημένες ημέρες άδειας όλων των εργαζομένων και να ανανεώσετε τα ετήσια δικαιώματα.
          </p>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <LeaveEditDialog
          employee={selectedEmployee}
          open={isEditDialogOpen}
          onOpenChange={handleCloseEditDialog}
        />
      )}

      <BulkLeaveDayDialog
        open={isBulkDialogOpen}
        onOpenChange={handleCloseBulkDialog}
      />

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Επιβεβαίωση Επαναφοράς Αδειών</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να επαναφέρετε τις άδειες όλων των εργαζομένων;
              <br />
              <br />
              Αυτή η ενέργεια θα:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Μηδενίσει τις χρησιμοποιημένες ημέρες άδειας για όλους τους εργαζομένους</li>
                <li>Ανανεώσει τα ετήσια δικαιώματα άδειας με βάση το προφίλ κάθε εργαζομένου</li>
                <li>Επανυπολογίσει αυτόματα τη μισθοδοσία</li>
              </ul>
              <br />
              <strong>Προσοχή:</strong> Αυτή η ενέργεια δεν μπορεί να αναιρεθεί!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetAllLeaveRecords.isPending}>
              Ακύρωση
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              disabled={resetAllLeaveRecords.isPending}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {resetAllLeaveRecords.isPending ? 'Επαναφορά...' : 'Επιβεβαίωση Επαναφοράς'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
