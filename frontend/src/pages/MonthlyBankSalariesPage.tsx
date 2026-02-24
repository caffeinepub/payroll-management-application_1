import { useState } from 'react';
import { useGetAllEmployees } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';
import MonthlyBankSalaryDialog from '../components/MonthlyBankSalaryDialog';
import BulkMonthlyBankSalaryDialog from '../components/BulkMonthlyBankSalaryDialog';
import MonthlyBankSalariesView from '../components/MonthlyBankSalariesView';
import MonthlyBankSalaryEditDialog from '../components/MonthlyBankSalaryEditDialog';
import { useUpdateMonthlyBankSalary } from '../hooks/useQueries';
import type { MonthlyBankSalary } from '../types';

export default function MonthlyBankSalariesPage() {
  const { data: employees = [] } = useGetAllEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [individualDialogOpen, setIndividualDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<MonthlyBankSalary | null>(null);

  const updateMonthlyBankSalary = useUpdateMonthlyBankSalary();

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId) ?? null;

  const handleEditSalary = (salary: MonthlyBankSalary) => {
    setEditingSalary(salary);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (data: {
    id: number;
    employeeId: number;
    month: number;
    year: number;
    amount: number;
  }) => {
    await updateMonthlyBankSalary.mutateAsync(data);
    setEditDialogOpen(false);
    setEditingSalary(null);
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Μηνιαίοι Μισθοί Τράπεζας</h2>
        <p className="text-muted-foreground">Διαχείριση μηνιαίων μισθών τράπεζας εργαζομένων</p>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="flex items-start gap-3 pt-6">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Πολλαπλές Καταχωρήσεις
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Μπορείτε να προσθέσετε πολλαπλές καταχωρήσεις για τον ίδιο εργαζόμενο και μήνα. Το σύστημα θα τις αθροίσει αυτόματα στη μισθοδοσία.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="bulk">
        <TabsList>
          <TabsTrigger value="bulk">Μαζική Καταχώρηση</TabsTrigger>
          <TabsTrigger value="individual">Ατομική Καταχώρηση</TabsTrigger>
          <TabsTrigger value="view">Προβολή</TabsTrigger>
        </TabsList>

        {/* Bulk Entry Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Μαζική Καταχώρηση Μηνιαίων Μισθών Τράπεζας</CardTitle>
              <CardDescription>
                Προσθέστε μηνιαίο μισθό τράπεζας για όλους τους εργαζομένους ταυτόχρονα
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => setBulkDialogOpen(true)}
                className="w-full py-8 border-2 border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                Κάντε κλικ για μαζική καταχώρηση μηνιαίων μισθών τράπεζας
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Entry Tab */}
        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ατομική Καταχώρηση Μηνιαίου Μισθού Τράπεζας</CardTitle>
              <CardDescription>
                Προσθέστε μηνιαίο μισθό τράπεζας για έναν συγκεκριμένο εργαζόμενο
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Εργαζόμενος</Label>
                <Select
                  value={selectedEmployeeId?.toString() ?? ''}
                  onValueChange={(v) => setSelectedEmployeeId(v ? parseInt(v) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε εργαζόμενο" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id.toString()} value={emp.id.toString()}>
                        {emp.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployee && (
                <button
                  onClick={() => setIndividualDialogOpen(true)}
                  className="w-full py-6 border-2 border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  Προσθήκη μηνιαίου μισθού τράπεζας για {selectedEmployee.fullName}
                </button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* View Tab */}
        <TabsContent value="view" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Προβολή Μηνιαίων Μισθών Τράπεζας</CardTitle>
              <CardDescription>
                Όλες οι καταχωρημένες εγγραφές μηνιαίων μισθών τράπεζας
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyBankSalariesView onEdit={handleEditSalary} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Individual Dialog */}
      {selectedEmployee && (
        <MonthlyBankSalaryDialog
          open={individualDialogOpen}
          onOpenChange={setIndividualDialogOpen}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.fullName}
        />
      )}

      {/* Bulk Dialog */}
      <BulkMonthlyBankSalaryDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
      />

      {/* Edit Dialog */}
      <MonthlyBankSalaryEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        salary={editingSalary}
        onSave={handleSaveEdit}
        isPending={updateMonthlyBankSalary.isPending}
      />
    </div>
  );
}
