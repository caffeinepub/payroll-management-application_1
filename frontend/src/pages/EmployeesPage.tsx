import { useState } from 'react';
import { Plus, Search, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetEmployees } from '../hooks/useQueries';
import EmployeeCard from '../components/EmployeeCard';
import EmployeeDialog from '../components/EmployeeDialog';
import EmployeeFolderView from '../components/EmployeeFolderView';
import type { Employee } from '../types';

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [folderEmployee, setFolderEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading, refetch, isFetching } = useGetEmployees();

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Υπάλληλοι</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {employees.length} εργαζόμενοι συνολικά
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Ανανέωση"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Νέος Υπάλληλος
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Αναζήτηση υπαλλήλου..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          {employees.length === 0 ? (
            <>
              <h3 className="text-lg font-semibold text-foreground mb-2">Δεν υπάρχουν υπάλληλοι</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Προσθέστε τον πρώτο υπάλληλο για να ξεκινήσετε
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Προσθήκη Υπαλλήλου
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-foreground mb-2">Δεν βρέθηκαν αποτελέσματα</h3>
              <p className="text-muted-foreground text-sm">Δοκιμάστε διαφορετικό όρο αναζήτησης</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(employee => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onEdit={emp => setEditEmployee(emp)}
              onDelete={() => {}}
              onViewFolder={emp => setFolderEmployee(emp)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showAddDialog && (
        <EmployeeDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
        />
      )}
      {editEmployee && (
        <EmployeeDialog
          open={!!editEmployee}
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
        />
      )}
      {folderEmployee && (
        <EmployeeFolderView
          open={!!folderEmployee}
          employee={folderEmployee}
          onClose={() => setFolderEmployee(null)}
          onEdit={emp => {
            setFolderEmployee(null);
            setEditEmployee(emp);
          }}
        />
      )}
    </div>
  );
}
