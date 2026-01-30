import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { useSpaces, useCategories, type Space } from '@/hooks/useSpaces';
import { useVenue } from '@/contexts/VenueContext';
import { SpaceFormDialog } from '@/components/spaces/SpaceFormDialog';
import { CategoryFormDialog } from '@/components/spaces/CategoryFormDialog';
import { useModalPersist } from '@/hooks/useModalPersist';
import { Plus, MoreHorizontal, Pencil, Trash2, Tag, Loader2 } from 'lucide-react';

export default function Espacos() {
  const { currentVenue } = useVenue();
  const { spaces, isLoading, updateSpace, deleteSpace } = useSpaces();
  const { categories } = useCategories();
  const { isReady, registerModal, setModalState, clearModal } = useModalPersist('espacos');

  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [deletingSpace, setDeletingSpace] = useState<Space | null>(null);

  // Restore modal state on mount
  useEffect(() => {
    if (isReady) {
      const wasSpaceDialogOpen = registerModal('spaceForm', false);
      if (wasSpaceDialogOpen) {
        setSpaceDialogOpen(true);
        setEditingSpace(null);
      }
    }
  }, [isReady, registerModal]);

  // Track modal state changes
  useEffect(() => {
    if (isReady) {
      setModalState('spaceForm', spaceDialogOpen);
    }
  }, [spaceDialogOpen, isReady, setModalState]);

  const handleSpaceDialogChange = (open: boolean) => {
    setSpaceDialogOpen(open);
    if (!open) {
      setEditingSpace(null);
      clearModal('spaceForm');
    }
  };

  const handleEditSpace = (space: Space) => {
    setEditingSpace(space);
    setSpaceDialogOpen(true);
  };

  const handleDeleteSpace = async () => {
    if (deletingSpace) {
      await deleteSpace.mutateAsync(deletingSpace.id);
      setDeletingSpace(null);
    }
  };

  const handleToggleActive = async (space: Space) => {
    await updateSpace.mutateAsync({
      id: space.id,
      is_active: !space.is_active,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Espaços</h1>
            <p className="text-muted-foreground">
              Gerencie os espaços disponíveis para reserva
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
              <Tag className="mr-2 h-4 w-4" />
              Categorias
            </Button>
            <Button onClick={() => { setEditingSpace(null); setSpaceDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Espaço
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Espaços</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : spaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Tag className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">Nenhum espaço cadastrado</h3>
                <p className="text-muted-foreground mt-1">
                  Comece criando seu primeiro espaço
                </p>
                <Button className="mt-4" onClick={() => setSpaceDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Espaço
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Capacidade</TableHead>
                    <TableHead>Preço/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spaces.map((space) => (
                    <TableRow key={space.id}>
                      <TableCell className="font-medium">{space.name}</TableCell>
                      <TableCell>
                        {space.category ? (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: space.category.color ?? undefined,
                              color: space.category.color ?? undefined,
                            }}
                          >
                            {space.category.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{space.capacity} pessoa(s)</TableCell>
                      <TableCell>{formatCurrency(Number(space.price_per_hour))}</TableCell>
                      <TableCell>
                        <Switch
                          checked={space.is_active ?? false}
                          onCheckedChange={() => handleToggleActive(space)}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditSpace(space)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeletingSpace(space)}
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

      <SpaceFormDialog
        open={spaceDialogOpen}
        onOpenChange={handleSpaceDialogChange}
        space={editingSpace}
        venueId={currentVenue?.id ?? ''}
        categories={categories}
      />

      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        venueId={currentVenue?.id ?? ''}
      />

      <AlertDialog open={!!deletingSpace} onOpenChange={() => setDeletingSpace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir espaço?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingSpace?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSpace} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
