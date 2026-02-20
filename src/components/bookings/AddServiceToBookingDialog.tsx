import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServices } from '@/hooks/useServices';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Scissors, Loader2, Clock } from 'lucide-react';

interface AddServiceToBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
}

export function AddServiceToBookingDialog({
  open,
  onOpenChange,
  bookingId,
}: AddServiceToBookingDialogProps) {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { services, isLoading: loadingServices } = useServices();
  const { members, isLoading: loadingMembers } = useTeamMembers();

  const [search, setSearch] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('none');
  const [isAdding, setIsAdding] = useState(false);

  const activeServices = (services ?? []).filter((s) => s.is_active);
  const bookableMembers = (members ?? []).filter((m) => m.is_bookable);

  const filteredServices = activeServices.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleAdd = async () => {
    if (!selectedServiceId) return;

    setIsAdding(true);
    try {
      const { error } = await supabase.rpc('add_service_to_booking', {
        p_booking_id: bookingId,
        p_service_id: selectedServiceId,
        p_professional_id: selectedProfessionalId === 'none' ? null : selectedProfessionalId,
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['booking-services', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });

      toast({ title: 'Serviço adicionado com sucesso!' });
      setSelectedServiceId(null);
      setSelectedProfessionalId('none');
      setSearch('');
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar serviço',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const isLoading = loadingServices || loadingMembers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Serviço</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviços..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum serviço encontrado
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {filteredServices.map((service) => {
                const isSelected = selectedServiceId === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedServiceId(isSelected ? null : service.id)}
                    className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:border-primary/40 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Scissors className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{service.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{service.duration_minutes} min</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap ml-2">
                      {formatCurrency(Number(service.price))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {bookableMembers.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t">
            <Label className="text-xs text-muted-foreground">Profissional (opcional)</Label>
            <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar profissional..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem profissional</SelectItem>
                {bookableMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.display_name || m.profile?.full_name || 'Profissional'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={!selectedServiceId || isAdding}>
            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
