import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User, Eye } from 'lucide-react';
import BulkMonthlyBankSalaryDialog from '../components/BulkMonthlyBankSalaryDialog';
import MonthlyBankSalaryDialog from '../components/MonthlyBankSalaryDialog';
import MonthlyBankSalariesView from '../components/MonthlyBankSalariesView';
import { useGetAllEmployees } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MonthlyBankSalariesPage() {
  const { data: employees = [] } = useGetAllEmployees();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [individualDialogOpen, setIndividualDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<bigint | null>(null);

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Μηνιαίοι Μισθοί Τράπεζας</h2>
        <p className="text-muted-foreground">
          Διαχειριστείτε τους μηνιαίους μισθούς τράπεζας για όλους τους εργαζομένους. Μπορείτε να προσθέσετε πολλαπλές καταχωρήσεις για τον ίδιο εργαζόμενο και μήνα - το σύστημα θα τις αθροίσει αυτόματα.
        </p>
      </div>

      <Tabs defaultValue="bulk" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bulk" className="gap-2">
            <Users className="h-4 w-4" />
            Μαζική Προσθήκη
          </TabsTrigger>
          <TabsTrigger value="individual" className="gap-2">
            <User className="h-4 w-4" />
            Ατομική Προσθήκη
          </TabsTrigger>
          <TabsTrigger value="view" className="gap-2">
            <Eye className="h-4 w-4" />
            Προβολή
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Μαζική Προσθήκη Μηνιαίων Μισθών Τράπεζας</CardTitle>
              <CardDescription>
                Προσθέστε μηνιαίο μισθό τράπεζας για όλους τους εργαζομένους για έναν συγκεκριμένο μήνα. Μπορείτε να χρησιμοποιήσετε αυτή τη λειτουργία πολλές φορές για τον ίδιο μήνα - το σύστημα θα αθροίσει αυτόματα όλες τις καταχωρήσεις στη μισθοδοσία.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setBulkDialogOpen(true)} className="gap-2">
                <Users className="h-4 w-4" />
                Άνοιγμα Μαζικής Προσθήκης
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ατομική Προσθήκη Μηνιαίων Μισθών Τράπεζας</CardTitle>
              <CardDescription>
                Επιλέξτε έναν εργαζόμενο και προσθέστε μηνιαίο μισθό τράπεζας για συγκεκριμένο μήνα. Μπορείτε να προσθέσετε πολλαπλές καταχωρήσεις για τον ίδιο εργαζόμενο και μήνα - το σύστημα θα τις αθροίσει αυτόματα στη μισθοδοσία.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Επιλογή Εργαζομένου</label>
                <Select
                  value={selectedEmployeeId?.toString() || ''}
                  onValueChange={(value) => setSelectedEmployeeId(value ? BigInt(value) : null)}
                >
                  <SelectTrigger>
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
              <Button
                onClick={() => setIndividualDialogOpen(true)}
                disabled={!selectedEmployeeId}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                Προσθήκη Μηνιαίου Μισθού
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Προβολή Μηνιαίων Μισθών Τράπεζας</CardTitle>
              <CardDescription>
                Δείτε όλες τις καταχωρήσεις μηνιαίων μισθών τράπεζας. Όταν υπάρχουν πολλαπλές καταχωρήσεις για τον ίδιο εργαζόμενο και μήνα, εμφανίζονται όλες ξεχωριστά και το σύστημα τις αθροίζει αυτόματα στη μισθοδοσία.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyBankSalariesView />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BulkMonthlyBankSalaryDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
      />

      {selectedEmployeeId && selectedEmployee && (
        <MonthlyBankSalaryDialog
          open={individualDialogOpen}
          onOpenChange={setIndividualDialogOpen}
          employeeId={selectedEmployeeId}
          employeeName={selectedEmployee.fullName}
        />
      )}
    </div>
  );
}
