import { 
  CalendarDays, 
  Users, 
  BarChart3, 
  FileText, 
  Globe, 
  Bell, 
  Shield, 
  Smartphone 
} from 'lucide-react';

const features = [
  {
    icon: CalendarDays,
    title: 'Agenda Inteligente',
    description: 'Visualize reservas por dia, semana ou mês. Arraste e solte para reagendar.',
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Cadastro completo com histórico de reservas, pagamentos e preferências.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard em Tempo Real',
    description: 'Métricas de ocupação, faturamento e tendências no painel principal.',
  },
  {
    icon: FileText,
    title: 'Ordens de Serviço',
    description: 'Crie OS profissionais com itens, valores e gere PDF automaticamente.',
  },
  {
    icon: Globe,
    title: 'Página Pública',
    description: 'Link exclusivo para clientes agendarem online 24 horas por dia.',
  },
  {
    icon: Bell,
    title: 'Notificações',
    description: 'Lembretes automáticos por WhatsApp e e-mail para você e seus clientes.',
  },
  {
    icon: Shield,
    title: 'Seguro & Confiável',
    description: 'Dados criptografados, backups automáticos e 99.9% de uptime.',
  },
  {
    icon: Smartphone,
    title: '100% Responsivo',
    description: 'Acesse de qualquer dispositivo. Funciona perfeitamente no celular.',
  },
];

export function LandingFeatures() {
  return (
    <section id="funcionalidades" className="py-20 md:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Funcionalidades
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas poderosas e fáceis de usar para automatizar sua operação 
            e aumentar sua produtividade.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors duration-300"
            >
              {/* Icon */}
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-5 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <feature.icon className="h-7 w-7" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
