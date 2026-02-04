import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, FileText, ClipboardList, FileDown, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useServiceOrders, type ServiceOrder } from "@/hooks/useServiceOrders";
import { useServiceOrderPdf } from "@/hooks/useServiceOrderPdf";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabelsSimple: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  open: { label: "Aberta", variant: "secondary" },
  finished: { label: "Finalizada", variant: "default" },
  invoiced: { label: "Faturada", variant: "outline" },
};

const statusLabelsComplete: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Rascunho", variant: "secondary" },
  approved: { label: "Aprovada", variant: "default" },
  in_progress: { label: "Em execução", variant: "default" },
  finished: { label: "Finalizada", variant: "default" },
  invoiced: { label: "Faturada", variant: "outline" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

const getTypeBadgeStyle = (type: "simple" | "complete") => {
  if (type === "complete") {
    return "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700";
  }
  return "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700";
};

const getTypeLabel = (type: "simple" | "complete") => {
  return type === "complete" ? "NFS-e" : "Simples";
};

const getTypeIcon = (type: "simple" | "complete") => {
  return type === "complete" ? <ClipboardList className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />;
};

export default function OrdensServico() {
  const navigate = useNavigate();
  const { orders, isLoading, deleteOrder, updateOrder, getOrderItems } = useServiceOrders();
  const { generatePdf } = useServiceOrderPdf();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
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
    if (order.order_type === "simple") {
      await updateOrder({
        id: order.id,
        status_simple: newStatus as "open" | "finished" | "invoiced",
        finished_at: newStatus === "finished" ? new Date().toISOString() : order.finished_at,
      });
    } else {
      await updateOrder({
        id: order.id,
        status_complete: newStatus as "draft" | "approved" | "in_progress" | "finished" | "invoiced" | "cancelled",
        finished_at: newStatus === "finished" ? new Date().toISOString() : order.finished_at,
      });
    }
  };

  const handleDownloadPdf = async (e: React.MouseEvent, order: ServiceOrder) => {
    e.stopPropagation();
    setDownloadingPdfId(order.id);
    try {
      const orderItems = await getOrderItems(order.id);
      await generatePdf(order, orderItems);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const isFinalized = (order: ServiceOrder) => {
    const status = order.order_type === "simple" ? order.status_simple : order.status_complete;
    return status === "finished" || status === "invoiced";
  };

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Ordens de Serviço</h1>
            <p className="text-muted-foreground text-sm">Gerencie todas as ordens de serviço em um único lugar</p>
          </div>
          <Button onClick={() => navigate("/ordens-servico/nova")} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova OS
          </Button>
        </div>

        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : (
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Nº</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhuma OS encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const isComplete = order.order_type === "complete";
                    const statusConfig = isComplete
                      ? statusLabelsComplete[order.status_complete ?? "draft"]
                      : statusLabelsSimple[order.status_simple ?? "open"];

                    return (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleEdit(order)}
                      >
                        <TableCell className="font-mono font-bold">#{order.order_number}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`flex w-fit items-center border font-medium px-2 py-0.5 ${getTypeBadgeStyle(order.order_type)}`}
                          >
                            {getTypeIcon(order.order_type)}
                            {getTypeLabel(order.order_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{order.customer_document || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{order.description}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="p-0 h-auto">
                                <Badge
                                  variant={statusConfig.variant as "default" | "secondary" | "outline" | "destructive"}
                                >
                                  {statusConfig.label}
                                </Badge>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {isComplete
                                ? Object.entries(statusLabelsComplete).map(([key, { label }]) => (
                                    <DropdownMenuItem key={key} onClick={() => handleStatusChange(order, key)}>
                                      {label}
                                    </DropdownMenuItem>
                                  ))
                                : Object.entries(statusLabelsSimple).map(([key, { label }]) => (
                                    <DropdownMenuItem key={key} onClick={() => handleStatusChange(order, key)}>
                                      {label}
                                    </DropdownMenuItem>
                                  ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(order.total))}</TableCell>
                        <TableCell>{format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TooltipProvider>
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => handleDownloadPdf(e, order)} 
                                    disabled={downloadingPdfId === order.id}
                                  >
                                    {downloadingPdfId === order.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <FileDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Baixar PDF</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(order)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{isFinalized(order) ? "Visualizar" : "Editar"}</TooltipContent>
                              </Tooltip>
                              {!isFinalized(order) && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(order.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir OS</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="w-full sm:w-auto">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
