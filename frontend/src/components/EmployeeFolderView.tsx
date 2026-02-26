import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Pencil, Mail, Phone, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { Employee } from '../backend';

interface EmployeeFolderViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onEdit: (employee: Employee) => void;
}

export default function EmployeeFolderView({ open, onOpenChange, employee, onEdit }: EmployeeFolderViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Φάκελος Εργαζομένου</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(employee)}
              className="gap-1"
            >
              <Pencil className="w-3 h-3" />
              Επεξεργασία
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div>
            <h3 className="text-xl font-bold text-foreground">{employee.fullName}</h3>
            <Badge
              variant={employee.employeeType === 'monthly' ? 'default' : 'secondary'}
              className="mt-1"
            >
              {employee.employeeType === 'monthly' ? 'Μηνιαίος Μισθός' : 'Ωρομίσθιος'}
            </Badge>
          </div>

          <Separator />

          {/* Salary Info */}
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Αμοιβές
            </h4>
            <div className="space-y-2 text-sm">
              {employee.employeeType === 'monthly' && employee.fixedMonthlySalary != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Μηνιαίος μισθός:</span>
                  <span className="font-medium">{employee.fixedMonthlySalary.toFixed(2)}€</span>
                </div>
              )}
              {employee.employeeType === 'hourly' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ωριαία αμοιβή:</span>
                  <span className="font-medium">{employee.hourlyRate.toFixed(2)}€/ώρα</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Αμοιβή υπερωρίας:</span>
                <span className="font-medium">{employee.overtimeRate.toFixed(2)}€/ώρα</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Leave Info */}
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Άδεια
            </h4>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ετήσιες ημέρες άδειας:</span>
              <span className="font-medium">{Number(employee.totalAnnualLeaveDays)} ημέρες</span>
            </div>
          </div>

          {/* Contact Info */}
          {(employee.email || employee.phone || employee.bankIban) && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-foreground mb-2">Στοιχεία Επικοινωνίας</h4>
                <div className="space-y-2 text-sm">
                  {employee.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.bankIban && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-xs">{employee.bankIban}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
