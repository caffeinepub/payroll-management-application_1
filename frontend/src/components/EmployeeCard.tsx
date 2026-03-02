import { Edit, Trash2, FolderOpen, User, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Employee } from '../types';

interface EmployeeCardProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onViewFolder: (employee: Employee) => void;
}

export default function EmployeeCard({ employee, onEdit, onDelete, onViewFolder }: EmployeeCardProps) {
  const isMonthly = employee.employeeType === 'monthly';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground leading-tight">{employee.fullName}</h3>
              <Badge variant={isMonthly ? 'default' : 'secondary'} className="text-xs mt-1">
                {isMonthly ? 'Μηνιαίος' : 'Ωρομίσθιος'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onViewFolder(employee)} title="Φάκελος">
              <FolderOpen className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(employee)} title="Επεξεργασία">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => onDelete(employee)} title="Διαγραφή">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {isMonthly && employee.fixedMonthlySalary != null && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Μηνιαίος μισθός:</span>
            <span className="font-medium">{employee.fixedMonthlySalary.toFixed(2)}€</span>
          </div>
        )}
        {!isMonthly && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Ωριαία αμοιβή:</span>
            <span className="font-medium">{employee.hourlyRate.toFixed(2)}€</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Υπερωρία:</span>
          <span className="font-medium">{employee.overtimeRate.toFixed(2)}€/ώρα</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Ετήσιες άδειες:</span>
          <span className="font-medium">{employee.totalAnnualLeaveDays} ημέρες</span>
        </div>
        {employee.email && (
          <div className="text-sm text-muted-foreground truncate">{employee.email}</div>
        )}
      </CardContent>
    </Card>
  );
}
