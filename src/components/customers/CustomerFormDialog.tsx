import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useToast } from '@/hooks/use-toast';
import { maskCPFCNPJ, maskPhone, isValidCPFCNPJ, maskCEP } from '@/lib/masks';
import { useFormPersist } from '@/hooks/useFormPersist';
import { useCepLookup } from '@/hooks/useCepLookup';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(20, 'Telefone muito longo').optional().or(z.literal('')),
  document: z.string()
    .max(20, 'Documento muito longo')
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      const digits = val.replace(/\D/g, '');
      if (digits.length === 0) return true;
      if (digits.length !== 11 && digits.length !== 14) return false;
      return isValidCPFCNPJ(val);
    }, { message: 'CPF/CNPJ inválido' }),
  cep: z.string().max(10, 'CEP muito longo').optional().or(z.literal('')),
  logradouro: z.string().max(200, 'Logradouro muito longo').optional().or(z.literal('')),
  numero: z.string().max(20, 'Número muito longo').optional().or(z.literal('')),
  complemento: z.string().max(100, 'Complemento muito longo').optional().or(z.literal('')),
  bairro: z.string().max(100, 'Bairro muito longo').optional().or(z.literal('')),
  cidade: z.string().max(100, 'Cidade muito longa').optional().or(z.literal('')),
  estado: z.string().max(2, 'UF inválida').optional().or(z.literal('')),
  notes: z.string().max(500, 'Observações muito longas').optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

// Parse existing address string into components
function parseAddress(address: string | null): {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
} {
  if (!address) {
    return { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' };
  }
  // Try to parse "Logradouro, Numero, Complemento - Bairro - Cidade/UF" format
  // This is a best-effort parsing for legacy data
  return {
    logradouro: address,
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  };
}

// Build address string from components
function buildAddress(data: FormData): string | null {
  const parts = [];
  
  if (data.logradouro) {
    let addressLine = data.logradouro;
    if (data.numero) addressLine += `, ${data.numero}`;
    if (data.complemento) addressLine += ` - ${data.complemento}`;
    parts.push(addressLine);
  }
  
  if (data.bairro) parts.push(data.bairro);
  
  if (data.cidade) {
    let cityLine = data.cidade;
    if (data.estado) cityLine += `/${data.estado}`;
    parts.push(cityLine);
  }
  
  if (data.cep) parts.push(`CEP: ${data.cep}`);
  
  return parts.length > 0 ? parts.join(' - ') : null;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const { createCustomer, updateCustomer, customers } = useCustomers();
  const { toast } = useToast();
  const { lookupCep, isLoading: isLoadingCep } = useCepLookup();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!customer;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      document: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      notes: '',
    },
  });

  // Form persistence - only for new customers
  const { clearDraft } = useFormPersist({
    form,
    key: 'customer_form',
    showRecoveryToast: !isEditing && open,
  });

  useEffect(() => {
    if (customer) {
      clearDraft();
      const parsed = parseAddress(customer.address);
      form.reset({
        name: customer.name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        document: customer.document ?? '',
        cep: '',
        logradouro: parsed.logradouro,
        numero: parsed.numero,
        complemento: parsed.complemento,
        bairro: parsed.bairro,
        cidade: parsed.cidade,
        estado: parsed.estado,
        notes: customer.notes ?? '',
      });
    } else if (!open) {
      form.reset({
        name: '',
        email: '',
        phone: '',
        document: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        notes: '',
      });
    }
  }, [customer, form, open, clearDraft]);

  // Auto-lookup CEP when 8 digits are entered
  const handleCepChange = async (value: string) => {
    const maskedValue = maskCEP(value);
    form.setValue('cep', maskedValue);
    
    const digits = value.replace(/\D/g, '');
    if (digits.length === 8) {
      const data = await lookupCep(digits);
      if (data) {
        form.setValue('logradouro', data.logradouro || '');
        form.setValue('bairro', data.bairro || '');
        form.setValue('cidade', data.localidade || '');
        form.setValue('estado', data.uf || '');
        // Focus on numero field after auto-fill
        setTimeout(() => {
          const numeroInput = document.getElementById('numero');
          if (numeroInput) numeroInput.focus();
        }, 100);
      }
    }
  };

  const checkDuplicates = (data: FormData): string | null => {
    const otherCustomers = customers?.filter(c => c.id !== customer?.id) || [];
    
    const duplicateName = otherCustomers.find(
      c => c.name.toLowerCase().trim() === data.name.toLowerCase().trim()
    );
    if (duplicateName) {
      return `Já existe um cliente com o nome "${data.name}"`;
    }

    if (data.document && data.document.trim()) {
      const normalizedDoc = data.document.replace(/\D/g, '');
      const duplicateDoc = otherCustomers.find(
        c => c.document && c.document.replace(/\D/g, '') === normalizedDoc
      );
      if (duplicateDoc) {
        return `Já existe um cliente com o CPF/CNPJ "${data.document}"`;
      }
    }

    if (data.email && data.email.trim()) {
      const duplicateEmail = otherCustomers.find(
        c => c.email && c.email.toLowerCase().trim() === data.email!.toLowerCase().trim()
      );
      if (duplicateEmail) {
        return `Já existe um cliente com o email "${data.email}"`;
      }
    }

    if (data.phone && data.phone.trim()) {
      const normalizedPhone = data.phone.replace(/\D/g, '');
      const duplicatePhone = otherCustomers.find(
        c => c.phone && c.phone.replace(/\D/g, '') === normalizedPhone
      );
      if (duplicatePhone) {
        return `Já existe um cliente com o telefone "${data.phone}"`;
      }
    }

    return null;
  };

  const onSubmit = async (data: FormData) => {
    const duplicateError = checkDuplicates(data);
    if (duplicateError) {
      toast({
        title: 'Cliente duplicado',
        description: duplicateError,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const address = buildAddress(data);
      const payload = {
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        document: data.document?.trim() || null,
        address,
        notes: data.notes?.trim() || null,
      };

      if (isEditing) {
        await updateCustomer.mutateAsync({ id: customer.id, ...payload });
      } else {
        await createCustomer.mutateAsync(payload);
      }

      clearDraft();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = isSubmitting || createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(11) 99999-9999"
                        {...field}
                        onChange={(e) => field.onChange(maskPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="document"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF/CNPJ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000.000.000-00"
                      {...field}
                      onChange={(e) => field.onChange(maskCPFCNPJ(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Section with CEP Auto-fill */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Endereço</p>
              
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="00000-000"
                            {...field}
                            onChange={(e) => handleCepChange(e.target.value)}
                          />
                          {isLoadingCep && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="logradouro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua, Avenida..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-3">
                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input id="numero" placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Apto, Bloco..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-3">
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="RS"
                          maxLength={2}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas sobre o cliente..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar Cliente'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
