import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, User, Mail, Phone, CreditCard, Calendar, DollarSign, Clock } from 'lucide-react';
import type { Employee } from '../types';
import { useGetChangeHistory } from '../hooks/useQueries';

interface EmployeeFolderViewProps {
  open: boolean;
  employee: Employee;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
}

export default function EmployeeFolderView({ open, employee, onClose, onEdit }: EmployeeFolderViewProps) {
  const { data: history = [] } = useGetChangeHistory(employee.id);
  const isMonthly = employee.employeeType === 'monthly';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Φάκελος Υπαλλήλου</DialogTitle>
            <Button variant="outline" size="sm" onClick={() => onEdit(employee)} className="flex items-center gap-1">
              <Edit className="w-3 h-3" />
              Επεξεργασία
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Employee Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{employee.fullName}</h2>
              <Badge variant={isMonthly ? 'default' : 'secondary'}>
                {isMonthly ? 'Μηνιαίος' : 'Ωρομίσθιος'}
              </Badge>
            </div>
          </div>

          {/* Salary Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Αμοιβές</h3>
            {isMonthly && employee.fixedMonthlySalary != null && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Μηνιαίος μισθός:</span>
                <span className="font-semibold">{employee.fixedMonthlySalary.toFixed(2)}€</span>
              </div>
            )}
            {!isMonthly && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ωριαία αμοιβή:</span>
                <span className="font-semibold">{employee.hourlyRate.toFixed(2)}€</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Αμοιβή υπερωρίας:</span>
              <span className="font-semibold">{employee.overtimeRate.toFixed(2)}€/ώρα</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Ετήσιες άδειες:</span>
              <span className="font-semibold">{employee.totalAnnualLeaveDays} ημέρες</span>
            </div>
          </div>

          {/* Contact Info */}
          {(employee.email || employee.phone || employee.bankIban) && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Στοιχεία Επικοινωνίας</h3>
              {employee.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{employee.phone}</span>
                </div>
              )}
              {employee.bankIban && (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono">{employee.bankIban}</span>
                </div>
              )}
            </div>
          )}

          {/* Change History */}
          {history.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ιστορικό Αλλαγών</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((entry, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">{entry.changeType}</Badge>
                      <span className="text-xs text-muted-foreground">{entry.date}</span>
                    </div>
                    <p className="text-muted-foreground">{entry.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
