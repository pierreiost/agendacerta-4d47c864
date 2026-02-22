import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import { CustomerHistorySheet } from '@/components/customers/CustomerHistorySheet';
import { useModalPersist } from '@/hooks/useModalPersist';
import { useVenue } from '@/contexts/VenueContext';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Users, Mail, Phone, Loader2, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { maskPhone, maskCPFCNPJ, unmask } from '@/lib/masks';
import { Badge } from '@/components/ui/badge';

export default function Clientes() {
  const { customers, isLoading, deleteCustomer } = useCustomers();
  const { currentVenue } = useVenue();
  const { isReady, registerModal, setModalState, clearModal } = useModalPersist('clientes');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  // Restore modal state on mount
  useEffect(() => {
    if (isReady) {
      const wasFormOpen = registerModal('customerForm', false);
      if (wasFormOpen) {
        setFormOpen(true);
        setSelectedCustomer(null); // Restore as new customer form
      }
    }
  }, [isReady, registerModal]);

  // Track modal state changes
  useEffect(() => {
    if (isReady) {
      setModalState('customerForm', formOpen);
    }
  }, [formOpen, isReady, setModalState]);

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setSelectedCustomer(null);
      clearModal('customerForm');
    }
  };

  const searchDigits = unmask(searchTerm);
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (searchDigits && customer.phone && unmask(customer.phone).includes(searchDigits)) ||
      (searchDigits && customer.document && unmask(customer.document).includes(searchDigits)) ||
      customer.phone?.includes(searchTerm) ||
      customer.document?.includes(searchTerm)
  );

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (customerToDelete) {
      await deleteCustomer.mutateAsync(customerToDelete.id);
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setFormOpen(true);
  };

  const handleViewHistory = (customer: Customer) => {
    setHistoryCustomer(customer);
    setHistoryOpen(true);
  };

  return (
    <AppLayout title="Clientes">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Clientes</h1>
          </div>
          <Button onClick={handleNewCustomer}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Search + Counter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="text-sm whitespace-nowrap self-start sm:self-auto">
            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'cliente' : 'clientes'}
          </Badge>
        </div>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
                </p>
                {!searchTerm && (
                  <Button variant="link" onClick={handleNewCustomer} className="mt-2">
                    Cadastrar primeiro cliente
                  </Button>
                )}
              </div>
            ) : (
              <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="font-medium">{customer.name}</div>
                          {customer.address && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {customer.address}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span>{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                            {!customer.email && !customer.phone && (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {customer.document ? maskCPFCNPJ(customer.document) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(customer.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewHistory(customer)}>
                                <History className="mr-2 h-4 w-4" />
                                Histórico
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(customer)}
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
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium truncate">{customer.name}</p>
                      {customer.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{customer.phone}</span>
                        </p>
                      )}
                      {customer.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewHistory(customer)}>
                          <History className="mr-2 h-4 w-4" />
                          Histórico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(customer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(customer)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <CustomerFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        customer={selectedCustomer}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{customerToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer History Sheet */}
      <CustomerHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        customer={historyCustomer}
        venueSegment={currentVenue?.segment}
      />
    </AppLayout>
  );
}
