import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Loader2, MessageCircle, Phone, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { maskPhone } from '@/lib/masks';
import { useClientBookings } from '@/hooks/useClientBookings';

function statusConfig(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return { label: 'Confirmado', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'PENDING':
      return { label: 'Pendente', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'FINALIZED':
      return { label: 'Finalizado', className: 'bg-blue-100 text-blue-800 border-blue-200' };
    default:
      return { label: status, className: 'bg-muted text-muted-foreground' };
  }
}

export default function MinhasReservas() {
  const { phone, setPhone, bookings, isLoading, search, hasSearched } = useClientBookings();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search();
  };

  const buildWhatsAppUrl = (booking: typeof bookings[0]) => {
    if (!booking.venue_whatsapp) return null;
    const cleanPhone = booking.venue_whatsapp.replace(/\D/g, '');
    const dateStr = format(new Date(booking.start_time), "dd/MM", { locale: ptBR });
    const timeStr = format(new Date(booking.start_time), "HH:mm");
    const msg = encodeURIComponent(
      `Olá! Sou ${booking.customer_name}, fiz um agendamento para dia ${dateStr} às ${timeStr} e gostaria de solicitar o cancelamento.`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4">
        <div className="max-w-lg mx-auto text-center space-y-2">
          <CalendarDays className="h-10 w-10 mx-auto opacity-90" />
          <h1 className="text-2xl font-bold">Minhas Reservas</h1>
          <p className="text-sm opacity-80">Consulte seus agendamentos informando seu telefone</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Search form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={handlePhoneChange}
              className="pl-10 h-12 text-base"
              maxLength={15}
              inputMode="tel"
            />
          </div>
          <Button type="submit" className="w-full h-11 gap-2" disabled={phone.replace(/\D/g, '').length < 8 || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar Agendamentos
          </Button>
        </form>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {hasSearched && !isLoading && bookings.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum agendamento encontrado para este número.</p>
          </div>
        )}

        {/* Results */}
        {bookings.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{bookings.length} agendamento{bookings.length > 1 ? 's' : ''} encontrado{bookings.length > 1 ? 's' : ''}</p>
            {bookings.map((b) => {
              const st = statusConfig(b.status);
              const whatsappUrl = buildWhatsAppUrl(b);
              const isFuture = new Date(b.start_time) > new Date();

              return (
                <Card key={b.booking_id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Date + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-base">
                          {format(new Date(b.start_time), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(b.start_time), 'HH:mm')} - {format(new Date(b.end_time), 'HH:mm')}
                        </p>
                      </div>
                      <Badge className={st.className}>{st.label}</Badge>
                    </div>

                    {/* Service + Professional */}
                    {(b.service_title || b.professional_name) && (
                      <div className="space-y-1 text-sm">
                        {b.service_title && <p className="font-medium">{b.service_title}</p>}
                        {b.professional_name && (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <User className="h-3.5 w-3.5" /> {b.professional_name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Venue + Value */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{b.venue_name}</span>
                      {b.grand_total != null && b.grand_total > 0 && (
                        <span className="font-semibold">
                          R$ {b.grand_total.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>

                    {/* Cancel action */}
                    {isFuture && (
                      <div className="pt-1">
                        {whatsappUrl ? (
                          <Button
                            asChild
                            variant="outline"
                            className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="h-4 w-4" />
                              Solicitar Cancelamento
                            </a>
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center">
                            Para cancelar, ligue para o estabelecimento.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
