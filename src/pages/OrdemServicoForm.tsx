import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Plus, Trash2, FileDown, CheckCircle2, Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

import { useServiceOrders } from "@/hooks/useServiceOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { useVenue } from "@/contexts/VenueContext";
import { useToast } from "@/hooks/use-toast";
import { maskCPFCNPJ, maskPhone, maskCEP } from "@/lib/masks";
import { useCepLookup } from "@/hooks/useCepLookup";
import { useServiceOrderPdf } from "@/hooks/useServiceOrderPdf";
import { useFormPersist } from "@/hooks/useFormPersist";
import { ServiceOrderItemForm } from "@/components/service-orders/ServiceOrderItemForm";
import { cn } from "@/lib/utils";
import { OSItemRow } from "@/components/service-orders/OSItemRow";

const itemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Descrição é obrigatória"),
  service_code: z.string().optional().nullable(),
  quantity: z.number().min(1, "Qtd mínima é 1"),
  unit_price: z.number().min(0, "Valor não pode ser negativo"),
  subtotal: z.number(),
});

const formSchema = z.object({
  orderType: z.enum(["simple", "complete"]),
  customerId: z.string().nullable().optional(),
  customerName: z.string().min(1, "Nome do cliente é obrigatório"),
  customerDocument: z.string().optional(),
  customerEmail: z.string().email("E-mail inválido").optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  customerCep: z.string().optional(),
  customerLogradouro: z.string().optional(),
  customerNumero: z.string().optional(),
  customerComplemento: z.string().optional(),
  customerBairro: z.string().optional(),
  customerCity: z.string().optional(),
  customerState: z.string().optional(),
  description: z.string().min(1, "Descrição do serviço é obrigatória"),
  notes: z.string().optional(),
  discount: z.number().default(0),
  taxRate: z.number().min(0).max(100).default(0),
  items: z.array(itemSchema).default([]),
});

