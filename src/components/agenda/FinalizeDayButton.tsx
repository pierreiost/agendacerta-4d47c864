import { useState, useMemo, useCallback } from 'react';
import { startOfDay, endOfDay, isSameDay } from 'date-fns';
import { CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { Booking } from '@/hooks/useBookings';

interface FinalizeDayButtonProps {
  bookings: Booking[];
  currentDate: Date;
}

export function FinalizeDayButton({ bookings, currentDate }: FinalizeDayButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const confirmedToday = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.status === 'CONFIRMED' &&
        isSameDay(new Date(b.start_time), currentDate)
    );
  }, [bookings, currentDate]);

  const totalValue = useMemo(() => {
    return confirmedToday.reduce(
      (sum, b) => sum + (b.grand_total || b.space_total || 0),
      0
    );
  }, [confirmedToday]);

  const handleFinalize = useCallback(async () => {
    if (confirmedToday.length === 0) return;
    setIsFinalizing(true);

    try {
      // 1. Insert payments for each booking
      const payments = confirmedToday.map((b) => ({
        booking_id: b.id,
        method: 'CASH' as const,
        amount: b.grand_total || b.space_total || 0,
      }));

      const { error: payError } = await supabase
        .from('payments')
        .insert(payments);

      if (payError) throw payError;

      // 2. Update all bookings to FINALIZED
      const ids = confirmedToday.map((b) => b.id);
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'FINALIZED' })
        .in('id', ids);

      if (updateError) throw updateError;

      // 3. Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });

      toast({
        title: 'Dia finalizado!',
        description: `${confirmedToday.length} atendimento(s) finalizado(s) com sucesso.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao finalizar',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsFinalizing(false);
      setIsOpen(false);
    }
  }, [confirmedToday, queryClient, toast]);

  if (confirmedToday.length === 0) return null;

  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(totalValue);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-16 md:bottom-20 right-3 md:right-4 z-40 rounded-full shadow-lg h-12 md:h-auto md:rounded-md gap-2"
          disabled={isFinalizing}
        >
          {isFinalizing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCheck className="h-5 w-5" />
          )}
          <span className="hidden md:inline">Finalizar Dia</span>
          <span className="md:hidden sr-only">Finalizar Dia</span>
          <span className="flex items-center justify-center bg-primary-foreground text-primary rounded-full h-5 min-w-5 px-1 text-xs font-bold">
            {confirmedToday.length}
          </span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finalizar dia?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Serão finalizados <strong>{confirmedToday.length}</strong> atendimento(s)
              com pagamento em <strong>Dinheiro</strong>.
            </span>
            <span className="block text-lg font-semibold text-foreground">
              Total: {formattedTotal}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isFinalizing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleFinalize} disabled={isFinalizing}>
            {isFinalizing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
