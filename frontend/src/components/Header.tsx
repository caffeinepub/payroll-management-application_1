import { useState } from 'react';
import { Menu, X, Users, Calendar, CreditCard, DollarSign, Building2, Umbrella, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import type { Page } from '../App';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'employees', label: 'Εργαζόμενοι', icon: <Users className="w-4 h-4" /> },
  { id: 'calendar', label: 'Ημερολόγιο', icon: <Calendar className="w-4 h-4" /> },
  { id: 'payments', label: 'Πληρωμές', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'payroll', label: 'Μισθοδοσία', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'monthly-bank-salaries', label: 'Τράπεζα', icon: <Building2 className="w-4 h-4" /> },
  { id: 'leave', label: 'Άδειες', icon: <Umbrella className="w-4 h-4" /> },
  { id: 'data-recovery', label: 'Ανάκτηση', icon: <Database className="w-4 h-4" /> },
];

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:block">Μισθοδοσία</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                } ${item.id === 'data-recovery' ? 'border border-dashed border-muted-foreground/50' : ''}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border py-2 pb-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {item.icon}
                {item.label}
                {item.id === 'data-recovery' && (
                  <span className="ml-auto text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">Ανάκτηση</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
