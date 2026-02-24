import { Button } from '@/components/ui/button';
import { Users, Calendar, DollarSign, CreditCard, Umbrella, Moon, Sun, Landmark } from 'lucide-react';
import { useTheme } from 'next-themes';

type Page = 'employees' | 'monthlyBankSalaries' | 'calendar' | 'payroll' | 'payments' | 'leave';

interface HeaderProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export default function Header({ currentPage, onPageChange }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  const navItems = [
    { id: 'employees' as Page, label: 'Εργαζόμενοι', icon: Users },
    { id: 'monthlyBankSalaries' as Page, label: 'Μηνιαίοι Μισθοί Τράπεζας', icon: Landmark },
    { id: 'calendar' as Page, label: 'Ημερολόγιο Εργαζομένων', icon: Calendar },
    { id: 'payroll' as Page, label: 'Μισθοδοσία', icon: DollarSign },
    { id: 'payments' as Page, label: 'Πληρωμές', icon: CreditCard },
    { id: 'leave' as Page, label: 'Άδειες', icon: Umbrella },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Μισθοδοσία
          </h1>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentPage === item.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onPageChange(item.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t">
        <nav className="container flex items-center justify-around py-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  currentPage === item.id
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
