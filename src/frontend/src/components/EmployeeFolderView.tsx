import { useState } from 'react';
import { useGetEmployee, useGetChangeHistoryLog } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Edit, Calendar, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import EmployeeDialog from './EmployeeDialog';
import type { Employee } from '../backend';

interface EmployeeFolderViewProps {
  employeeId: bigint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EmployeeFolderView({ employeeId, open, onOpenChange }: EmployeeFolderViewProps) {
  const { data: employee, isLoading: employeeLoading } = useGetEmployee(employeeId);
  const { data: changeHistory = [], isLoading: historyLoading } = useGetChangeHistoryLog(employeeId);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = (newOpen: boolean) => {
    setEditDialogOpen(newOpen);
    // Don't close the folder view when edit dialog closes
  };

  if (!employeeId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Φάκελος Εργαζομένου
            </DialogTitle>
            <DialogDescription>
              Πλήρη στοιχεία και ιστορικό αλλαγών
            </DialogDescription>
          </DialogHeader>

          {employeeLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !employee ? (
            <div className="text-center py-12 text-muted-foreground">
              Ο εργαζόμενος δεν βρέθηκε
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Employee Details Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-2xl">{employee.fullName}</CardTitle>
                        <CardDescription>ID: {employee.id.toString()}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={employee.employeeType === 'monthly' ? 'default' : 'secondary'}>
                          {employee.employeeType === 'monthly' ? 'Μηνιαίος' : 'Ωριαίος'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={handleEditClick} className="gap-2">
                          <Edit className="h-4 w-4" />
                          Επεξεργασία
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Salary Information */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground">Μισθολογικά Στοιχεία</h4>
                        {employee.employeeType === 'hourly' ? (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Ωριαία Αμοιβή:</span>
                            <span className="font-medium">€{employee.hourlyRate.toFixed(2)}</span>
                          </div>
                        ) : (
                          employee.fixedMonthlySalary !== undefined && employee.fixedMonthlySalary !== null && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Μηνιαίος Μισθός:</span>
                              <span className="font-medium">€{employee.fixedMonthlySalary.toFixed(2)}</span>
                            </div>
                          )
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Αμοιβή Υπερωριών:</span>
                          <span className="font-medium">€{employee.overtimeRate.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Ετήσιες Άδειες:</span>
                          <span className="font-medium">{employee.totalAnnualLeaveDays.toString()} ημέρες</span>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground">Στοιχεία Επικοινωνίας</h4>
                        {employee.email ? (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Email:</span>
                            <span className="font-medium text-sm truncate ml-2">{employee.email}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Δεν έχει καταχωρηθεί email</div>
                        )}
                        {employee.phone ? (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Τηλέφωνο:</span>
                            <span className="font-medium">{employee.phone}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Δεν έχει καταχωρηθεί τηλέφωνο</div>
                        )}
                        {employee.bankIban ? (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">IBAN:</span>
                            <span className="font-medium text-sm truncate ml-2">{employee.bankIban}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Δεν έχει καταχωρηθεί IBAN</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Change History Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <CardTitle>Ιστορικό Αλλαγών</CardTitle>
                    </div>
                    <CardDescription>
                      Καταγραφή όλων των τροποποιήσεων στα στοιχεία του εργαζομένου
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : changeHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Δεν υπάρχουν καταγεγραμμένες αλλαγές
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {changeHistory.map((entry, index) => (
                          <div key={index}>
                            {index > 0 && <Separator className="my-4" />}
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-24 text-sm text-muted-foreground">
                                {entry.date}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {entry.changeType}
                                  </Badge>
                                </div>
                                <p className="text-sm">{entry.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {employee && (
        <EmployeeDialog
          open={editDialogOpen}
          onOpenChange={handleEditDialogClose}
          employee={employee}
        />
      )}
    </>
  );
}
