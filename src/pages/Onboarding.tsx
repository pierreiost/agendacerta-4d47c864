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
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatCnpjCpf = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ: 00.000.000/0000-00
      return digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18);
    }
  };

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    // (00) 00000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate required fields
    if (!cnpjCpf.replace(/\D/g, '') || cnpjCpf.replace(/\D/g, '').length < 11) {
      toast({
        title: 'CPF/CNPJ obrigatório',
        description: 'Por favor, informe um CPF ou CNPJ válido.',
        variant: 'destructive',
      });
      return;
    }

    if (!whatsapp.replace(/\D/g, '') || whatsapp.replace(/\D/g, '').length < 10) {
      toast({
        title: 'WhatsApp obrigatório',
        description: 'Por favor, informe um número de WhatsApp válido.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    try {
      // Create venue and add user as admin using secure RPC function
      const { data: venue, error: venueError } = await supabase
        .rpc('create_venue_with_admin', {
          _name: name,
          _address: address || null,
          _phone: phone || null,
          _cnpj_cpf: cnpjCpf.replace(/\D/g, ''),
          _whatsapp: whatsapp.replace(/\D/g, ''),
        });

      if (venueError) throw venueError;

      toast({
        title: 'Unidade criada!',
        description: 'Sua unidade foi configurada com sucesso. Você tem 7 dias de teste grátis.',
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

  const isFormValid = name && cnpjCpf.replace(/\D/g, '').length >= 11 && whatsapp.replace(/\D/g, '').length >= 10;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Configure sua unidade</CardTitle>
          <CardDescription>
            Crie sua primeira unidade para começar a usar o Agenda Certa. 
            <span className="block mt-1 text-primary font-medium">7 dias de teste grátis!</span>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj_cpf">CPF/CNPJ *</Label>
                <Input
                  id="cnpj_cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cnpjCpf}
                  onChange={(e) => setCnpjCpf(formatCnpjCpf(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
                  required
                />
              </div>
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
              <Label htmlFor="phone">Telefone fixo</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || !isFormValid}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Criar e iniciar teste grátis
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
