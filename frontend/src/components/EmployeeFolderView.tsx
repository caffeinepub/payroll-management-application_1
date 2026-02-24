import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Edit, Mail, Phone, CreditCard, Calendar, Clock, TrendingUp } from 'lucide-react';
import { useGetChangeHistory } from '../hooks/useQueries';
import type { Employee } from '../types';

interface EmployeeFolderViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onEdit?: () => void;
}

export default function EmployeeFolderView({
  open,
  onOpenChange,
  employee,
  onEdit,
}: EmployeeFolderViewProps) {
  const { data: changeHistory = [] } = useGetChangeHistory(employee?.id ?? null);

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{employee.fullName}</DialogTitle>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="mr-6">
                <Edit className="h-4 w-4 mr-1" />
                Επεξεργασία
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-2">
            {/* Type Badge */}
            <div className="flex items-center gap-2">
              <Badge variant={employee.employeeType === 'monthly' ? 'default' : 'secondary'}>
                {employee.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωρομίσθιος'}
              </Badge>
            </div>

            {/* Salary Info */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Αμοιβές
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {employee.employeeType === 'monthly' && employee.fixedMonthlySalary != null && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Μηνιαίος Μισθός</p>
                      <p className="font-semibold">€{employee.fixedMonthlySalary.toFixed(2)}</p>
                    </div>
                  </div>
                )}
                {employee.employeeType === 'hourly' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Ωριαία Αμοιβή</p>
                      <p className="font-semibold">€{employee.hourlyRate.toFixed(2)}/ώρα</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Υπερωρία</p>
                    <p className="font-semibold">€{employee.overtimeRate.toFixed(2)}/ώρα</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ετήσιες Άδειες</p>
                    <p className="font-semibold">{employee.totalAnnualLeaveDays} ημέρες</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            {(employee.email || employee.phone || employee.bankIban) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Στοιχεία Επικοινωνίας
                  </h3>
                  <div className="space-y-2">
                    {employee.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{employee.email}</span>
                      </div>
                    )}
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    {employee.bankIban && (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{employee.bankIban}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Change History */}
            {changeHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Ιστορικό Αλλαγών
                  </h3>
                  <div className="space-y-2">
                    {[...changeHistory].reverse().map((entry, idx) => (
                      <div key={idx} className="flex gap-3 text-sm p-2 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground whitespace-nowrap">{entry.date}</span>
                        <span>{entry.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
