import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Search, Edit, Trash2, Folder, Loader2 } from 'lucide-react';
import { useGetAllEmployees, useAddEmployee, useUpdateEmployee, useDeleteEmployee } from '../hooks/useQueries';
import EmployeeDialog from '../components/EmployeeDialog';
import EmployeeFolderView from '../components/EmployeeFolderView';
import type { Employee } from '../types';

export default function EmployeesPage() {
  const { data: employees = [], isLoading } = useGetAllEmployees();
  const addEmployee = useAddEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [folderEmployee, setFolderEmployee] = useState<Employee | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = employees.filter((e: Employee) =>
    e.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data: {
    fullName: string;
    hourlyRate: string;
    overtimeRate: string;
    fixedMonthlySalary: string | null;
    totalAnnualLeaveDays: number | null;
    email: string | null;
    phone: string | null;
    bankIban: string | null;
    employeeType: string;
  }) => {
    setError(null);
    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({
          employeeId: editingEmployee.id,
          employee: {
            fullName: data.fullName,
            hourlyRate: parseFloat(data.hourlyRate) || 0,
            overtimeRate: parseFloat(data.overtimeRate) || 0,
            fixedMonthlySalary: data.fixedMonthlySalary ? parseFloat(data.fixedMonthlySalary) : null,
            totalAnnualLeaveDays: data.totalAnnualLeaveDays ?? 0,
            email: data.email,
            phone: data.phone,
            bankIban: data.bankIban,
            employeeType: data.employeeType,
          },
        });
      } else {
        await addEmployee.mutateAsync(data);
      }
      setDialogOpen(false);
      setEditingEmployee(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Σφάλμα κατά την αποθήκευση');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEmployee.mutateAsync(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Σφάλμα κατά τη διαγραφή');
    }
    setDeleteConfirmId(null);
  };

  const handleOpenFolder = (employee: Employee) => {
    setFolderEmployee(employee);
    setFolderOpen(true);
  };

  const isPending = addEmployee.isPending || updateEmployee.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Αναζήτηση εργαζομένου..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setEditingEmployee(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Νέος Εργαζόμενος
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'Δεν βρέθηκαν εργαζόμενοι' : 'Δεν υπάρχουν εργαζόμενοι. Προσθέστε τον πρώτο!'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp: Employee) => (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{emp.fullName}</h3>
                    <Badge
                      variant={emp.employeeType === 'monthly' ? 'default' : 'secondary'}
                      className="mt-1 text-xs"
                    >
                      {emp.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωρομίσθιος'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenFolder(emp)}
                      title="Φάκελος"
                    >
                      <Folder className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(emp)}
                      title="Επεξεργασία"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(emp.id)}
                      title="Διαγραφή"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  {emp.employeeType === 'monthly' && emp.fixedMonthlySalary != null && (
                    <p>Μισθός: €{emp.fixedMonthlySalary.toFixed(2)}/μήνα</p>
                  )}
                  {emp.employeeType === 'hourly' && (
                    <p>Αμοιβή: €{emp.hourlyRate.toFixed(2)}/ώρα</p>
                  )}
                  <p>Υπερωρία: €{emp.overtimeRate.toFixed(2)}/ώρα</p>
                  <p>Άδεια: {emp.totalAnnualLeaveDays} ημέρες/έτος</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSave={handleSave}
        isPending={isPending}
      />

      <EmployeeFolderView
        open={folderOpen}
        onOpenChange={setFolderOpen}
        employee={folderEmployee}
        onEdit={() => {
          setFolderOpen(false);
          if (folderEmployee) handleEdit(folderEmployee);
        }}
      />

      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Εργαζομένου</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον εργαζόμενο; Η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId !== null && handleDelete(deleteConfirmId)}
              disabled={deleteEmployee.isPending}
            >
              {deleteEmployee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
