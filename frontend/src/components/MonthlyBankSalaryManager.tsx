import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useSetMonthlyBankSalary, useGetMonthlyBankSalaries, useGetEmployees } from '../hooks/useQueries';
import { toast } from 'sonner';

interface MonthlyBankSalaryManagerProps {
  employeeId: number;
  month: number;
  year: number;
}

export default function MonthlyBankSalaryManager({
  employeeId,
  month,
  year,
}: MonthlyBankSalaryManagerProps) {
  const { data: employees = [] } = useGetEmployees();
  const employee = employees.find((e) => Number(e.id) === employeeId);
  const { data: allSalaries = [] } = useGetMonthlyBankSalaries(month, year);
  const existing = allSalaries.find((s) => s.employeeId === employeeId);
  const setMonthlyBankSalary = useSetMonthlyBankSalary();

  const [amount, setAmount] = useState('');

  const handleSave = async () => {
    try {
      await setMonthlyBankSalary.mutateAsync({
        employeeId,
        month,
        year,
        amount: parseFloat(amount.replace(',', '.')) || 0,
      });
      toast.success('Αποθηκεύτηκε');
      setAmount('');
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

  if (!employee) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{employee.fullName}</CardTitle>
      </CardHeader>
      <CardContent>
        {existing && (
          <p className="text-sm text-muted-foreground mb-2">
            Τρέχον ποσό: <span className="font-medium text-foreground">{existing.amount.toFixed(2)}€</span>
          </p>
        )}
        <div className="flex gap-2 items-center">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={existing ? existing.amount.toFixed(2) : '0.00'}
            className="flex-1"
            type="number"
            step="0.01"
            min="0"
          />
          <Button onClick={handleSave} disabled={setMonthlyBankSalary.isPending} size="sm" className="gap-1">
            {setMonthlyBankSalary.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Αποθήκευση
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
