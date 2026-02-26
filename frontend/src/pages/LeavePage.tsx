import { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetEmployees } from '../hooks/useQueries';
import LeaveDayDialog from '../components/LeaveDayDialog';
import BulkLeaveDayDialog from '../components/BulkLeaveDayDialog';
import LeaveEditDialog from '../components/LeaveEditDialog';
import type { Employee } from '../backend';

export default function LeavePage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [bulkLeaveDialogOpen, setBulkLeaveDialogOpen] = useState(false);
  const [editLeaveEmployee, setEditLeaveEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useGetEmployees();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Διαχείριση Αδειών</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Παρακολούθηση και καταχώρηση αδειών εργαζομένων
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkLeaveDialogOpen(true)} className="gap-2">
            <Calendar className="h-4 w-4" />
            Μαζική Άδεια
          </Button>
          <Button onClick={() => setLeaveDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Νέα Άδεια
          </Button>
        </div>
      </div>

      {/* Employee filter */}
      <div className="flex gap-3 items-center">
        <Select
          value={selectedEmployeeId ? String(selectedEmployeeId) : 'all'}
          onValueChange={(v) => setSelectedEmployeeId(v === 'all' ? null : Number(v))}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Όλοι οι εργαζόμενοι" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλοι οι εργαζόμενοι</SelectItem>
            {employees.map((e) => (
              <SelectItem key={Number(e.id)} value={String(Number(e.id))}>
                {e.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Employee leave cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees
            .filter((e) => !selectedEmployeeId || Number(e.id) === selectedEmployeeId)
            .map((employee) => (
              <Card key={Number(employee.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{employee.fullName}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {Number(employee.totalAnnualLeaveDays)} ημέρες/έτος
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-muted rounded p-2">
                      <div className="font-semibold">{Number(employee.totalAnnualLeaveDays)}</div>
                      <div className="text-xs text-muted-foreground">Σύνολο</div>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <div className="font-semibold text-amber-600">-</div>
                      <div className="text-xs text-muted-foreground">Χρησιμοποιήθηκαν</div>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <div className="font-semibold text-green-600">-</div>
                      <div className="text-xs text-muted-foreground">Υπόλοιπο</div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1 text-xs"
                    onClick={() => setEditLeaveEmployee(employee)}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Προβολή Αδειών
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Dialogs */}
      <LeaveDayDialog
        open={leaveDialogOpen}
        onClose={() => setLeaveDialogOpen(false)}
        employeeId={selectedEmployeeId ?? (employees[0] ? Number(employees[0].id) : 0)}
      />

      <BulkLeaveDayDialog
        open={bulkLeaveDialogOpen}
        onClose={() => setBulkLeaveDialogOpen(false)}
      />

      {editLeaveEmployee && (
        <LeaveEditDialog
          employee={editLeaveEmployee}
          open={!!editLeaveEmployee}
          onClose={() => setEditLeaveEmployee(null)}
        />
      )}
    </div>
  );
}
