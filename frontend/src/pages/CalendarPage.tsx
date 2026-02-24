import { useState, useMemo, useEffect } from 'react';
import { useGetAllEmployees, useGetWorkDays, useAddWorkDay, useUpdateWorkDay } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Plus, Info } from 'lucide-react';
import WorkDayDialog from '../components/WorkDayDialog';
import DailyBulkEntryTable from '../components/DailyBulkEntryTable';
import type { WorkDay } from '../types';

export default function CalendarPage() {
  const { data: employees = [], isLoading: employeesLoading } = useGetAllEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'individual' | 'daily'>('individual');

  const { data: workDays = [], isLoading: workDaysLoading, refetch: refetchWorkDays } = useGetWorkDays(selectedEmployeeId);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) ?? null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const addWorkDay = useAddWorkDay();
  const updateWorkDay = useUpdateWorkDay();

  const workDaysMap = useMemo(() => {
    const map = new Map<string, WorkDay>();
    workDays.forEach((wd) => {
      if (wd.date === '2024-01-01' && wd.normalHours === 0 && wd.overtimeHours === 0 && !wd.isLeave) {
        return;
      }
      const dateParts = wd.date.split('-');
      if (dateParts.length === 3) {
        const [y, m, d] = dateParts;
        const displayKey = `${d}-${m}-${y}`;
        map.set(displayKey, wd);
      }
    });
    return map;
  }, [workDays]);

  // Auto-select the first employee when employees list loads
  useEffect(() => {
    if (employees.length > 0 && selectedEmployeeId === null && viewMode === 'individual') {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId, viewMode]);

  // Reset selected employee if it no longer exists
  useEffect(() => {
    if (selectedEmployeeId !== null && !employees.find(e => e.id === selectedEmployeeId)) {
      setSelectedEmployeeId(employees.length > 0 ? employees[0].id : null);
    }
  }, [employees, selectedEmployeeId]);

  // Refetch work days when dialog closes
  useEffect(() => {
    if (!dialogOpen && selectedEmployeeId) {
      refetchWorkDays();
    }
  }, [dialogOpen, selectedEmployeeId, refetchWorkDays]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const handleSaveWorkDay = async (workDay: WorkDay) => {
    if (!selectedEmployeeId || !selectedDate) return;
    const dateStr = formatDateForBackend(selectedDate);
    const existing = workDaysMap.get(
      formatDateForDisplay(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    );
    try {
      if (existing) {
        await updateWorkDay.mutateAsync({ employeeId: selectedEmployeeId, date: dateStr, workDay });
      } else {
        await addWorkDay.mutateAsync({ employeeId: selectedEmployeeId, workDay });
      }
      setDialogOpen(false);
    } catch {
      // handled by mutation
    }
  };

  const monthNames = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
    'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
    'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
  ];

  const dayNames = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const formatDateForDisplay = (y: number, m: number, d: number): string => {
    return `${String(d).padStart(2, '0')}-${String(m + 1).padStart(2, '0')}-${y}`;
  };

  const formatDateForBackend = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const isLoading = employeesLoading || (selectedEmployeeId !== null && workDaysLoading);

  // Today's date string for the daily bulk table
  const todayStr = formatDateForBackend(new Date());

  const isPending = addWorkDay.isPending || updateWorkDay.isPending;

  const existingWorkDay = selectedDate
    ? workDaysMap.get(
        formatDateForDisplay(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      ) ?? null
    : null;

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Προσθήκη Ωρών Εργασίας</h2>
        <p className="text-muted-foreground">Καταγράψτε τις ώρες εργασίας και τις άδειες</p>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="flex items-start gap-3 pt-6">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Πλήρης Αμφίδρομος Συγχρονισμός
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Όλες οι ώρες εργασίας που καταχωρείτε συγχρονίζονται αυτόματα. Οι άδειες υπολογίζονται ως 8 ώρες και η μισθοδοσία ενημερώνεται αυτόματα.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'individual' | 'daily')}>
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 h-auto p-2">
          <TabsTrigger value="individual" className="whitespace-normal h-auto py-3 px-4 text-sm sm:text-base">
            Ατομική Καταχώρηση Ωρών
          </TabsTrigger>
          <TabsTrigger value="daily" className="whitespace-normal h-auto py-3 px-4 text-sm sm:text-base">
            Μαζική Καταχώρηση Ωρών
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6 mt-6">
          {!isLoading && employees.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν εργαζόμενοι</h3>
                <p className="text-muted-foreground text-center">
                  Προσθέστε έναν εργαζόμενο για να ξεκινήσετε την καταχώρηση ωρών εργασίας
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Επιλογή Εργαζομένου</CardTitle>
                  <CardDescription>Επιλέξτε εργαζόμενο για να δείτε το ημερολόγιό του</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <Select
                      value={selectedEmployeeId?.toString() || ''}
                      onValueChange={(value) => setSelectedEmployeeId(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε εργαζόμενο" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id.toString()} value={employee.id.toString()}>
                            {employee.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>

              {selectedEmployeeId !== null && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>
                          {monthNames[month]} {year}
                        </CardTitle>
                        <CardDescription>{selectedEmployee?.fullName}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleNextMonth}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {workDaysLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-2">
                        {dayNames.map((dayName) => (
                          <div
                            key={dayName}
                            className="text-center text-sm font-medium text-muted-foreground py-2"
                          >
                            {dayName}
                          </div>
                        ))}
                        {calendarDays.map((day, index) => {
                          if (day === null) {
                            return <div key={`empty-${index}`} />;
                          }

                          const dateStr = formatDateForDisplay(year, month, day);
                          const workDay = workDaysMap.get(dateStr);
                          const isToday =
                            day === new Date().getDate() &&
                            month === new Date().getMonth() &&
                            year === new Date().getFullYear();

                          const hasData = workDay && (workDay.isLeave || workDay.normalHours > 0 || workDay.overtimeHours > 0);

                          return (
                            <button
                              key={day}
                              onClick={() => handleDayClick(day)}
                              className={`
                                relative aspect-square rounded-lg border p-2 text-sm transition-all hover:border-primary hover:shadow-md
                                ${isToday ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : ''}
                                ${workDay?.isLeave ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20' : ''}
                                ${workDay && !workDay.isLeave && hasData ? 'bg-green-500/10 border-green-500/50 hover:bg-green-500/20' : ''}
                                ${!hasData ? 'hover:bg-muted/50' : ''}
                              `}
                            >
                              <div className="font-medium">{day}</div>
                              {workDay && hasData && (
                                <div className="mt-1 space-y-0.5 text-xs">
                                  {workDay.isLeave ? (
                                    <div className="text-amber-700 dark:text-amber-400 font-medium">
                                      Άδεια
                                    </div>
                                  ) : (
                                    <>
                                      {Number(workDay.normalHours) > 0 && (
                                        <div className="text-green-700 dark:text-green-400 font-medium">
                                          {workDay.normalHours.toString()}ω
                                        </div>
                                      )}
                                      {Number(workDay.overtimeHours) > 0 && (
                                        <div className="text-blue-700 dark:text-blue-400 font-medium">
                                          +{workDay.overtimeHours.toString()}ω
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="daily" className="space-y-6 mt-6">
          <DailyBulkEntryTable date={todayStr} />
        </TabsContent>
      </Tabs>

      {selectedEmployeeId !== null && selectedDate && (
        <WorkDayDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employee={selectedEmployee}
          date={formatDateForBackend(selectedDate)}
          existingWorkDay={existingWorkDay}
          onSave={handleSaveWorkDay}
          isPending={isPending}
        />
      )}
    </div>
  );
}
