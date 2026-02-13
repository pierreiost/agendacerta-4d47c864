import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { User, Phone, Mail, FileText, UserPlus, Link } from 'lucide-react';
import type { DuplicateCustomer } from '@/hooks/useRegisterCustomer';

interface DuplicateCustomerDialogProps {
  open: boolean;
  duplicates: DuplicateCustomer[];
  onLinkExisting: (customerId: string) => void;
  onForceCreate: () => void;
  onCancel: () => void;
}

export function DuplicateCustomerDialog({
  open,
  duplicates,
  onLinkExisting,
  onForceCreate,
  onCancel,
}: DuplicateCustomerDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Cliente já cadastrado?</AlertDialogTitle>
          <AlertDialogDescription>
            Encontramos clientes semelhantes. Deseja vincular um existente ou criar um novo?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {duplicates.map((c) => (
            <button
              key={c.id}
              className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors space-y-1"
              onClick={() => onLinkExisting(c.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{c.name}</span>
                </div>
                <Link className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-6">
                {c.phone && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </span>
                )}
                {c.email && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {c.email}
                  </span>
                )}
                {c.document && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {c.document}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <Button variant="outline" onClick={onForceCreate}>
            <UserPlus className="h-4 w-4 mr-1" />
            Criar novo mesmo assim
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
