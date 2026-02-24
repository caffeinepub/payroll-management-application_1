import { useState, useMemo } from 'react';
import { useGetAllEmployees, useDeleteEmployee } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Loader2, Search, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EmployeeDialog from '../components/EmployeeDialog';
import EmployeeFolderView from '../components/EmployeeFolderView';
import type { Employee } from '../backend';
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
import { toast } from 'sonner';

export default function EmployeesPage() {
  const { data: employees = [], isLoading, isFetching } = useGetAllEmployees();
  const deleteEmployee = useDeleteEmployee();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [folderViewOpen, setFolderViewOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<bigint | null>(null);

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) {
      return employees;
    }
    
    const query = searchQuery.toLowerCase();
    return employees.filter((employee) =>
      employee.fullName.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  const handleViewFolder = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setFolderViewOpen(true);
  };

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    try {
      await deleteEmployee.mutateAsync(employeeToDelete.id);
      toast.success('Ο εργαζόμενος διαγράφηκε επιτυχώς');
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα κατά τη διαγραφή του εργαζομένου');
    }
  };

  // Show loading only on initial load, not on background refetches
  if (isLoading && !isFetching) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Εργαζόμενοι</h2>
          <p className="text-muted-foreground">Διαχειριστείτε τους εργαζομένους σας</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddEmployee} className="gap-2">
            <Plus className="h-4 w-4" />
            Προσθήκη Εργαζομένου
          </Button>
        </div>
      </div>

      {employees.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Αναζήτηση Εργαζομένου..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν εργαζόμενοι</h3>
            <p className="text-muted-foreground text-center mb-4">
              Ξεκινήστε προσθέτοντας τον πρώτο εργαζόμενο
            </p>
            <Button onClick={handleAddEmployee} className="gap-2">
              <Plus className="h-4 w-4" />
              Προσθήκη Εργαζομένου
            </Button>
          </CardContent>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Δεν βρέθηκαν εργαζόμενοι</h3>
            <p className="text-muted-foreground text-center mb-4">
              Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης
            </p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Καθαρισμός Αναζήτησης
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id.toString()} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewFolder(employee)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{employee.fullName}</CardTitle>
                    <CardDescription>ID: {employee.id.toString()}</CardDescription>
                  </div>
                  <Badge variant={employee.employeeType === 'monthly' ? 'default' : 'secondary'}>
                    {employee.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωριαίος'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  {employee.employeeType === 'hourly' ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ωριαία Αμοιβή:</span>
                      <span className="font-medium">€{employee.hourlyRate.toFixed(2)}</span>
                    </div>
                  ) : (
                    employee.fixedMonthlySalary !== undefined && employee.fixedMonthlySalary !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Μηνιαίος Μισθός:</span>
                        <span className="font-medium">€{employee.fixedMonthlySalary.toFixed(2)}</span>
                      </div>
                    )
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Αμοιβή Υπερωριών:</span>
                    <span className="font-medium">€{employee.overtimeRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ετήσιες Άδειες:</span>
                    <span className="font-medium">{employee.totalAnnualLeaveDays.toString()} ημέρες</span>
                  </div>
                  {employee.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium truncate ml-2">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Τηλέφωνο:</span>
                      <span className="font-medium">{employee.phone}</span>
                    </div>
                  )}
                  {employee.bankIban && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IBAN:</span>
                      <span className="font-medium truncate ml-2">{employee.bankIban}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewFolder(employee);
                    }}
                    className="flex-1 gap-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Φάκελος
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEmployee(employee);
                    }}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(employee);
                    }}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editingEmployee}
      />

      <EmployeeFolderView
        employeeId={selectedEmployeeId}
        open={folderViewOpen}
        onOpenChange={setFolderViewOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Είστε σίγουροι;</AlertDialogTitle>
            <AlertDialogDescription>
              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Θα διαγραφούν μόνιμα τα δεδομένα του εργαζομένου{' '}
              <strong>{employeeToDelete?.fullName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
