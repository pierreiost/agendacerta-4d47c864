import { Calendar, Scissors, Wrench, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const segments = [
  {
    icon: Calendar,
    title: 'Quadras Esportivas',
    description: 'Beach tennis, futevôlei, society. Gerencie locações por hora com agenda visual e controle de horários.',
    features: ['Reservas por hora', 'Agenda visual', 'Controle de pagamentos'],
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
  },
  {
    icon: Scissors,
    title: 'Salões & Clínicas',
    description: 'Beleza e saúde. Agendamento de serviços por profissional com slots inteligentes.',
    features: ['Multi-profissionais', 'Serviços personalizados', 'Histórico do cliente'],
    color: 'bg-pink-500',
    lightColor: 'bg-pink-50',
  },
  {
    icon: Wrench,
    title: 'Assistência Técnica',
    description: 'HVAC, TI, manutenção. Ordens de serviço completas com controle de peças e mão de obra.',
    features: ['Ordens de serviço', 'Controle de peças', 'PDF profissional'],
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
  },
  {
    icon: Building2,
    title: 'Espaços em Geral',
    description: 'Salões de festa, coworkings, estúdios. Flexível para qualquer tipo de locação.',
    features: ['Configuração flexível', 'Multi-espaços', 'Relatórios completos'],
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
  },
];

export function LandingSegments() {
  return (
    <section id="segmentos" className="py-20 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Segmentos
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Feito para o seu tipo de negócio
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            O AgendaCerta se adapta ao seu segmento, oferecendo as ferramentas certas 
            para cada tipo de operação.
          </p>
        </div>

        {/* Segments Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {segments.map((segment) => (
            <div
              key={segment.title}
              className="group bg-background rounded-2xl p-6 shadow-sm border border-border hover:shadow-lg hover:border-primary/20 transition-all duration-300 flex flex-col h-full"
            >
              {/* Icon */}
              <div className={cn(
                "h-14 w-14 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 flex-shrink-0",
                segment.lightColor
              )}>
                <segment.icon className={cn("h-7 w-7", segment.color.replace('bg-', 'text-'))} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-foreground mb-3">
                {segment.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-4 flex-grow">
                {segment.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mt-auto">
                {segment.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", segment.color)} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
