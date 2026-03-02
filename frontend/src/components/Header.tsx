import React, { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { PageType } from '../App';
import {
  Users,
  Calendar,
  DollarSign,
  CreditCard,
  Umbrella,
  Building2,
  Database,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  LogIn,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  activePage: PageType;
  onPageChange: (page: PageType) => void;
}

const navItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
  { id: 'employees', label: 'Εργαζόμενοι', icon: <Users className="w-4 h-4" /> },
  { id: 'calendar', label: 'Ημερολόγιο', icon: <Calendar className="w-4 h-4" /> },
  { id: 'payroll', label: 'Μισθοδοσία', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'payments', label: 'Πληρωμές', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'leaves', label: 'Άδειες', icon: <Umbrella className="w-4 h-4" /> },
  { id: 'bankSalaries', label: 'Τράπεζα', icon: <Building2 className="w-4 h-4" /> },
  { id: 'dataRecovery', label: 'Ανάκτηση', icon: <Database className="w-4 h-4" />, dashed: true } as any,
];

export default function Header({ activePage, onPageChange }: HeaderProps) {
  const { identity, clear, login, loginStatus } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: userProfile } = useGetCallerUserProfile();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const handleNavClick = (page: PageType) => {
    onPageChange(page);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:block">
              HR Payroll
            </span>
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isDashed = (item as any).dashed;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activePage === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    } ${isDashed ? 'border border-dashed border-border' : ''}`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9"
            >
              <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* User info + auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {userProfile && (
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {userProfile.name}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAuth}
                  className="gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Αποσύνδεση</span>
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleAuth}
                disabled={isLoggingIn}
                className="gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                {isLoggingIn ? 'Σύνδεση...' : 'Σύνδεση'}
              </Button>
            )}

            {/* Mobile menu toggle */}
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden w-9 h-9"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isAuthenticated && mobileOpen && (
          <div className="lg:hidden border-t border-border py-2 pb-3">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isDashed = (item as any).dashed;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left ${
                      activePage === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    } ${isDashed ? 'border border-dashed border-border' : ''}`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
