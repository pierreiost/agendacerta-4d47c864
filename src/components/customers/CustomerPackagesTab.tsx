import { useState } from 'react';
import { useCustomerPackages, CustomerPackage } from '@/hooks/useCustomerPackages';
import { SellPackageDialog } from './SellPackageDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Package, Plus, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomerPackagesTabProps {
  customerId: string;
}

const statusBadge = {
  active: { label: 'Ativo', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  exhausted: { label: 'Esgotado', className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

export function CustomerPackagesTab({ customerId }: CustomerPackagesTabProps) {
  const [sellOpen, setSellOpen] = useState(false);
  const { packages, isLoading, cancelPackage } = useCustomerPackages(customerId);

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setSellOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Vender Novo Pacote
      </Button>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : packages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum pacote encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => {
            const pct = Math.min((pkg.used_sessions / pkg.total_sessions) * 100, 100);
            const badge = statusBadge[pkg.status] || statusBadge.active;
            return (
              <Card key={pkg.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{pkg.service_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {pkg.used_sessions} / {pkg.total_sessions} sessões
                        {pkg.expires_at && (
                          <> • Válido até {format(new Date(pkg.expires_at), 'dd/MM/yyyy', { locale: ptBR })}</>
                        )}
                      </p>
                    </div>
                    <Badge className={badge.className}>{badge.label}</Badge>
                  </div>

                  <Progress value={pct} className="h-2" />

                  {pkg.status === 'active' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs px-2">
                          <XCircle className="h-3 w-3 mr-1" /> Cancelar pacote
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar pacote?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. As sessões restantes serão perdidas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => cancelPackage.mutate(pkg.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Confirmar cancelamento
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SellPackageDialog open={sellOpen} onOpenChange={setSellOpen} customerId={customerId} />
    </div>
  );
}
