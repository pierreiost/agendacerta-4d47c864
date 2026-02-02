import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, FileDown, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useServiceOrders, type ServiceOrderItem } from '@/hooks/useServiceOrders';
import { useCustomers } from '@/hooks/useCustomers';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';
import { maskCPFCNPJ, maskPhone, maskCEP } from '@/lib/masks';
import { useCepLookup } from '@/hooks/useCepLookup';
import { useServiceOrderPdf } from '@/hooks/useServiceOrderPdf';
import { ServiceOrderItemForm } from '@/components/service-orders/ServiceOrderItemForm';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ItemForm {
  id?: string;
  description: string;
  service_code: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export default function OrdemServicoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const { orders, createOrder, updateOrder, getOrderItems, addItem, updateItem, removeItem } = useServiceOrders();
  const { customers } = useCustomers();
  const { lookupCep, isLoading: isLoadingCep } = useCepLookup();
  const { generatePdf } = useServiceOrderPdf();

  const isEditing = !!id;
  const existingOrder = orders.find((o) => o.id === id);

  // Form state - Default to 'complete' for new orders
  const [orderType, setOrderType] = useState<'simple' | 'complete'>('complete');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCep, setCustomerCep] = useState('');
  const [customerLogradouro, setCustomerLogradouro] = useState('');
  const [customerNumero, setCustomerNumero] = useState('');
  const [customerComplemento, setCustomerComplemento] = useState('');
  const [customerBairro, setCustomerBairro] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(5);

  // Items state
  const [items, setItems] = useState<ItemForm[]>([]);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  
  // Finalization dialog
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Build address from components
  const buildAddress = () => {
    const parts = [];
    if (customerLogradouro) {
      let line = customerLogradouro;
      if (customerNumero) line += `, ${customerNumero}`;
      if (customerComplemento) line += ` - ${customerComplemento}`;
      parts.push(line);
    }
    if (customerBairro) parts.push(customerBairro);
    return parts.join(' - ') || null;
  };

  // Parse address into components (best effort)
  const parseAddress = (address: string | null) => {
    if (!address) return { logradouro: '', numero: '', complemento: '', bairro: '' };
    return { logradouro: address, numero: '', complemento: '', bairro: '' };
  };

  // Load existing order data
  useEffect(() => {
    if (existingOrder) {
      setOrderType(existingOrder.order_type as 'simple' | 'complete');
      setCustomerId(existingOrder.customer_id);
      setCustomerName(existingOrder.customer_name);
      setCustomerDocument(existingOrder.customer_document || '');
      setCustomerEmail(existingOrder.customer_email || '');
      setCustomerPhone(existingOrder.customer_phone || '');
      
      const parsed = parseAddress(existingOrder.customer_address);
      setCustomerLogradouro(parsed.logradouro);
      setCustomerNumero(parsed.numero);
      setCustomerComplemento(parsed.complemento);
      setCustomerBairro(parsed.bairro);
      
      setCustomerCity(existingOrder.customer_city || '');
      setCustomerState(existingOrder.customer_state || '');
      setCustomerCep(existingOrder.customer_zip_code || '');
      setDescription(existingOrder.description);
      setNotes(existingOrder.notes || '');
      setDiscount(Number(existingOrder.discount) || 0);
      setTaxRate(Number(existingOrder.tax_rate) || 5);

      loadItems();
    }
  }, [existingOrder]);

  const loadItems = async () => {
    if (!id) return;
    const orderItems = await getOrderItems(id);
    setItems(
      orderItems.map((item) => ({
        id: item.id,
        description: item.description,
        service_code: item.service_code || '',
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        subtotal: Number(item.subtotal),
      }))
    );
  };

  const handleCustomerSelect = (customer: typeof customers[0]) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerDocument(customer.document || '');
    setCustomerEmail(customer.email || '');
    setCustomerPhone(customer.phone || '');
    
    // Parse address if exists
    if (customer.address) {
      const parsed = parseAddress(customer.address);
      setCustomerLogradouro(parsed.logradouro);
    }
    
    setCustomerOpen(false);
  };

  // Auto-lookup CEP
  const handleCepChange = async (value: string) => {
    const masked = maskCEP(value);
    setCustomerCep(masked);
    
    const digits = value.replace(/\D/g, '');
    if (digits.length === 8) {
      const data = await lookupCep(digits);
      if (data) {
        setCustomerLogradouro(data.logradouro || '');
        setCustomerBairro(data.bairro || '');
        setCustomerCity(data.localidade || '');
        setCustomerState(data.uf || '');
      }
    }
  };

  const handleAddItemFromForm = async (item: {
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    service_code?: string | null;
  }) => {
    setItems((prev) => [...prev, {
      description: item.description,
      service_code: item.service_code || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }]);
    setShowAddItemForm(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = orderType === 'complete' ? subtotal * (taxRate / 100) : 0;
    const total = subtotal - discount + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const handleSave = async () => {
    if (!currentVenue) return;

    if (!customerName.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o nome do cliente',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe a descrição do serviço',
        variant: 'destructive',
      });
      return;
    }

    const { subtotal, taxAmount, total } = calculateTotals();
    const customerAddress = buildAddress();

    const orderData = {
      venue_id: currentVenue.id,
      order_type: orderType,
      customer_id: customerId,
      customer_name: customerName,
      customer_document: customerDocument || null,
      customer_email: orderType === 'complete' ? (customerEmail || null) : null,
      customer_phone: customerPhone || null,
      customer_address: customerAddress,
      customer_city: customerCity || null,
      customer_state: customerState || null,
      customer_zip_code: customerCep || null,
      description,
      notes: orderType === 'complete' ? (notes || null) : null,
      subtotal,
      discount,
      tax_rate: orderType === 'complete' ? taxRate : null,
      tax_amount: taxAmount,
      total,
      status_simple: orderType === 'simple' ? ('open' as const) : null,
      status_complete: orderType === 'complete' ? ('draft' as const) : null,
    };

    try {
      if (isEditing && id) {
        await updateOrder({ id, ...orderData });

        const existingItemIds = items.filter((i) => i.id).map((i) => i.id);
        const currentItems = await getOrderItems(id);

        for (const item of currentItems) {
          if (!existingItemIds.includes(item.id)) {
            await removeItem(item.id);
          }
        }

        for (const item of items) {
          if (item.id) {
            await updateItem({
              id: item.id,
              description: item.description,
              service_code: item.service_code || null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
            });
          } else {
            await addItem({
              service_order_id: id,
              description: item.description,
              service_code: item.service_code || null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
            });
          }
        }

        toast({ title: 'OS atualizada com sucesso!' });
      } else {
        const newOrder = await createOrder(orderData);
        
        if (newOrder) {
          for (const item of items) {
            await addItem({
              service_order_id: newOrder.id,
              description: item.description,
              service_code: item.service_code || null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
            });
          }
        }

        toast({ title: 'OS criada com sucesso!' });
      }

      navigate('/ordens-servico');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a OS',
        variant: 'destructive',
      });
    }
  };

  // Finalize order
  const handleFinalize = async () => {
    if (!existingOrder || !id) return;

    try {
      const newStatus = orderType === 'simple' ? 'finished' : 'finished';
      
      if (orderType === 'simple') {
        await updateOrder({
          id,
          status_simple: newStatus as 'finished',
          finished_at: new Date().toISOString(),
        });
      } else {
        await updateOrder({
          id,
          status_complete: newStatus as 'finished',
          finished_at: new Date().toISOString(),
        });
      }

      toast({ title: 'OS finalizada com sucesso!' });
      setShowFinalizeDialog(false);
      navigate('/ordens-servico');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar a OS',
        variant: 'destructive',
      });
    }
  };

  // Generate PDF
  const handleGeneratePdf = async () => {
    if (!existingOrder) return;

    setIsGeneratingPdf(true);
    try {
      const orderItems = await getOrderItems(existingOrder.id);
      await generatePdf(existingOrder, orderItems);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o PDF',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  // Get current status
  const getCurrentStatus = () => {
    if (!existingOrder) return null;
    return orderType === 'simple' ? existingOrder.status_simple : existingOrder.status_complete;
  };

  const isFinalized = () => {
    const status = getCurrentStatus();
    return status === 'finished' || status === 'invoiced';
  };

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ordens-servico')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold">
                {isEditing ? `OS #${existingOrder?.order_number}` : 'Nova OS'}
              </h1>
              {isEditing && getCurrentStatus() && (
                <Badge variant={isFinalized() ? 'default' : 'secondary'}>
                  {getCurrentStatus() === 'open' && 'Aberta'}
                  {getCurrentStatus() === 'draft' && 'Rascunho'}
                  {getCurrentStatus() === 'approved' && 'Aprovada'}
                  {getCurrentStatus() === 'in_progress' && 'Em execução'}
                  {getCurrentStatus() === 'finished' && 'Finalizada'}
                  {getCurrentStatus() === 'invoiced' && 'Faturada'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {isEditing ? 'Atualize os dados da OS' : 'Preencha os dados para criar uma nova OS'}
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  PDF
                </Button>
                {!isFinalized() && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowFinalizeDialog(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Finalizar
                  </Button>
                )}
              </>
            )}
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Tipo de OS */}
            <Card>
              <CardHeader className="py-3 md:py-4">
                <CardTitle className="text-base">Tipo de OS</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Select
                  value={orderType}
                  onValueChange={(v) => setOrderType(v as 'simple' | 'complete')}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simples (registro rápido)</SelectItem>
                    <SelectItem value="complete">Completa (para NFS-e)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Cliente */}
            <Card>
              <CardHeader className="py-3 md:py-4">
                <CardTitle className="text-base">Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label className="text-sm">Buscar cliente existente</Label>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {customerId
                          ? customers.find((c) => c.id === customerId)?.name
                          : 'Selecionar cliente...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                          <CommandGroup>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                onSelect={() => handleCustomerSelect(customer)}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    customerId === customer.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div>
                                  <p>{customer.name}</p>
                                  {customer.document && (
                                    <p className="text-xs text-muted-foreground">
                                      {customer.document}
                                    </p>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="customerName" className="text-sm">Nome *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="customerPhone" className="text-sm">Telefone</Label>
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                {/* Fields hidden for simple type */}
                {orderType === 'complete' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="customerDocument" className="text-sm">CPF/CNPJ</Label>
                        <Input
                          id="customerDocument"
                          value={customerDocument}
                          onChange={(e) => setCustomerDocument(maskCPFCNPJ(e.target.value))}
                          placeholder="000.000.000-00"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="customerEmail" className="text-sm">E-mail</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>

                    {/* Address with CEP auto-fill */}
                    <div className="pt-3 border-t space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="customerCep" className="text-sm">CEP</Label>
                          <div className="relative">
                            <Input
                              id="customerCep"
                              value={customerCep}
                              onChange={(e) => handleCepChange(e.target.value)}
                              placeholder="00000-000"
                            />
                            {isLoadingCep && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label htmlFor="customerLogradouro" className="text-sm">Logradouro</Label>
                          <Input
                            id="customerLogradouro"
                            value={customerLogradouro}
                            onChange={(e) => setCustomerLogradouro(e.target.value)}
                            placeholder="Rua, Avenida..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="customerNumero" className="text-sm">Nº</Label>
                          <Input
                            id="customerNumero"
                            value={customerNumero}
                            onChange={(e) => setCustomerNumero(e.target.value)}
                            placeholder="123"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="customerComplemento" className="text-sm">Compl.</Label>
                          <Input
                            id="customerComplemento"
                            value={customerComplemento}
                            onChange={(e) => setCustomerComplemento(e.target.value)}
                            placeholder="Apto"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label htmlFor="customerBairro" className="text-sm">Bairro</Label>
                          <Input
                            id="customerBairro"
                            value={customerBairro}
                            onChange={(e) => setCustomerBairro(e.target.value)}
                            placeholder="Bairro"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3 space-y-1">
                          <Label htmlFor="customerCity" className="text-sm">Cidade</Label>
                          <Input
                            id="customerCity"
                            value={customerCity}
                            onChange={(e) => setCustomerCity(e.target.value)}
                            placeholder="Cidade"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="customerState" className="text-sm">UF</Label>
                          <Input
                            id="customerState"
                            value={customerState}
                            onChange={(e) => setCustomerState(e.target.value.toUpperCase().slice(0, 2))}
                            placeholder="RS"
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Serviço */}
            <Card>
              <CardHeader className="py-3 md:py-4">
                <CardTitle className="text-base">Serviço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1">
                  <Label htmlFor="description" className="text-sm">Descrição do serviço *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o serviço a ser executado"
                    rows={2}
                  />
                </div>

                {orderType === 'complete' && (
                  <div className="space-y-1">
                    <Label htmlFor="notes" className="text-sm">Observações</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observações adicionais"
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Itens */}
            <Card>
              <CardHeader className="py-3 md:py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Itens do Serviço</CardTitle>
                {!showAddItemForm && (
                  <Button
                    size="sm"
                    onClick={() => setShowAddItemForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Add item form */}
                {showAddItemForm && (
                  <ServiceOrderItemForm
                    orderType={orderType}
                    onAddItem={handleAddItemFromForm}
                    onCancel={() => setShowAddItemForm(false)}
                  />
                )}

                {/* Items table */}
                {items.length > 0 ? (
                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <div className="min-w-[400px] px-4 md:px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            {orderType === 'complete' && <TableHead>Código</TableHead>}
                            <TableHead className="text-center w-[60px]">Qtd</TableHead>
                            <TableHead className="text-right">V. Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="w-[40px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="max-w-[150px] truncate">{item.description}</TableCell>
                              {orderType === 'complete' && (
                                <TableCell>{item.service_code || '-'}</TableCell>
                              )}
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.unit_price)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.subtotal)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  !showAddItemForm && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum item adicionado. Clique em "Adicionar" para incluir peças ou serviços.
                    </p>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Totals */}
          <div className="space-y-4 md:space-y-6">
            <Card className="lg:sticky lg:top-6">
              <CardHeader className="py-3 md:py-4">
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="discount" className="text-sm">Desconto</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>

                {orderType === 'complete' && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="taxRate" className="text-sm">ISS (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                      />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ISS ({taxRate}%)</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                  </>
                )}

                <div className="border-t pt-3 flex justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-lg font-bold">{formatCurrency(total)}</span>
                </div>

                <Button onClick={handleSave} className="w-full" size="lg">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar OS
                </Button>

                {isEditing && !isFinalized() && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setShowFinalizeDialog(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Finalizar OS
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Finalize Dialog */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Ordem de Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Ao finalizar a OS, ela será contabilizada nos relatórios financeiros.
              Esta ação marca o serviço como concluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize}>
              Finalizar OS
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
