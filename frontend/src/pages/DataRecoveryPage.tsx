import { useState, useRef } from 'react';
import { Upload, Download, AlertTriangle, CheckCircle, Database, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// All localStorage keys used by the app
const DATA_KEYS = [
  'workDays',
  'payments',
  'monthlyBankSalaries',
  'leaveRecords',
  'employees',
  'nextEmployeeId',
  'nextBankSalaryId',
];

interface ExportData {
  exportedAt: string;
  version: string;
  data: Record<string, unknown>;
}

function exportLocalStorageData(): ExportData {
  const data: Record<string, unknown> = {};
  for (const key of DATA_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }
  }
  // Also export ALL keys that might be app-related
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !DATA_KEYS.includes(key)) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    }
  }
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data,
  };
}

function getLocalStorageSummary() {
  const summary: Record<string, { exists: boolean; size: number; preview: string }> = {};
  for (const key of DATA_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      let preview = '';
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          preview = `${parsed.length} εγγραφές`;
        } else if (typeof parsed === 'object' && parsed !== null) {
          preview = `${Object.keys(parsed).length} κλειδιά`;
        } else {
          preview = String(parsed);
        }
      } catch {
        preview = value.substring(0, 50);
      }
      summary[key] = { exists: true, size: value.length, preview };
    } else {
      summary[key] = { exists: false, size: 0, preview: 'Κενό' };
    }
  }
  return summary;
}

const KEY_LABELS: Record<string, string> = {
  workDays: 'Ημέρες Εργασίας',
  payments: 'Πληρωμές',
  monthlyBankSalaries: 'Μηνιαίοι Μισθοί Τράπεζας',
  leaveRecords: 'Άδειες',
  employees: 'Εργαζόμενοι (τοπικά)',
  nextEmployeeId: 'Επόμενο ID Εργαζομένου',
  nextBankSalaryId: 'Επόμενο ID Μισθού',
};

