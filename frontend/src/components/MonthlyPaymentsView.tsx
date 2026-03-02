import React from 'react';
import { useGetEmployees, useGetPayments, useDeletePayment } from '../hooks/useQueries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface MonthlyPaymentsViewProps {
  month: number;
  year: number;
}

export default function MonthlyPaymentsView({ month, year }: MonthlyPaymentsViewProps) {
  const { data: employees = [] } = useGetEmployees();
  const { data: payments = [], isLoading } = useGetPayments(undefined, month, year);
  const deletePayment = useDeletePayment();

  const fmt = (n: number) =>
    n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const handleDelete = async (index: number) => {
    try {
      // Find the global index in all payments
      const allPayments = JSON.parse(localStorage.getItem('payments_v1') || '[]');
      const payment = payments[index];
      const globalIdx = allPayments.findIndex(
        (p: any) =>
          p.employeeId === payment.employeeId &&
          p.month === payment.month &&
          p.year === payment.year &&
          p.paymentDate === payment.paymentDate,
      );
      if (globalIdx >= 0) {
        await deletePayment.mutateAsync(globalIdx);
        toast.success('Η πληρωμή διαγράφηκε');
      }
    } catch {
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Δεν υπάρχουν πληρωμές για αυτή την περίοδο</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment, i) => {
        const emp = employees.find((e) => e.id === payment.employeeId);
        return (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{emp?.fullName ?? `Εργαζόμενος #${payment.employeeId}`}</p>
                  <p className="text-xs text-muted-foreground">{payment.paymentDate}</p>
                </div>
                <div className="flex items-center gap-4">
                  {payment.cashPayment > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Μετρητά</p>
                      <p className="font-semibold text-green-600">{fmt(payment.cashPayment)}</p>
                    </div>
                  )}
                  {payment.bankPayment > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Τράπεζα</p>
                      <p className="font-semibold text-blue-600">{fmt(payment.bankPayment)}</p>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
