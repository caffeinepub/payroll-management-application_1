import { useState } from 'react';
import { Search, Plus, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useGetEmployees, useDeleteEmployee } from '../hooks/useQueries';
import type { Employee } from '../backend';
import EmployeeCard from '../components/EmployeeCard';
import EmployeeDialog from '../components/EmployeeDialog';
import EmployeeFolderView from '../components/EmployeeFolderView';
import { useQueryClient } from '@tanstack/react-query';

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [folderEmployee, setFolderEmployee] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { data: employees = [], isLoading, isFetching, error, refetch } = useGetEmployees();
  const deleteEmployee = useDeleteEmployee();

  const filtered = employees.filter((e) =>
    e.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    refetch();
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteEmployee.mutateAsync(deleteId);
      toast.success('Ο εργαζόμενος διαγράφηκε επιτυχώς');
    } catch {
      toast.error('Σφάλμα κατά τη διαγραφή');
    } finally {
      setDeleteId(null);
    }
  };

  const handleOpenAdd = () => {
    setEditEmployee(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Εργαζόμενοι</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? 'Φόρτωση...' : `${employees.length} εργαζόμενοι συνολικά`}
            {isFetching && !isLoading && (
              <span className="ml-2 text-xs text-primary animate-pulse">Ανανέωση...</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} title="Ανανέωση">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Νέος Εργαζόμενος
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Αναζήτηση εργαζομένου..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          Σφάλμα φόρτωσης εργαζομένων. Δοκιμάστε να ανανεώσετε τη σελίδα.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Δεν βρέθηκαν εργαζόμενοι</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {search
              ? 'Δοκιμάστε διαφορετικό όρο αναζήτησης'
              : 'Προσθέστε τον πρώτο εργαζόμενο ή χρησιμοποιήστε την Ανάκτηση Δεδομένων'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((employee) => (
            <EmployeeCard
              key={Number(employee.id)}
              employee={employee}
              onEdit={() => handleOpenEdit(employee)}
              onDelete={() => setDeleteId(Number(employee.id))}
              onFolderView={() => setFolderEmployee(employee)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditEmployee(null);
        }}
        employee={editEmployee}
      />

      {/* Folder View */}
      {folderEmployee && (
        <EmployeeFolderView
          open={!!folderEmployee}
          onOpenChange={(open) => { if (!open) setFolderEmployee(null); }}
          employee={folderEmployee}
          onEdit={(emp) => {
            setFolderEmployee(null);
            handleOpenEdit(emp);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
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
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
