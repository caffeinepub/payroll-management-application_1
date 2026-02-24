import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import EmployeesPage from './pages/EmployeesPage';
import CalendarPage from './pages/CalendarPage';
import PayrollPage from './pages/PayrollPage';
import PaymentsPage from './pages/PaymentsPage';
import LeavePage from './pages/LeavePage';
import MonthlyBankSalariesPage from './pages/MonthlyBankSalariesPage';

type Page = 'employees' | 'monthlyBankSalaries' | 'calendar' | 'payroll' | 'payments' | 'leave';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('employees');

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen flex-col">
        <Header currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="flex-1 bg-gradient-to-br from-background via-background to-muted/20">
          {currentPage === 'employees' && <EmployeesPage />}
          {currentPage === 'monthlyBankSalaries' && <MonthlyBankSalariesPage />}
          {currentPage === 'calendar' && <CalendarPage />}
          {currentPage === 'payroll' && <PayrollPage />}
          {currentPage === 'payments' && <PaymentsPage />}
          {currentPage === 'leave' && <LeavePage />}
        </main>
        <Footer />
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
