import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'notification_permission_asked';

export function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default' &&
      !localStorage.getItem(STORAGE_KEY)
    ) {
      setVisible(true);
    }
  }, []);

  const handleActivate = async () => {
    localStorage.setItem(STORAGE_KEY, '1');
    try {
      await Notification.requestPermission();
    } catch {
      // Safari older versions
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mx-2 md:mx-4 mt-2 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <Bell className="h-5 w-5 text-primary flex-shrink-0" />
      <p className="flex-1 text-foreground">
        Ative as notificações para não perder nenhum agendamento.
      </p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 px-2">
          <X className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={handleActivate} className="h-8">
          Ativar
        </Button>
      </div>
    </div>
  );
}
