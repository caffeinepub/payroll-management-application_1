import React, { useState } from 'react';
import { useGetEmployees, useGetLeaveDays, useDeleteLeaveDay } from '../hooks/useQueries';
import { Employee, LeaveDay } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Umbrella, Plus, Edit, Trash2 } from 'lucide-react';
import LeaveDayDialog from '../components/LeaveDayDialog';
import BulkLeaveDayDialog from '../components/BulkLeaveDayDialog';
import LeaveEditDialog from '../components/LeaveEditDialog';

function EmployeeLeaveCard({ employee }: { employee: Employee }) {
  const { data: leaveDays = [], isLoading } = useGetLeaveDays(employee.id);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const usedDays = leaveDays.length;
  const totalDays = employee.totalAnnualLeaveDays;
  const remainingDays = Math.max(0, totalDays - usedDays);
  const progressPct = totalDays > 0 ? Math.min(100, (usedDays / totalDays) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">
                {employee.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <CardTitle className="text-base">{employee.fullName}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Σύνολο</p>
                  <p className="font-bold text-lg">{totalDays}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Χρησιμοποιήθηκαν</p>
                  <p className="font-bold text-lg text-orange-500">{usedDays}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Υπόλοιπο</p>
                  <p className="font-bold text-lg text-green-600">{remainingDays}</p>
                </div>
              </div>
              <Badge variant={remainingDays === 0 ? 'destructive' : 'secondary'}>
                {remainingDays === 0 ? 'Εξαντλήθηκαν' : `${remainingDays} ημέρες`}
              </Badge>
            </div>
            <Progress value={progressPct} className="h-2" />
            {leaveDays.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {leaveDays
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 5)
                  .map((ld, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {ld.date}
                    </Badge>
                  ))}
                {leaveDays.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{leaveDays.length - 5} ακόμα
                  </Badge>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      {showAddDialog && (
        <LeaveDayDialog
          employeeId={employee.id}
          employeeName={employee.fullName}
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
        />
      )}
      {showEditDialog && (
        <LeaveEditDialog
          employee={employee}
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
        />
      )}
    </Card>
  );
}

export default function LeavePage() {
  const { data: employees = [], isLoading } = useGetEmployees();
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Άδειες</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Διαχείριση αδειών εργαζομένων
          </p>
        </div>
        <Button onClick={() => setShowBulkDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Μαζική Καταχώρηση
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Umbrella className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Δεν υπάρχουν εργαζόμενοι</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <EmployeeLeaveCard key={emp.id} employee={emp} />
          ))}
        </div>
      )}

      {showBulkDialog && (
        <BulkLeaveDayDialog
          open={showBulkDialog}
          onClose={() => setShowBulkDialog(false)}
        />
      )}
    </div>
  );
}
