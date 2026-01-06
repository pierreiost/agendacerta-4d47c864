import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVenue } from '@/contexts/VenueContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, ArrowRight } from 'lucide-react';

export default function Onboarding() {
  const { user } = useAuth();
  const { refetchVenues } = useVenue();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);

    try {
      // Create venue
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .insert({
          name,
          address: address || null,
          phone: phone || null,
        })
        .select()
        .single();

      if (venueError) throw venueError;

      // Add user as admin of this venue
      const { error: memberError } = await supabase
        .from('venue_members')
        .insert({
          venue_id: venue.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      toast({
        title: 'Unidade criada!',
        description: 'Sua unidade foi configurada com sucesso.',
      });

      await refetchVenues();
      navigate('/');
    } catch (error: any) {
      console.error('Error creating venue:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a unidade. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Configure sua unidade</CardTitle>
          <CardDescription>
            Crie sua primeira unidade para começar a usar o Agenda Certa
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da unidade *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Quadra Central, Salão de Festas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                type="text"
                placeholder="Rua, número, bairro"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || !name}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Criar e continuar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
