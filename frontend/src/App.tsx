import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import EmployeesPage from './pages/EmployeesPage';
import CalendarPage from './pages/CalendarPage';
import PaymentsPage from './pages/PaymentsPage';
import PayrollPage from './pages/PayrollPage';
import MonthlyBankSalariesPage from './pages/MonthlyBankSalariesPage';
import LeavePage from './pages/LeavePage';
import DataRecoveryPage from './pages/DataRecoveryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

export type Page = 'employees' | 'calendar' | 'payments' | 'payroll' | 'monthly-bank-salaries' | 'leave' | 'data-recovery';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('employees');

  const renderPage = () => {
    switch (currentPage) {
      case 'employees':
        return <EmployeesPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'payroll':
        return <PayrollPage />;
      case 'monthly-bank-salaries':
        return <MonthlyBankSalariesPage />;
      case 'leave':
        return <LeavePage />;
      case 'data-recovery':
        return <DataRecoveryPage />;
      default:
        return <EmployeesPage />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <Header currentPage={currentPage} onNavigate={setCurrentPage} />
          <main className="flex-1 container mx-auto px-4 py-6">
            {renderPage()}
          </main>
          <Footer />
        </div>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
