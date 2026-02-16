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
import { Building2, Loader2, ArrowRight, CheckCircle2, Sparkles, Calendar, Scissors, Wrench, HelpCircle, Heart } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.svg';

type VenueSegment = 'sports' | 'beauty' | 'health' | 'custom';

const segments = [
  {
    id: 'sports' as VenueSegment,
    icon: Calendar,
    title: 'Quadras & Espaços',
    shortDesc: 'Aluguel por hora',
    features: [
      'Agenda visual por espaço/quadra',
      'Reservas por hora com preço fixo',
      'Controle de ocupação e horários',
      'Reservas recorrentes (semanais)',
      'Dashboard focado em ocupação',
    ],
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
  },
  {
    id: 'beauty' as VenueSegment,
    icon: Scissors,
    title: 'Salões & Barbearias',
    shortDesc: 'Serviços por profissional',
    features: [
      'Agenda por profissional',
      'Catálogo de serviços com duração',
      'Múltiplos serviços por agendamento',
      'Histórico completo do cliente',
      'Dashboard focado em ticket médio',
    ],
    color: 'bg-pink-500',
    lightColor: 'bg-pink-50',
    borderColor: 'border-pink-500',
  },
  {
    id: 'health' as VenueSegment,
    icon: Heart,
    title: 'Clínicas & Saúde',
    shortDesc: 'Consultas e procedimentos',
    features: [
      'Agenda por profissional',
      'Prontuário simplificado',
      'Controle de retornos',
      'Histórico do paciente',
      'Dashboard focado em atendimentos',
    ],
    color: 'bg-teal-500',
    lightColor: 'bg-teal-50',
    borderColor: 'border-teal-500',
  },
  {
    id: 'custom' as VenueSegment,
    icon: Wrench,
    title: 'Assistência Técnica',
    shortDesc: 'Ordens de serviço',
    features: [
      'Ordens de serviço completas',
      'Controle de peças e mão de obra',
      'Geração de PDF profissional',
      'Fluxo de status (aberto → faturado)',
      'Dashboard focado em OS e faturamento',
    ],
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    borderColor: 'border-orange-500',
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const { refetchVenues } = useVenue();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [segment, setSegment] = useState<VenueSegment | null>(null);
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
    
    if (!segment) {
      toast({
        title: 'Segmento obrigatório',
        description: 'Por favor, selecione o tipo do seu negócio.',
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
          _phone: null,
          _cnpj_cpf: cnpjCpf.replace(/\D/g, ''),
          _whatsapp: whatsapp.replace(/\D/g, ''),
        });

      if (venueError) throw venueError;

      // Update venue with segment
      if (venue) {
        const { error: updateError } = await supabase
          .from('venues')
          .update({ segment })
          .eq('id', venue.id);
        
        if (updateError) {
          console.error('Error updating segment:', updateError);
        }
      }

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

  const isFormValid = name && cnpjCpf.replace(/\D/g, '').length >= 11 && whatsapp.replace(/\D/g, '').length >= 10 && segment;

  const trialBenefits = [
    'Agenda online ilimitada',
    'Gestão de clientes',
    'Dashboard em tempo real',
    'Sem compromisso',
  ];

  const selectedSegmentData = segments.find(s => s.id === segment);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        
        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <div className="mb-8 inline-block">
            <img src={logo} alt="AgendaCerta" className="h-auto block" style={{ width: '30rem' }} />
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
              <img src={logo} alt="AgendaCerta" className="w-24 h-auto object-contain" />
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
            <CardContent className="space-y-5">
              {/* Segment Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Tipo do negócio *</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-sm">O segmento define quais funcionalidades e layout do sistema serão otimizados para o seu tipo de negócio.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {segments.map((seg) => (
                    <TooltipProvider key={seg.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setSegment(seg.id)}
                            className={cn(
                              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                              segment === seg.id
                                ? `${seg.borderColor} ${seg.lightColor} shadow-md`
                                : "border-border bg-background hover:border-muted-foreground/30"
                            )}
                          >
                            <div className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center transition-transform",
                              segment === seg.id ? seg.color : seg.lightColor
                            )}>
                              <seg.icon className={cn(
                                "h-5 w-5",
                                segment === seg.id ? "text-white" : seg.color.replace('bg-', 'text-')
                              )} />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-sm">{seg.title}</p>
                              <p className="text-xs text-muted-foreground">{seg.shortDesc}</p>
                            </div>
                            {segment === seg.id && (
                              <div className={cn("absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center", seg.color)}>
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px] p-3">
                          <p className="font-medium mb-2">{seg.title}</p>
                          <ul className="space-y-1">
                            {seg.features.map((feature, idx) => (
                              <li key={idx} className="text-xs flex items-start gap-1.5">
                                <CheckCircle2 className={cn("h-3 w-3 mt-0.5 flex-shrink-0", seg.color.replace('bg-', 'text-'))} />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>

                {/* Selected segment features preview */}
                {selectedSegmentData && (
                  <div className={cn("p-3 rounded-lg border", selectedSegmentData.lightColor, selectedSegmentData.borderColor.replace('border-', 'border-'))}>
                    <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                      <selectedSegmentData.icon className={cn("h-3.5 w-3.5", selectedSegmentData.color.replace('bg-', 'text-'))} />
                      Funcionalidades do {selectedSegmentData.title}:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {selectedSegmentData.features.slice(0, 4).map((feature, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {feature}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
