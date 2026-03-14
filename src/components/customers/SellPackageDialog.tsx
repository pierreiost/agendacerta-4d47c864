import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServices } from '@/hooks/useServices';
import { useCustomerPackages } from '@/hooks/useCustomerPackages';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, Package } from 'lucide-react';

interface SellPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}

export function SellPackageDialog({ open, onOpenChange, customerId }: SellPackageDialogProps) {
  const [serviceId, setServiceId] = useState('');
  const [totalSessions, setTotalSessions] = useState(5);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { activeServices } = useServices();
  const { createPackage } = useCustomerPackages(customerId);

  const handleSubmit = () => {
    if (!serviceId || totalSessions < 1) return;
    createPackage.mutate(
      {
        customer_id: customerId,
        service_id: serviceId,
        total_sessions: totalSessions,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setServiceId('');
          setTotalSessions(5);
          setExpiresAt(undefined);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Vender Novo Pacote
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="mb-2 block">Serviço</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {activeServices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Total de Sessões</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={totalSessions}
              onChange={(e) => setTotalSessions(Number(e.target.value))}
            />
          </div>

          <div>
            <Label className="mb-2 block">Validade (opcional)</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {expiresAt ? format(expiresAt, 'dd/MM/yyyy') : 'Sem validade'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={(d) => {
                    setExpiresAt(d);
                    setDatePickerOpen(false);
                  }}
                  locale={ptBR}
                  disabled={(date) => isBefore(date, startOfDay(new Date()))}
                />
              </PopoverContent>
            </Popover>
            {expiresAt && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 text-xs"
                onClick={() => setExpiresAt(undefined)}
              >
                Remover validade
              </Button>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!serviceId || totalSessions < 1 || createPackage.isPending}
            className="w-full"
          >
            {createPackage.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Criando...</>
            ) : (
              'Confirmar Venda'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