export default function DataRecoveryPage() {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [importedKeys, setImportedKeys] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const summary = getLocalStorageSummary();
  const hasData = Object.values(summary).some((s) => s.exists);

  const handleExport = () => {
    const exportData = exportLocalStorageData();
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Τα δεδομένα εξήχθησαν επιτυχώς!');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content) as ExportData;

        if (!importData.data || typeof importData.data !== 'object') {
          setImportStatus('error');
          setImportMessage('Μη έγκυρο αρχείο backup. Δεν βρέθηκε πεδίο "data".');
          return;
        }

        const imported: string[] = [];
        for (const [key, value] of Object.entries(importData.data)) {
          try {
            localStorage.setItem(key, JSON.stringify(value));
            imported.push(key);
          } catch (err) {
            console.error(`Failed to import key ${key}:`, err);
          }
        }

        setImportedKeys(imported);
        setImportStatus('success');
        setImportMessage(
          `Επιτυχής εισαγωγή ${imported.length} κλειδιών δεδομένων από το αρχείο backup (${importData.exportedAt ? new Date(importData.exportedAt).toLocaleString('el-GR') : 'άγνωστη ημερομηνία'}).`
        );

        // Invalidate all queries to force refetch with new data
        queryClient.invalidateQueries();
        toast.success('Τα δεδομένα εισήχθησαν επιτυχώς! Ανανεώνονται οι σελίδες...');
      } catch (err) {
        setImportStatus('error');
        setImportMessage('Σφάλμα κατά την ανάλυση του αρχείου JSON. Βεβαιωθείτε ότι το αρχείο είναι έγκυρο backup.');
        console.error('Import error:', err);
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRefreshQueries = () => {
    queryClient.invalidateQueries();
    queryClient.refetchQueries();
    toast.success('Τα δεδομένα ανανεώθηκαν!');
  };

  const handleClearData = () => {
    if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε ΟΛΑ τα τοπικά δεδομένα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.')) {
      return;
    }
    for (const key of DATA_KEYS) {
      localStorage.removeItem(key);
    }
    queryClient.invalidateQueries();
    toast.success('Τα τοπικά δεδομένα διαγράφηκαν.');
    setImportStatus('idle');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ανάκτηση Δεδομένων</h1>
        <p className="text-muted-foreground mt-1">
          Εξαγωγή και εισαγωγή δεδομένων για μεταφορά μεταξύ εκδόσεων της εφαρμογής.
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Πώς να ανακτήσετε τα δεδομένα σας από την έκδοση 227</AlertTitle>
        <AlertDescription className="mt-2 space-y-1 text-sm">
          <p>
            <strong>Βήμα 1:</strong> Ανοίξτε την παλιά έκδοση της εφαρμογής (v227) στον browser σας.
          </p>
          <p>
            <strong>Βήμα 2:</strong> Μεταβείτε στη σελίδα "Ανάκτηση" και κάντε κλικ στο <strong>"Εξαγωγή Δεδομένων"</strong>.
          </p>
          <p>
            <strong>Βήμα 3:</strong> Επιστρέψτε σε αυτή τη σελίδα (νέα έκδοση) και κάντε κλικ στο <strong>"Εισαγωγή Δεδομένων"</strong>.
          </p>
          <p>
            <strong>Βήμα 4:</strong> Επιλέξτε το αρχείο JSON που κατεβάσατε και τα δεδομένα θα επαναφερθούν.
          </p>
        </AlertDescription>
      </Alert>

      {/* Current Data Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Τρέχουσα Κατάσταση Δεδομένων
          </CardTitle>
          <CardDescription>
            Δεδομένα που βρίσκονται αυτή τη στιγμή στον browser σας
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="text-center py-6 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Δεν βρέθηκαν τοπικά δεδομένα σε αυτή την έκδοση.</p>
              <p className="text-sm mt-1">Χρησιμοποιήστε την εισαγωγή για να επαναφέρετε τα δεδομένα σας.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {DATA_KEYS.map((key) => {
                const info = summary[key];
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      info.exists ? 'bg-success/5 border-success/20' : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {info.exists ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span className="text-sm font-medium">{KEY_LABELS[key] || key}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {info.exists ? info.preview : 'Κενό'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Status */}
      {importStatus === 'success' && (
        <Alert className="border-success/30 bg-success/5">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertTitle className="text-success">Επιτυχής Εισαγωγή</AlertTitle>
          <AlertDescription>
            <p>{importMessage}</p>
            {importedKeys.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Κλειδιά: {importedKeys.join(', ')}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {importStatus === 'error' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Σφάλμα Εισαγωγής</AlertTitle>
          <AlertDescription>{importMessage}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4" />
              Εξαγωγή Δεδομένων
            </CardTitle>
            <CardDescription className="text-sm">
              Κατεβάστε όλα τα τοπικά δεδομένα ως αρχείο JSON για backup ή μεταφορά.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} className="w-full" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Εξαγωγή Δεδομένων
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Εισαγωγή Δεδομένων
            </CardTitle>
            <CardDescription className="text-sm">
              Φορτώστε ένα αρχείο JSON backup για να επαναφέρετε τα δεδομένα σας.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Εισαγωγή Δεδομένων
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Refresh & Clear */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={handleRefreshQueries} className="flex-1">
          <RefreshCw className="w-4 h-4 mr-2" />
          Ανανέωση Δεδομένων
        </Button>
        <Button
          variant="destructive"
          onClick={handleClearData}
          className="flex-1"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Διαγραφή Τοπικών Δεδομένων
        </Button>
      </div>

      {/* Manual Recovery Instructions */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4" />
            Χειροκίνητη Ανάκτηση (Για Προχωρημένους)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Αν δεν μπορείτε να αποκτήσετε πρόσβαση στην παλιά έκδοση, μπορείτε να ανακτήσετε τα δεδομένα χειροκίνητα:
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Ανοίξτε τον browser στην παλιά URL της εφαρμογής</li>
            <li>Πατήστε F12 για να ανοίξετε τα Developer Tools</li>
            <li>Μεταβείτε στο tab "Application" → "Local Storage"</li>
            <li>Αντιγράψτε τα δεδομένα από τα κλειδιά: <code className="bg-muted px-1 rounded">workDays</code>, <code className="bg-muted px-1 rounded">payments</code>, <code className="bg-muted px-1 rounded">leaveRecords</code>, <code className="bg-muted px-1 rounded">monthlyBankSalaries</code></li>
            <li>Επικολλήστε τα στο αντίστοιχο κλειδί της νέας εφαρμογής</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
