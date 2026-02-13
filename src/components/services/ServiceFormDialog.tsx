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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import { useFormPersist } from '@/hooks/useFormPersist';
import { useVenue } from '@/contexts/VenueContext';
import { ServiceCoverUpload } from './ServiceCoverUpload';
import type { Service } from '@/types/services';

const formSchema = z.object({
  title: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço deve ser positivo'),
  duration_minutes: z.coerce.number().min(5, 'Duração mínima de 5 minutos').max(480, 'Duração máxima de 8 horas'),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

export function ServiceFormDialog({ open, onOpenChange, service }: ServiceFormDialogProps) {
  const { currentVenue } = useVenue();
  const { createService, updateService } = useServices();
  const isEditing = !!service;
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      duration_minutes: 30,
      is_active: true,
    },
  });

  const { clearDraft } = useFormPersist({
    form,
    key: `service_form_${currentVenue?.id || 'default'}`,
    debounceMs: 500,
    showRecoveryToast: !isEditing,
  });

  useEffect(() => {
    if (open) {
      if (service) {
        form.reset({
          title: service.title,
          description: service.description || '',
          price: service.price,
          duration_minutes: service.duration_minutes,
          is_active: service.is_active,
        });
        setCoverImageUrl(service.cover_image_url || null);
      } else {
        const currentValues = form.getValues();
        if (!currentValues.title) {
          form.reset({
            title: '',
            description: '',
            price: 0,
            duration_minutes: 30,
            is_active: true,
          });
        }
        setCoverImageUrl(null);
      }
    }
  }, [open, service, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && service) {
        await updateService.mutateAsync({ id: service.id, ...data, cover_image_url: coverImageUrl });
      } else {
        await createService.mutateAsync({
          title: data.title,
          description: data.description || null,
          price: data.price,
          duration_minutes: data.duration_minutes,
          is_active: data.is_active,
          cover_image_url: coverImageUrl,
        });
      }
      clearDraft();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createService.isPending || updateService.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Serviço</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Corte de Cabelo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o serviço..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="5"
                        max="480"
                        step="5"
                        placeholder="30"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Tempo de bloqueio na agenda
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cover image upload */}
            {currentVenue?.id && (
              <ServiceCoverUpload
                venueId={currentVenue.id}
                value={coverImageUrl}
                onChange={setCoverImageUrl}
              />
            )}

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo</FormLabel>
                    <FormDescription className="text-xs">
                      Serviço disponível para agendamento
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