type FormData = z.infer<typeof formSchema>;

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
  const isMobile = useIsMobile();
  const existingOrder = useMemo(() => orders.find((o) => o.id === id), [orders, id]);

  const [customerOpen, setCustomerOpen] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderType: "complete",
      discount: 0,
      taxRate: 0,
      items: [],
      customerName: "",
      description: "",
    },
  });

  const { watch, setValue, getValues, control, handleSubmit, reset } = form;

  const watchedItems = watch("items");
  const watchedOrderType = watch("orderType");
  const watchedDiscount = watch("discount");
  const watchedTaxRate = watch("taxRate");
  const watchedCustomerId = watch("customerId");

  const persistKey = currentVenue?.id ? `os_form_${currentVenue.id}_${id || "new"}` : null;
  const [skipDataLoad, setSkipDataLoad] = useState(false);

  // Avoid resetting the form multiple times when orders refetch/update.
  // This was causing inputs (ISS/Desconto) to "snap back" while typing.
  const hasInitializedFromDbRef = useRef(false);
  const lastLoadedIdRef = useRef<string | undefined>(undefined);
  
  const { clearDraft, hasUnsavedData } = useFormPersist({
    form,
    key: persistKey || "os_form_temp",
    exclude: [],
    debounceMs: 500,
    showRecoveryToast: !isEditing,
    onRestore: () => {
      // Flag to skip loading from DB when we restored from draft
      if (!isEditing) {
        setSkipDataLoad(true);
      }
    },
  });

  useEffect(() => {
    const loadData = async () => {
      // Skip loading from DB if we restored from draft (for new orders)
      if (skipDataLoad && !isEditing) return;

      // When navigating between OS ids, allow init again
      if (lastLoadedIdRef.current !== id) {
        lastLoadedIdRef.current = id;
        hasInitializedFromDbRef.current = false;
      }
      
      if (existingOrder && id) {
        // Only initialize once per OS id; subsequent data refreshes shouldn't wipe user edits.
        if (hasInitializedFromDbRef.current) return;

        const parseAddress = (address: string | null) => {
          return { logradouro: address || "", numero: "", complemento: "", bairro: "" };
        };

        const parsedAddress = parseAddress(existingOrder.customer_address);

        const orderItems = await getOrderItems(id);
        const formattedItems = orderItems.map((item) => ({
          id: item.id,
          description: item.description,
          service_code: item.service_code || "",
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          subtotal: Number(item.subtotal),
        }));

        reset({
          orderType: existingOrder.order_type as "simple" | "complete",
          customerId: existingOrder.customer_id,
          customerName: existingOrder.customer_name,
          customerDocument: existingOrder.customer_document || "",
          customerEmail: existingOrder.customer_email || "",
          customerPhone: existingOrder.customer_phone || "",
          customerCep: existingOrder.customer_zip_code || "",
          customerLogradouro: parsedAddress.logradouro,
          customerCity: existingOrder.customer_city || "",
          customerState: existingOrder.customer_state || "",
          description: existingOrder.description,
          notes: existingOrder.notes || "",
          discount: Number(existingOrder.discount) || 0,
          // Convert decimal from DB (0.05) to percentage for form (5). Use 0 as default, not 5
          taxRate: existingOrder.tax_rate != null ? Number(existingOrder.tax_rate) * 100 : 0,
          items: formattedItems,
        });

        hasInitializedFromDbRef.current = true;
      }
    };

    loadData();
  }, [existingOrder, id, getOrderItems, reset, skipDataLoad, isEditing]);

  const totals = useMemo(() => {
    const subtotal = watchedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const taxAmount = watchedOrderType === "complete" ? subtotal * (watchedTaxRate / 100) : 0;
    const total = subtotal - (watchedDiscount || 0) + taxAmount;
    return { subtotal, taxAmount, total };
  }, [watchedItems, watchedOrderType, watchedTaxRate, watchedDiscount]);

  const handleCustomerSelect = (customer: (typeof customers)[0]) => {
    setValue("customerId", customer.id, { shouldDirty: true });
    setValue("customerName", customer.name, { shouldDirty: true });
    setValue("customerDocument", customer.document || "", { shouldDirty: true });
    setValue("customerEmail", customer.email || "", { shouldDirty: true });
    setValue("customerPhone", customer.phone || "", { shouldDirty: true });

    if (customer.address) {
      setValue("customerLogradouro", customer.address, { shouldDirty: true });
    }

    setCustomerOpen(false);
  };

  const handleCepChange = async (value: string) => {
    const masked = maskCEP(value);
    setValue("customerCep", masked, { shouldDirty: true });

    const digits = value.replace(/\D/g, "");
    if (digits.length === 8) {
      const data = await lookupCep(digits);
      if (data) {
        setValue("customerLogradouro", data.logradouro || "", { shouldDirty: true });
        setValue("customerBairro", data.bairro || "", { shouldDirty: true });
        setValue("customerCity", data.localidade || "", { shouldDirty: true });
        setValue("customerState", data.uf || "", { shouldDirty: true });
      }
    }
  };

  const handleAddItemFromForm = async (newItem: any) => {
    const currentItems = getValues("items");
    setValue(
      "items",
      [
        ...currentItems,
        {
          ...newItem,
          service_code: newItem.service_code || "",
        },
      ],
      { shouldDirty: true },
    );
    setShowAddItemForm(false);
  };

  const handleRemoveItem = (index: number) => {
    const currentItems = getValues("items");
    setValue(
      "items",
      currentItems.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const currentItems = [...getValues("items")];
    currentItems[index] = {
      ...currentItems[index],
      quantity: qty,
      subtotal: qty * currentItems[index].unit_price,
    };
    setValue("items", currentItems, { shouldDirty: true });
  };

  const handlePriceChange = (index: number, price: number) => {
    const currentItems = [...getValues("items")];
    currentItems[index] = {
      ...currentItems[index],
      unit_price: price,
      subtotal: currentItems[index].quantity * price,
    };
    setValue("items", currentItems, { shouldDirty: true });
  };

  const buildAddress = (data: FormData) => {
    const parts = [];
    if (data.customerLogradouro) {
      let line = data.customerLogradouro;
      if (data.customerNumero) line += `, ${data.customerNumero}`;
      if (data.customerComplemento) line += ` - ${data.customerComplemento}`;
      parts.push(line);
    }
    if (data.customerBairro) parts.push(data.customerBairro);
    return parts.join(" - ") || null;
  };

  const onSubmit = async (data: FormData) => {
    if (!currentVenue) return;

    const customerAddress = buildAddress(data);
    const { subtotal, taxAmount, total } = totals;

    const orderData = {
      venue_id: currentVenue.id,
      order_type: data.orderType,
      customer_id: data.customerId || null,
      customer_name: data.customerName,
      customer_document: data.customerDocument || null,
      customer_email: data.orderType === "complete" ? data.customerEmail || null : null,
      customer_phone: data.customerPhone || null,
      customer_address: customerAddress,
      customer_city: data.customerCity || null,
      customer_state: data.customerState || null,
      customer_zip_code: data.customerCep || null,
      description: data.description,
      notes: data.orderType === "complete" ? data.notes || null : null,
      subtotal,
      discount: data.discount,
      // Convert percentage (5) to decimal (0.05) for DB
      tax_rate: data.orderType === "complete" ? data.taxRate / 100 : null,
      tax_amount: taxAmount,
      total,
      status_simple: data.orderType === "simple" ? ("open" as const) : null,
      status_complete: data.orderType === "complete" ? ("draft" as const) : null,
    };

    try {
      if (isEditing && id) {
        await updateOrder({ id, ...orderData });

        const currentDbItems = await getOrderItems(id);
        const formItemIds = data.items.map((i) => i.id).filter(Boolean);

        for (const dbItem of currentDbItems) {
          if (!formItemIds.includes(dbItem.id)) {
            await removeItem(dbItem.id);
          }
        }

        for (const item of data.items) {
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
        toast({ title: "OS atualizada com sucesso!" });
      } else {
        const newOrder = await createOrder(orderData);
        if (newOrder) {
          for (const item of data.items) {
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
        toast({ title: "OS criada com sucesso!" });
      }

      clearDraft();
      navigate("/ordens-servico");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a OS",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const isFinalized = () => {
    if (!existingOrder) return false;
    const status = existingOrder.order_type === "simple" ? existingOrder.status_simple : existingOrder.status_complete;
    return status === "finished" || status === "invoiced";
  };

  const getCurrentStatus = () => {
    if (!existingOrder) return null;
    return existingOrder.order_type === "simple" ? existingOrder.status_simple : existingOrder.status_complete;
  };

  const handleFinalize = async () => {
    if (!existingOrder || !id) return;
    try {
      const statusKey = existingOrder.order_type === "simple" ? "status_simple" : "status_complete";
      await updateOrder({
        id,
        [statusKey]: "finished",
        finished_at: new Date().toISOString(),
      });
      toast({ title: "OS finalizada com sucesso!" });
      setShowFinalizeDialog(false);
      navigate("/ordens-servico");
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao finalizar", variant: "destructive" });
    }
  };

  const handleGeneratePdf = async () => {
    if (!existingOrder) return;
    setIsGeneratingPdf(true);
    try {
      const orderItems = await getOrderItems(existingOrder.id);
      await generatePdf(existingOrder, orderItems);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <AppLayout>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/ordens-servico")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold">
                {isEditing ? `OS #${existingOrder?.order_number}` : "Nova OS"}
              </h1>
              {isEditing && getCurrentStatus() && (
                <Badge variant={isFinalized() ? "default" : "secondary"}>
                  {getCurrentStatus() === "open" && "Aberta"}
                  {getCurrentStatus() === "draft" && "Rascunho"}
                  {getCurrentStatus() === "finished" && "Finalizada"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {isEditing ? "Atualize os dados da OS" : "Preencha os dados para criar uma nova OS"}
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <>
                <Button type="button" variant="outline" onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                  {isGeneratingPdf ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  PDF
                </Button>
                {!isFinalized() && (
                  <Button type="button" variant="secondary" onClick={() => setShowFinalizeDialog(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Finalizar
                  </Button>
                )}
              </>
            )}
            {!isFinalized() && (
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="py-3 md:py-4">
                <CardTitle className="text-base">Tipo de OS</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Controller
                  control={control}
                  name="orderType"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simples (registro rápido)</SelectItem>
                        <SelectItem value="complete">Completa (para NFS-e)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 md:py-4">
                <CardTitle className="text-base">Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label className="text-sm">Buscar cliente existente</Label>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
                        {watchedCustomerId
                          ? customers.find((c) => c.id === watchedCustomerId)?.name
                          : "Selecionar cliente..."}
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
                              <CommandItem key={customer.id} onSelect={() => handleCustomerSelect(customer)}>
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watchedCustomerId === customer.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div>
                                  <p>{customer.name}</p>
                                  {customer.document && (
                                    <p className="text-xs text-muted-foreground">{customer.document}</p>
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
                    <Label htmlFor="customerName" className="text-sm">
                      Nome *
                    </Label>
                    <Input {...form.register("customerName")} id="customerName" placeholder="Nome do cliente" />
                    {form.formState.errors.customerName && (
                      <span className="text-xs text-red-500">{form.formState.errors.customerName.message}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="customerPhone" className="text-sm">
                      Telefone
                    </Label>
                    <Controller
                      control={control}
                      name="customerPhone"
                      render={({ field }) => (
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(maskPhone(e.target.value))}
                          placeholder="(00) 00000-0000"
                        />
                      )}
                    />
                  </div>
                </div>

                {watchedOrderType === "complete" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="customerDocument" className="text-sm">
                          CPF/CNPJ
                        </Label>
                        <Controller
                          control={control}
                          name="customerDocument"
                          render={({ field }) => (
                            <Input
                              {...field}
                              onChange={(e) => field.onChange(maskCPFCNPJ(e.target.value))}
                              placeholder="000.000.000-00"
                            />
                          )}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="customerEmail" className="text-sm">
                          E-mail
                        </Label>
                        <Input {...form.register("customerEmail")} type="email" placeholder="email@exemplo.com" />
                      </div>
                    </div>

                    <div className="pt-3 border-t space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="customerCep" className="text-sm">
                            CEP
                          </Label>
                          <div className="relative">
                            <Controller
                              control={control}
                              name="customerCep"
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  onChange={(e) => handleCepChange(e.target.value)}
                                  placeholder="00000-000"
                                />
                              )}
                            />
                            {isLoadingCep && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label htmlFor="customerLogradouro" className="text-sm">
                            Logradouro
                          </Label>
                          <Input {...form.register("customerLogradouro")} placeholder="Rua, Avenida..." />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="customerNumero" className="text-sm">
                            Nº
                          </Label>
                          <Input {...form.register("customerNumero")} placeholder="123" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="customerComplemento" className="text-sm">
                            Compl.
                          </Label>
                          <Input {...form.register("customerComplemento")} placeholder="Apto" />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label htmlFor="customerBairro" className="text-sm">
                            Bairro
                          </Label>
                          <Input {...form.register("customerBairro")} placeholder="Bairro" />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3 space-y-1">
                          <Label htmlFor="customerCity" className="text-sm">
                            Cidade
                          </Label>
                          <Input {...form.register("customerCity")} placeholder="Cidade" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="customerState" className="text-sm">
                            UF
                          </Label>
                          <Controller
                            control={control}
                            name="customerState"
                            render={({ field }) => (
                              <Input
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase().slice(0, 2))}
                                maxLength={2}
                                placeholder="RS"
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 md:py-4">
                <CardTitle className="text-base">Serviço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1">
                  <Label htmlFor="description" className="text-sm">
                    Descrição do serviço *
                  </Label>
                  <Textarea
                    {...form.register("description")}
                    placeholder="Descreva o serviço a ser executado"
                    rows={2}
                  />
                  {form.formState.errors.description && (
                    <span className="text-xs text-red-500">{form.formState.errors.description.message}</span>
                  )}
                </div>

                {watchedOrderType === "complete" && (
                  <div className="space-y-1">
                    <Label htmlFor="notes" className="text-sm">
                      Observações
                    </Label>
                    <Textarea {...form.register("notes")} placeholder="Observações adicionais" rows={2} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 md:py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Itens do Serviço</CardTitle>
                {!showAddItemForm && !isFinalized() && (
                  <Button type="button" size="sm" onClick={() => setShowAddItemForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {showAddItemForm && (
                  <ServiceOrderItemForm
                    orderType={watchedOrderType}
                    onAddItem={handleAddItemFromForm}
                    onCancel={() => setShowAddItemForm(false)}
                  />
                )}

                {watchedItems.length > 0 ? (
                  isMobile ? (
                    <div className="space-y-2">
                      {watchedItems.map((item, index) => (
                        <OSItemRow
                          key={index}
                          item={item}
                          index={index}
                          showCode={watchedOrderType === "complete"}
                          readOnly={isFinalized()}
                          onQuantityChange={handleQuantityChange}
                          onPriceChange={handlePriceChange}
                          onRemove={handleRemoveItem}
                          isMobile
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-4 md:mx-0">
                      <div className="min-w-[400px] px-4 md:px-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Descrição</TableHead>
                              {watchedOrderType === "complete" && <TableHead>Código</TableHead>}
                              <TableHead className="text-center">Qtd</TableHead>
                              <TableHead className="text-right">V. Unit.</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                              <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <tbody className="[&_tr:last-child]:border-0">
                            {watchedItems.map((item, index) => (
                              <OSItemRow
                                key={index}
                                item={item}
                                index={index}
                                showCode={watchedOrderType === "complete"}
                                readOnly={isFinalized()}
                                onQuantityChange={handleQuantityChange}
                                onPriceChange={handlePriceChange}
                                onRemove={handleRemoveItem}
                              />
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  )
                ) : (
                  !showAddItemForm && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum item adicionado.</p>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 md:space-y-6">
            <Card className="lg:sticky lg:top-6">
              <CardHeader className="py-3 md:py-4">
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="discount" className="text-sm">
                    Desconto
                  </Label>
                  <Controller
                    control={control}
                    name="discount"
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        disabled={isFinalized()}
                        value={field.value ?? 0}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? 0 : parseFloat(val));
                        }}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </div>

                {watchedOrderType === "complete" && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="taxRate" className="text-sm">
                        ISS (%)
                      </Label>
                      <Controller
                        control={control}
                        name="taxRate"
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            disabled={isFinalized()}
                            value={field.value ?? 0}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? 0 : parseFloat(val));
                            }}
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ISS ({watchedTaxRate || 0}%)</span>
                      <span>{formatCurrency(totals.taxAmount)}</span>
                    </div>
                  </>
                )}

                <div className="border-t pt-3 flex justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-lg font-bold">{formatCurrency(totals.total)}</span>
                </div>

                {!isFinalized() ? (
                  <>
                    <Button type="submit" className="w-full" size="lg">
                      <Save className="h-4 w-4 mr-2" />
                      Salvar OS
                    </Button>

                    {isEditing && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => setShowFinalizeDialog(true)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Finalizar OS
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-2 text-sm text-muted-foreground border rounded-md bg-muted/50">
                    OS finalizada - somente visualização
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Ordem de Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Ao finalizar a OS, ela será contabilizada nos relatórios financeiros. Esta ação marca o serviço como
              concluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize}>Finalizar OS</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
