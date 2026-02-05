import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Plus, MoreHorizontal, Pencil, Trash2, Clock, Loader2, Heart, Scissors } from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import { useVenue } from '@/contexts/VenueContext';
import { useModalPersist } from '@/hooks/useModalPersist';
import { getServiceIcon } from '@/lib/segment-utils';
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog';
import type { Service } from '@/types/services';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

export default function Servicos() {
  const { currentVenue } = useVenue();
  const { services, isLoading, toggleActive, deleteService } = useServices();
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  
  const { isReady, registerModal, setModalState, clearModal } = useModalPersist('servicos');
  const [formOpen, setFormOpen] = useState(false);
  
  // Restore modal state on mount
  useEffect(() => {
    if (isReady) {
      setFormOpen(registerModal('service_form'));
    }
  }, [isReady, registerModal]);

  const handleNew = () => {
    setSelectedService(null);
    setFormOpen(true);
    setModalState('service_form', true);
  };

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setFormOpen(true);
    setModalState('service_form', true);
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (serviceToDelete) {
      await deleteService.mutateAsync(serviceToDelete.id);
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const handleToggleActive = async (service: Service) => {
    await toggleActive.mutateAsync({ id: service.id, is_active: !service.is_active });
  };

  // Check if venue segment supports services (only beauty and health)
  const venueSegment = (currentVenue as { segment?: string })?.segment;
  const isServiceVenue = venueSegment === 'beauty' || venueSegment === 'health' || venueSegment === 'custom';
  const ServiceIcon = getServiceIcon(venueSegment);

  if (!isServiceVenue) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
              <ServiceIcon className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Funcionalidade não disponível</h2>
          <p className="text-muted-foreground max-w-md">
            A gestão de serviços está disponível apenas para estabelecimentos do tipo
            Salão de Beleza ou Clínica de Saúde.
            {venueSegment === 'sports' && ' Seu estabelecimento está configurado como Espaço Esportivo.'}
            {venueSegment === 'custom' && ' Para Assistência Técnica, utilize as Ordens de Serviço.'}
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie os serviços oferecidos pelo seu estabelecimento
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Serviço
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Serviços</CardTitle>
            <CardDescription>
              {services.length} serviço(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <ServiceIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Nenhum serviço cadastrado</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Comece adicionando os serviços que você oferece
                </p>
                <Button onClick={handleNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeiro Serviço
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{service.title}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatDuration(service.duration_minutes)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(service.price)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={service.is_active}
                            onCheckedChange={() => handleToggleActive(service)}
                            disabled={toggleActive.isPending}
                          />
                          <Badge variant={service.is_active ? 'default' : 'secondary'}>
                            {service.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(service)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteClick(service)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          setModalState('service_form', open);
          if (!open) {
            setSelectedService(null);
          }
        }}
        service={selectedService}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{serviceToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteService.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
