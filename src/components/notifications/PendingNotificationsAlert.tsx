import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

const SESSION_KEY = 'pending_alert_shown';

export function PendingNotificationsAlert() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (unreadCount > 0 && !sessionStorage.getItem(SESSION_KEY)) {
      setOpen(true);
      sessionStorage.setItem(SESSION_KEY, '1');
    }
  }, [unreadCount]);

  const handleView = () => {
    setOpen(false);
    navigate('/agenda');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            Notificações pendentes
          </DialogTitle>
          <DialogDescription className="text-center">
            Você tem <span className="font-semibold text-foreground">{unreadCount}</span>{' '}
            {unreadCount === 1 ? 'notificação não lida' : 'notificações não lidas'}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 sm:justify-center">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <Button onClick={handleView}>
            Ver notificações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
