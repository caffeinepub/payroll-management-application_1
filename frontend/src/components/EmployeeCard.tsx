import { Pencil, Trash2, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Employee } from '../backend';

interface EmployeeCardProps {
  employee: Employee;
  onEdit: () => void;
  onDelete?: () => void;
  onFolderView?: () => void;
}

export default function EmployeeCard({ employee, onEdit, onDelete, onFolderView }: EmployeeCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{employee.fullName}</h3>
            <Badge
              variant={employee.employeeType === 'monthly' ? 'default' : 'secondary'}
              className="mt-1 text-xs"
            >
              {employee.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωρομίσθιος'}
            </Badge>
          </div>
          <div className="flex gap-1 ml-2 shrink-0">
            {onFolderView && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onFolderView}
                title="Προβολή φακέλου"
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              title="Επεξεργασία"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onDelete}
                title="Διαγραφή"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          {employee.employeeType === 'monthly' && employee.fixedMonthlySalary != null && (
            <div className="flex justify-between">
              <span>Μηνιαίος μισθός:</span>
              <span className="font-medium text-foreground">
                {employee.fixedMonthlySalary.toFixed(2)}€
              </span>
            </div>
          )}
          {employee.employeeType === 'hourly' && (
            <div className="flex justify-between">
              <span>Ωριαία αμοιβή:</span>
              <span className="font-medium text-foreground">
                {employee.hourlyRate.toFixed(2)}€/ώρα
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Υπερωρία:</span>
            <span className="font-medium text-foreground">
              {employee.overtimeRate.toFixed(2)}€/ώρα
            </span>
          </div>
          <div className="flex justify-between">
            <span>Άδεια:</span>
            <span className="font-medium text-foreground">
              {Number(employee.totalAnnualLeaveDays)} ημέρες/έτος
            </span>
          </div>
          {employee.email && (
            <div className="flex justify-between">
              <span>Email:</span>
              <span className="font-medium text-foreground truncate max-w-[150px]">
                {employee.email}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
