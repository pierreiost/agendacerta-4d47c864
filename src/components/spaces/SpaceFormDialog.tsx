import { useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSpaces, type Space } from '@/hooks/useSpaces';
import type { Tables } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';
import { useFormPersist } from '@/hooks/useFormPersist';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  capacity: z.coerce.number().min(1, 'Mínimo 1 pessoa'),
  price_per_hour: z.coerce.number().min(0, 'Preço não pode ser negativo'),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface SpaceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: Space | null;
  venueId: string;
  categories: Tables<'categories'>[];
}

export function SpaceFormDialog({
  open,
  onOpenChange,
  space,
  venueId,
  categories,
}: SpaceFormDialogProps) {
  const { createSpace, updateSpace } = useSpaces();
  const isEditing = !!space;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category_id: '',
      capacity: 1,
      price_per_hour: 0,
      is_active: true,
    },
  });

  // Form persistence - only for new spaces
  const { clearDraft } = useFormPersist({
    form,
    key: `space_form_${venueId}`,
    showRecoveryToast: !isEditing && open,
  });

  useEffect(() => {
    if (space) {
      clearDraft();
      form.reset({
        name: space.name,
        description: space.description ?? '',
        category_id: space.category_id ?? '',
        capacity: space.capacity ?? 1,
        price_per_hour: Number(space.price_per_hour) ?? 0,
        is_active: space.is_active ?? true,
      });
    } else if (!open) {
      form.reset({
        name: '',
        description: '',
        category_id: '',
        capacity: 1,
        price_per_hour: 0,
        is_active: true,
      });
    }
  }, [space, form, open, clearDraft]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      description: data.description || null,
      category_id: data.category_id || null,
      capacity: data.capacity,
      price_per_hour: data.price_per_hour,
      is_active: data.is_active,
      venue_id: venueId,
    };

    if (isEditing) {
      await updateSpace.mutateAsync({ id: space.id, ...payload });
    } else {
      await createSpace.mutateAsync(payload);
    }

    clearDraft();
    onOpenChange(false);
  };

  const isPending = createSpace.isPending || updateSpace.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Espaço' : 'Novo Espaço'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Quadra 1" {...field} />
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
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição opcional do espaço"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: cat.color ?? '#6366f1' }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_per_hour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço/Hora (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Ativo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Espaço disponível para reservas
                    </p>
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
