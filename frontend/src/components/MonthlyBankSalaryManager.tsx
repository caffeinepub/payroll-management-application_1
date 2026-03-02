import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetMonthlyBankSalaries, useSetMonthlyBankSalary } from '../hooks/useQueries';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MonthlyBankSalaryManagerProps {
  employeeId: number;
  employeeName: string;
  month: number;
  year: number;
}

export default function MonthlyBankSalaryManager({
  employeeId,
  employeeName,
  month,
  year,
}: MonthlyBankSalaryManagerProps) {
  const { data: salaries = [] } = useGetMonthlyBankSalaries(employeeId, month, year);
  const setMonthlyBankSalary = useSetMonthlyBankSalary();

  const currentTotal = salaries.reduce((sum, s) => sum + s.amount, 0);
  const [amount, setAmount] = useState('');

  const handleSave = async () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Εισάγετε έγκυρο ποσό');
      return;
    }
    try {
      await setMonthlyBankSalary.mutateAsync({ employeeId, month, year, amount: parsed });
      toast.success('Ο μισθός αποθηκεύτηκε');
      setAmount('');
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{employeeName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentTotal > 0 && (
          <div className="text-sm text-muted-foreground">
            Τρέχον σύνολο: <span className="font-semibold text-foreground">{currentTotal.toFixed(2)}€</span>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={setMonthlyBankSalary.isPending}
            className="gap-1"
          >
            {setMonthlyBankSalary.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Αποθήκευση
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
