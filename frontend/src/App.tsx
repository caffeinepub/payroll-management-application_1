import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import Header from './components/Header';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import EmployeesPage from './pages/EmployeesPage';
import CalendarPage from './pages/CalendarPage';
import PayrollPage from './pages/PayrollPage';
import PaymentsPage from './pages/PaymentsPage';
import LeavePage from './pages/LeavePage';
import MonthlyBankSalariesPage from './pages/MonthlyBankSalariesPage';
import DataRecoveryPage from './pages/DataRecoveryPage';
import ProfileSetupModal from './components/ProfileSetupModal';

export type PageType =
  | 'employees'
  | 'calendar'
  | 'payroll'
  | 'payments'
  | 'leaves'
  | 'bankSalaries'
  | 'dataRecovery';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnMount: true,
    },
  },
});

function AppContent() {
  const [activePage, setActivePage] = useState<PageType>('employees');
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  const showProfileSetup = isAuthenticated && !profileLoading && profileFetched && userProfile === null;

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'employees':
        return <EmployeesPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'payroll':
        return <PayrollPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'leaves':
        return <LeavePage />;
      case 'bankSalaries':
        return <MonthlyBankSalariesPage />;
      case 'dataRecovery':
        return <DataRecoveryPage />;
      default:
        return <EmployeesPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header activePage={activePage} onPageChange={setActivePage} />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {renderPage()}
      </main>
      <Footer />
      {showProfileSetup && <ProfileSetupModal />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AppContent />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
