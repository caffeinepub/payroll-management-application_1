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
import type { Employee } from '../types';

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
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const updateLeaveDaysUsed = useUpdateLeaveDaysUsed();
  const resetAllLeaveRecords = useResetAllLeaveRecords();

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let i = 0; i < 6; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, [currentYear]);

  const employeeLeaveData = useMemo(() => {
    return employees.map((employee) => {
      const leaveRecord = leaveRecords.find(
        (record) => record.employeeId === employee.id
      );

      const totalDays = Number(employee.totalAnnualLeaveDays);
      const usedDays = leaveRecord ? Number(leaveRecord.leaveDaysUsed) : 0;
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

  const handleStartEditingUsedDays = (employeeId: number, currentUsedDays: number) => {
    setEditingEmployeeId(employeeId);
    setEditingValue(currentUsedDays.toString());
  };

  const handleCancelEditingUsedDays = () => {
    setEditingEmployeeId(null);
    setEditingValue('');
  };

  const handleSaveUsedDays = async (employeeId: number, totalDays: number) => {
    const newUsedDays = parseInt(editingValue, 10);

    if (isNaN(newUsedDays) || newUsedDays < 0) {
      return;
    }

    if (newUsedDays > totalDays) {
      return;
    }

    try {
      await updateLeaveDaysUsed.mutateAsync({
        employeeId,
        newLeaveDaysUsed: newUsedDays,
      });

      setEditingEmployeeId(null);
      setEditingValue('');
    } catch (error) {
      console.error('Error updating leave days:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, employeeId: number, totalDays: number) => {
    if (e.key === 'Enter') {
      handleSaveUsedDays(employeeId, totalDays);
    } else if (e.key === 'Escape') {
      handleCancelEditingUsedDays();
    }
  };

  const handleResetAllLeave = async () => {
    const defaultLeaveDays = 20;
    try {
      await resetAllLeaveRecords.mutateAsync(defaultLeaveDays);
      setResetDialogOpen(false);
    } catch (error) {
      console.error('Error resetting leave records:', error);
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Διαχείριση Αδειών</h2>
          <p className="text-muted-foreground">Παρακολούθηση και διαχείριση αδειών εργαζομένων</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBulkAddLeave} className="gap-2">
            <Users className="h-4 w-4" />
            Μαζική Προσθήκη Άδειας
          </Button>
          {selectedYear === currentYear && (
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(true)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <RefreshCw className="h-4 w-4" />
              Επαναφορά Αδειών
            </Button>
          )}
        </div>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Έτος:</label>
        <Select
          value={selectedYear.toString()}
          onValueChange={(v) => setSelectedYear(parseInt(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Umbrella className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν εργαζόμενοι</h3>
            <p className="text-muted-foreground text-center">
              Προσθέστε εργαζόμενους για να διαχειριστείτε τις άδειές τους
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Υπόλοιπα Αδειών {selectedYear}</CardTitle>
            <CardDescription>
              Επισκόπηση αδειών για όλους τους εργαζόμενους
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Εργαζόμενος</TableHead>
                  <TableHead>Τύπος</TableHead>
                  <TableHead className="text-center">Συνολικές</TableHead>
                  <TableHead className="text-center">Χρησιμοποιημένες</TableHead>
                  <TableHead className="text-center">Υπόλοιπο</TableHead>
                  <TableHead className="text-center">Πρόοδος</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeLeaveData.map(({ employee, totalDays, usedDays, remainingDays }) => (
                  <TableRow key={employee.id.toString()}>
                    <TableCell className="font-medium">{employee.fullName}</TableCell>
                    <TableCell>
                      <Badge variant={employee.employeeType === 'monthly' ? 'default' : 'secondary'}>
                        {employee.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωριαίος'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{totalDays}</TableCell>
                    <TableCell className="text-center">
                      {editingEmployeeId === employee.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max={totalDays}
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, employee.id, totalDays)}
                            className="w-16 h-7 text-center text-sm"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleSaveUsedDays(employee.id, totalDays)}
                            disabled={updateLeaveDaysUsed.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={handleCancelEditingUsedDays}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="hover:underline cursor-pointer"
                          onClick={() => handleStartEditingUsedDays(employee.id, usedDays)}
                        >
                          {usedDays}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={remainingDays <= 0 ? 'text-destructive font-semibold' : ''}>
                        {remainingDays}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={totalDays > 0 ? (usedDays / totalDays) * 100 : 0}
                          className="h-2 flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-8">
                          {totalDays > 0 ? Math.round((usedDays / totalDays) * 100) : 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditLeave(employee)}
                        className="gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Επεξεργασία
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Leave Edit Dialog */}
      <LeaveEditDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseEditDialog();
          else setIsEditDialogOpen(true);
        }}
        employee={selectedEmployee}
      />

      {/* Bulk Leave Dialog */}
      <BulkLeaveDayDialog
        open={isBulkDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseBulkDialog();
          else setIsBulkDialogOpen(true);
        }}
      />

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Επαναφορά Αδειών</AlertDialogTitle>
            <AlertDialogDescription>
              Αυτή η ενέργεια θα επαναφέρει τις χρησιμοποιημένες άδειες όλων των εργαζομένων σε 0 για το τρέχον έτος. Δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetAllLeave}
              disabled={resetAllLeaveRecords.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Επαναφορά
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
