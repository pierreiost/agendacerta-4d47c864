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
import { Building2, Loader2, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import logo from '@/assets/logo.svg';

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

  const trialBenefits = [
    'Agenda online ilimitada',
    'Gestão de clientes',
    'Dashboard em tempo real',
    'Sem compromisso',
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        
        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <div className="bg-white rounded-2xl p-4 shadow-xl mb-8 inline-block">
            <img src={logo} alt="AgendaCerta" className="w-16 h-16 object-contain" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            Falta pouco para transformar sua gestão!
          </h1>
          
          <p className="text-white/80 text-lg mb-8">
            Configure sua primeira unidade e comece a usar o AgendaCerta agora mesmo.
          </p>

          {/* Benefits List */}
          <div className="space-y-4">
            {trialBenefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 text-white">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-lg shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-4">
              <div className="bg-primary rounded-xl p-3">
                <img src={logo} alt="AgendaCerta" className="w-10 h-10 object-contain" />
              </div>
            </div>

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Configure sua unidade</CardTitle>
            <CardDescription className="text-base">
              Preencha os dados básicos para começar
            </CardDescription>
            
            {/* Trial Badge */}
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-4 py-2 mt-4 mx-auto">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">7 dias de teste grátis!</span>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da unidade *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: Quadra Central, Salão Beauty"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj_cpf">CPF/CNPJ *</Label>
                  <Input
                    id="cnpj_cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cnpjCpf}
                    onChange={(e) => setCnpjCpf(formatCnpjCpf(e.target.value))}
                    required
                    className="h-11"
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
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço (opcional)</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Rua, número, bairro"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone fixo (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11"
                />
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full h-12 text-base gradient-primary hover:opacity-90" 
                disabled={loading || !isFormValid}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-5 w-5" />
                )}
                Criar e iniciar teste grátis
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Ao criar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
