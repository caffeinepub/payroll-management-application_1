import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, Calendar, Umbrella, DollarSign, Building2 } from 'lucide-react';

export default function LoginPage() {
  const { login, loginStatus } = useInternetIdentity();
  const isLoggingIn = loginStatus === 'logging-in';

  const features = [
    { icon: <Users className="w-5 h-5" />, title: 'Διαχείριση Υπαλλήλων', desc: 'Προσθήκη, επεξεργασία και παρακολούθηση εργαζομένων' },
    { icon: <CreditCard className="w-5 h-5" />, title: 'Πληρωμές', desc: 'Καταγραφή μετρητών και τραπεζικών πληρωμών' },
    { icon: <Calendar className="w-5 h-5" />, title: 'Ημερολόγιο Εργασίας', desc: 'Καταχώρηση ωρών εργασίας και υπερωριών' },
    { icon: <Umbrella className="w-5 h-5" />, title: 'Διαχείριση Αδειών', desc: 'Παρακολούθηση ετήσιων αδειών' },
    { icon: <DollarSign className="w-5 h-5" />, title: 'Μισθοδοσία', desc: 'Αυτόματος υπολογισμός μισθών' },
    { icon: <Building2 className="w-5 h-5" />, title: 'Τραπεζικοί Μισθοί', desc: 'Μηνιαίοι τραπεζικοί μισθοί ανά υπάλληλο' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">HR Payroll Manager</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Ολοκληρωμένη διαχείριση μισθοδοσίας και εργαζομένων για την επιχείρησή σας
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {features.map((f, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Login Button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={() => login()}
              disabled={isLoggingIn}
              className="px-10 py-3 text-base"
            >
              {isLoggingIn ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Σύνδεση...
                </span>
              ) : (
                'Σύνδεση'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
