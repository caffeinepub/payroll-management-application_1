import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Info } from 'lucide-react';
import MonthlyBankSalaryDialog from './MonthlyBankSalaryDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MonthlyBankSalaryManagerProps {
  employeeId: number;
  employeeName: string;
  defaultSalary: number | null;
}

export default function MonthlyBankSalaryManager({
  employeeId,
  employeeName,
  defaultSalary,
}: MonthlyBankSalaryManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const defaultSalaryDisplay = defaultSalary !== null ? `${defaultSalary.toFixed(2)}€` : 'Δεν έχει οριστεί';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Μηνιαίοι Μισθοί Τράπεζας
            </CardTitle>
            <CardDescription>
              Ορίστε διαφορετικό μισθό τράπεζας για κάθε μήνα. Προεπιλογή: {defaultSalaryDisplay}
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Προσθήκη
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            <strong>Σημείωση:</strong> Η λειτουργία προβολής και διαγραφής μηνιαίων μισθών δεν είναι διαθέσιμη προς το παρόν.
            Μπορείτε να προσθέσετε νέους μηνιαίους μισθούς που θα αντικαταστήσουν τον προεπιλεγμένο μισθό για συγκεκριμένους μήνες.
          </AlertDescription>
        </Alert>
      </CardContent>

      <MonthlyBankSalaryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employeeId={employeeId}
        employeeName={employeeName}
      />
    </Card>
  );
}
