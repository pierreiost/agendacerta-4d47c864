import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Scissors } from 'lucide-react';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useServices } from '@/hooks/useServices';
import type { BookableMember } from '@/types/services';

const formSchema = z.object({
  is_bookable: z.boolean(),
  display_name: z.string().optional(),
  bio: z.string().optional(),
  serviceIds: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

interface ProfessionalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: BookableMember | null;
}

export function ProfessionalFormDialog({
  open,
  onOpenChange,
  member,
}: ProfessionalFormDialogProps) {
  const { updateProfessionalBookable } = useProfessionals();
  const { services } = useServices();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_bookable: false,
      display_name: '',
      bio: '',
      serviceIds: [],
    },
  });

  useEffect(() => {
    if (open && member) {
      form.reset({
        is_bookable: member.is_bookable,
        display_name: member.display_name || '',
        bio: member.bio || '',
        serviceIds: member.services?.map((s) => s.id) || [],
      });
    }
  }, [open, member, form]);

  const onSubmit = async (data: FormData) => {
    if (!member) return;

    try {
      await updateProfessionalBookable.mutateAsync({
        memberId: member.id,
        is_bookable: data.is_bookable,
        display_name: data.display_name,
        bio: data.bio,
        serviceIds: data.serviceIds,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isBookable = form.watch('is_bookable');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar Profissional</DialogTitle>
          <DialogDescription>
            Configure se este membro realiza atendimentos e quais serviços oferece
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">
                {member?.display_name || member?.profile?.full_name || 'Membro'}
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                {member?.role}
              </p>
            </div>

            <FormField
              control={form.control}
              name="is_bookable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Realiza Atendimentos
                    </FormLabel>
                    <FormDescription>
                      Habilite para que clientes possam agendar com este profissional
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

            {isBookable && (
              <>
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Comercial (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Dr. Silva, Barbeiro João"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Como o profissional aparecerá para os clientes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio / Especialidades (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Especialista em..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Serviços que Realiza</FormLabel>
                      <FormDescription>
                        Selecione os serviços que este profissional pode atender
                      </FormDescription>
                      
                      {services.length === 0 ? (
                        <div className="flex flex-col items-center py-6 text-center border rounded-lg">
                          <Scissors className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Nenhum serviço cadastrado
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Cadastre serviços na aba "Serviços" primeiro
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[200px] rounded-md border p-4">
                          <div className="space-y-3">
                            {services.map((service) => (
                              <FormField
                                key={service.id}
                                control={form.control}
                                name="serviceIds"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(service.id)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          if (checked) {
                                            field.onChange([...current, service.id]);
                                          } else {
                                            field.onChange(
                                              current.filter((id) => id !== service.id)
                                            );
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-0.5 leading-none">
                                      <FormLabel className="cursor-pointer font-normal">
                                        {service.title}
                                      </FormLabel>
                                      <p className="text-xs text-muted-foreground">
                                        {service.duration_minutes}min • R$ {service.price.toFixed(2)}
                                      </p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateProfessionalBookable.isPending}
              >
                {updateProfessionalBookable.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
