import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Pencil, Trash2, FileCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServiceOrders, type ServiceOrder } from '@/hooks/useServiceOrders';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabelsSimple: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  open: { label: 'Aberta', variant: 'secondary' },
  finished: { label: 'Finalizada', variant: 'default' },
  invoiced: { label: 'Faturada', variant: 'outline' },
};

const statusLabelsComplete: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  approved: { label: 'Aprovada', variant: 'default' },
  in_progress: { label: 'Em execução', variant: 'default' },
  finished: { label: 'Finalizada', variant: 'default' },
  invoiced: { label: 'Faturada', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

export default function OrdensServico() {
  const navigate = useNavigate();
  const { orders, isLoading, deleteOrder, updateOrder } = useServiceOrders();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const simpleOrders = orders.filter((o) => o.order_type === 'simple');
  const completeOrders = orders.filter((o) => o.order_type === 'complete');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const handleEdit = (order: ServiceOrder) => {
    navigate(`/ordens-servico/${order.id}`);
  };

  const handleDelete = (id: string) => {
    setOrderToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (orderToDelete) {
      deleteOrder(orderToDelete);
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleStatusChange = async (order: ServiceOrder, newStatus: string) => {
    if (order.order_type === 'simple') {
      await updateOrder({
        id: order.id,
        status_simple: newStatus as 'open' | 'finished' | 'invoiced',
        finished_at: newStatus === 'finished' ? new Date().toISOString() : order.finished_at,
      });
    } else {
      await updateOrder({
        id: order.id,
        status_complete: newStatus as 'draft' | 'approved' | 'in_progress' | 'finished' | 'invoiced' | 'cancelled',
        finished_at: newStatus === 'finished' ? new Date().toISOString() : order.finished_at,
      });
    }
  };

  const renderOrdersTable = (ordersList: ServiceOrder[], isComplete: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Nº</TableHead>
          <TableHead>Cliente</TableHead>
          {isComplete && <TableHead>CPF/CNPJ</TableHead>}
          <TableHead>Descrição</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Data</TableHead>
          <TableHead className="w-[100px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordersList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={isComplete ? 8 : 7} className="text-center py-8 text-muted-foreground">
              Nenhuma OS encontrada
            </TableCell>
          </TableRow>
        ) : (
          ordersList.map((order) => {
            const status = isComplete
              ? statusLabelsComplete[order.status_complete ?? 'draft']
              : statusLabelsSimple[order.status_simple ?? 'open'];

            return (
              <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(order)}>
                <TableCell className="font-mono font-bold">#{order.order_number}</TableCell>
                <TableCell>{order.customer_name}</TableCell>
                {isComplete && <TableCell>{order.customer_document || '-'}</TableCell>}
                <TableCell className="max-w-[200px] truncate">{order.description}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="p-0 h-auto">
                        <Badge variant={status.variant as 'default' | 'secondary' | 'outline' | 'destructive'}>
                          {status.label}
                        </Badge>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {isComplete
                        ? Object.entries(statusLabelsComplete).map(([key, { label }]) => (
                            <DropdownMenuItem
                              key={key}
                              onClick={() => handleStatusChange(order, key)}
                            >
                              {label}
                            </DropdownMenuItem>
                          ))
                        : Object.entries(statusLabelsSimple).map(([key, { label }]) => (
                            <DropdownMenuItem
                              key={key}
                              onClick={() => handleStatusChange(order, key)}
                            >
                              {label}
                            </DropdownMenuItem>
                          ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(Number(order.total))}
                </TableCell>
                <TableCell>
                  {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(order)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(order.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ordens de Serviço</h1>
            <p className="text-muted-foreground">
              Gerencie suas OS simples e completas (para NFS-e)
            </p>
          </div>
          <Button onClick={() => navigate('/ordens-servico/nova')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova OS
          </Button>
        </div>

        <Tabs defaultValue="simple">
          <TabsList>
            <TabsTrigger value="simple" className="gap-2">
              <FileText className="h-4 w-4" />
              Simples ({simpleOrders.length})
            </TabsTrigger>
            <TabsTrigger value="complete" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Completa / NFS-e ({completeOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="mt-4">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : (
              renderOrdersTable(simpleOrders, false)
            )}
          </TabsContent>

          <TabsContent value="complete" className="mt-4">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : (
              renderOrdersTable(completeOrders, true)
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir OS</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
