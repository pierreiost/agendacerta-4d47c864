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
import { Loader2 } from 'lucide-react';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(20, 'Telefone muito longo').optional().or(z.literal('')),
  document: z.string().max(20, 'Documento muito longo').optional().or(z.literal('')),
  address: z.string().max(200, 'Endereço muito longo').optional().or(z.literal('')),
  notes: z.string().max(500, 'Observações muito longas').optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const { createCustomer, updateCustomer, customers } = useCustomers();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!customer;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      document: '',
      address: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        document: customer.document ?? '',
        address: customer.address ?? '',
        notes: customer.notes ?? '',
      });
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        document: '',
        address: '',
        notes: '',
      });
    }
  }, [customer, form, open]);

  const checkDuplicates = (data: FormData): string | null => {
    const otherCustomers = customers?.filter(c => c.id !== customer?.id) || [];
    
    // Check duplicate name (case insensitive)
    const duplicateName = otherCustomers.find(
      c => c.name.toLowerCase().trim() === data.name.toLowerCase().trim()
    );
    if (duplicateName) {
      return `Já existe um cliente com o nome "${data.name}"`;
    }

    // Check duplicate document (CPF/CNPJ) if provided
    if (data.document && data.document.trim()) {
      const normalizedDoc = data.document.replace(/\D/g, '');
      const duplicateDoc = otherCustomers.find(
        c => c.document && c.document.replace(/\D/g, '') === normalizedDoc
      );
      if (duplicateDoc) {
        return `Já existe um cliente com o CPF/CNPJ "${data.document}"`;
      }
    }

    // Check duplicate email if provided
    if (data.email && data.email.trim()) {
      const duplicateEmail = otherCustomers.find(
        c => c.email && c.email.toLowerCase().trim() === data.email!.toLowerCase().trim()
      );
      if (duplicateEmail) {
        return `Já existe um cliente com o email "${data.email}"`;
      }
    }

    // Check duplicate phone if provided
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
    // Check for duplicates
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
      const payload = {
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        document: data.document?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
      };

      if (isEditing) {
        await updateCustomer.mutateAsync({ id: customer.id, ...payload });
      } else {
        await createCustomer.mutateAsync(payload);
      }

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = isSubmitting || createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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

            <div className="grid grid-cols-2 gap-4">
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
                      <Input placeholder="(11) 99999-9999" {...field} />
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
                    <Input placeholder="000.000.000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua, número, bairro, cidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas sobre o cliente..."
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
