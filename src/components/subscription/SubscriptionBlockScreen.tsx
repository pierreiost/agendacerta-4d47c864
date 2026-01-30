import { AlertTriangle, MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVenue } from '@/contexts/VenueContext';

interface SubscriptionBlockScreenProps {
  supportWhatsapp?: string;
}

export function SubscriptionBlockScreen({ supportWhatsapp = '5551999999999' }: SubscriptionBlockScreenProps) {
  const { venues, setCurrentVenue } = useVenue();
  
  // Filter venues that are NOT blocked (active or trialing with valid dates)
  const availableVenues = venues.filter(v => {
    if (v.status === 'active') return true;
    if (v.status === 'trialing' && v.trial_ends_at) {
      return new Date(v.trial_ends_at) > new Date();
    }
    return false;
  });

  const handleContactSupport = () => {
    const message = encodeURIComponent('Olá! Preciso regularizar minha assinatura do Agenda Certa.');
    window.open(`https://wa.me/${supportWhatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleSwitchVenue = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId);
    if (venue) {
      setCurrentVenue(venue);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl border-destructive/20">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            Acesso Bloqueado
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Sua assinatura expirou. Regularize seu débito para continuar utilizando o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p>
              Entre em contato com nosso suporte para regularizar sua situação e reativar seu acesso imediatamente.
            </p>
          </div>
          <Button 
            onClick={handleContactSupport} 
            className="w-full gap-2 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <MessageCircle className="h-5 w-5" />
            Falar com Suporte via WhatsApp
          </Button>
          
          {/* Switch Venue Button - only show if user has other accessible venues */}
          {availableVenues.length > 0 && (
            <div className="pt-4 border-t space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Você tem outras unidades disponíveis:
              </p>
              <div className="space-y-2">
                {availableVenues.map((venue) => (
                  <Button
                    key={venue.id}
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => handleSwitchVenue(venue.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Acessar {venue.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
