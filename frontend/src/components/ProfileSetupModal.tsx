import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { toast } from 'sonner';

export default function ProfileSetupModal() {
  const [name, setName] = useState('');
  const saveProfile = useSaveCallerUserProfile();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Παρακαλώ εισάγετε το όνομά σας');
      return;
    }
    try {
      await saveProfile.mutateAsync({ name: name.trim() });
      toast.success('Το προφίλ αποθηκεύτηκε!');
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Καλώς ήρθατε!</DialogTitle>
          <DialogDescription>
            Παρακαλώ εισάγετε το όνομά σας για να συνεχίσετε.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Όνομα</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Εισάγετε το όνομά σας"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <Button onClick={handleSave} disabled={saveProfile.isPending} className="w-full">
            {saveProfile.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
