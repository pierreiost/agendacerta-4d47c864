import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
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
import { useServiceOrders, type ServiceOrder, type ServiceOrderItem } from '@/hooks/useServiceOrders';
import { useCustomers } from '@/hooks/useCustomers';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';
import { maskCPFCNPJ, maskPhone, maskCEP } from '@/lib/masks';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const isEditing = !!id;
  const existingOrder = orders.find((o) => o.id === id);

  // Form state
  const [orderType, setOrderType] = useState<'simple' | 'complete'>('simple');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerZipCode, setCustomerZipCode] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(5);

  // Items state
  const [items, setItems] = useState<ItemForm[]>([]);
  const [newItem, setNewItem] = useState<ItemForm>({
    description: '',
    service_code: '',
    quantity: 1,
    unit_price: 0,
    subtotal: 0,
  });

  // Load existing order data
  useEffect(() => {
    if (existingOrder) {
      setOrderType(existingOrder.order_type as 'simple' | 'complete');
      setCustomerId(existingOrder.customer_id);
      setCustomerName(existingOrder.customer_name);
      setCustomerDocument(existingOrder.customer_document || '');
      setCustomerEmail(existingOrder.customer_email || '');
      setCustomerPhone(existingOrder.customer_phone || '');
      setCustomerAddress(existingOrder.customer_address || '');
      setCustomerCity(existingOrder.customer_city || '');
      setCustomerState(existingOrder.customer_state || '');
      setCustomerZipCode(existingOrder.customer_zip_code || '');
      setDescription(existingOrder.description);
      setNotes(existingOrder.notes || '');
      setDiscount(Number(existingOrder.discount) || 0);
      setTaxRate(Number(existingOrder.tax_rate) || 5);

      // Load items
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
    setCustomerAddress(customer.address || '');
    setCustomerOpen(false);
  };

  const updateNewItemSubtotal = (quantity: number, unitPrice: number) => {
    setNewItem((prev) => ({
      ...prev,
      quantity,
      unit_price: unitPrice,
      subtotal: quantity * unitPrice,
    }));
  };

  const handleAddItem = () => {
    if (!newItem.description || newItem.unit_price <= 0) {
      toast({
        title: 'Erro',
        description: 'Preencha a descrição e o valor do item',
        variant: 'destructive',
      });
      return;
    }

    setItems((prev) => [...prev, { ...newItem }]);
    setNewItem({
      description: '',
      service_code: '',
      quantity: 1,
      unit_price: 0,
      subtotal: 0,
    });
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

    const orderData = {
      venue_id: currentVenue.id,
      order_type: orderType,
      customer_id: customerId,
      customer_name: customerName,
      customer_document: customerDocument || null,
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      customer_address: customerAddress || null,
      customer_city: customerCity || null,
      customer_state: customerState || null,
      customer_zip_code: customerZipCode || null,
      description,
      notes: notes || null,
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

        // Update items - delete removed, update existing, add new
        const existingItemIds = items.filter((i) => i.id).map((i) => i.id);
        const currentItems = await getOrderItems(id);

        // Delete removed items
        for (const item of currentItems) {
          if (!existingItemIds.includes(item.id)) {
            await removeItem(item.id);
          }
        }

        // Update or add items
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
        
        // Add items to the new order
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

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ordens-servico')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {isEditing ? `Editar OS #${existingOrder?.order_number}` : 'Nova Ordem de Serviço'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Atualize os dados da OS' : 'Preencha os dados para criar uma nova OS'}
            </p>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tipo de OS */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de OS</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={orderType}
                  onValueChange={(v) => setOrderType(v as 'simple' | 'complete')}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simples (uso interno)</SelectItem>
                    <SelectItem value="complete">Completa (para NFS-e)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Buscar cliente existente</Label>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Nome *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>

                  {orderType === 'complete' && (
                    <div className="space-y-2">
                      <Label htmlFor="customerDocument">CPF/CNPJ</Label>
                      <Input
                        id="customerDocument"
                        value={customerDocument}
                        onChange={(e) => setCustomerDocument(maskCPFCNPJ(e.target.value))}
                        placeholder="000.000.000-00"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">E-mail</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Telefone</Label>
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                {orderType === 'complete' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="customerAddress">Endereço</Label>
                      <Input
                        id="customerAddress"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Rua, número, complemento"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerCity">Cidade</Label>
                      <Input
                        id="customerCity"
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        placeholder="Pelotas"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerState">UF</Label>
                      <Input
                        id="customerState"
                        value={customerState}
                        onChange={(e) => setCustomerState(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="RS"
                        maxLength={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerZipCode">CEP</Label>
                      <Input
                        id="customerZipCode"
                        value={customerZipCode}
                        onChange={(e) => setCustomerZipCode(maskCEP(e.target.value))}
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Serviço */}
            <Card>
              <CardHeader>
                <CardTitle>Serviço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição do serviço *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o serviço a ser executado"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações adicionais"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Itens */}
            <Card>
              <CardHeader>
                <CardTitle>Itens do Serviço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add item form */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 md:col-span-4 space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Descrição do item"
                    />
                  </div>
                  {orderType === 'complete' && (
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <Label className="text-xs">Cód. Serviço</Label>
                      <Input
                        value={newItem.service_code}
                        onChange={(e) =>
                          setNewItem((prev) => ({ ...prev, service_code: e.target.value }))
                        }
                        placeholder="000"
                      />
                    </div>
                  )}
                  <div className="col-span-3 md:col-span-1 space-y-1">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newItem.quantity}
                      onChange={(e) =>
                        updateNewItemSubtotal(Number(e.target.value), newItem.unit_price)
                      }
                    />
                  </div>
                  <div className="col-span-5 md:col-span-2 space-y-1">
                    <Label className="text-xs">Valor Unit.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={newItem.unit_price}
                      onChange={(e) =>
                        updateNewItemSubtotal(newItem.quantity, Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2 space-y-1">
                    <Label className="text-xs">Subtotal</Label>
                    <Input value={formatCurrency(newItem.subtotal)} disabled />
                  </div>
                  <div className="col-span-12 md:col-span-1">
                    <Button onClick={handleAddItem} className="w-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Items table */}
                {items.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        {orderType === 'complete' && <TableHead>Código</TableHead>}
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
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
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Totals */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Desconto</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">ISS (%)</Label>
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

                <div className="border-t pt-4 flex justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-lg font-bold">{formatCurrency(total)}</span>
                </div>

                <Button onClick={handleSave} className="w-full" size="lg">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar OS
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
