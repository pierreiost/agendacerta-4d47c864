import { 
  ShieldCheck, 
  Clock, 
  Users, 
  Package, 
  BarChart3, 
  RefreshCw,
  CalendarCheck,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Reduza Conflitos',
    description: 'Elimine overbooking e conflitos de horário com validação automática em tempo real.',
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
  },
  {
    icon: Package,
    title: 'Controle de Estoque',
    description: 'Gerencie peças, produtos e materiais com controle de entrada e saída vinculado às OS.',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
  },
  {
    icon: BarChart3,
    title: 'Controle de Ganhos',
    description: 'Dashboard financeiro em tempo real com faturamento por período, serviço ou profissional.',
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
  },
  {
    icon: FileText,
    title: 'Ordens de Serviço',
    description: 'Crie OS completas com peças, mão de obra, desconto e gere PDF profissional automaticamente.',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Histórico completo de cada cliente, incluindo agendamentos, compras e serviços realizados.',
    color: 'bg-pink-500',
    lightColor: 'bg-pink-50',
  },
  {
    icon: CalendarCheck,
    title: 'Reservas Permanentes',
    description: 'Configure reservas semanais fixas para clientes recorrentes com poucos cliques.',
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
  },
  {
    icon: RefreshCw,
    title: 'Serviços Recorrentes',
    description: 'Agende manutenções periódicas e acompanhe serviços que possuem recorrência automática.',
    color: 'bg-teal-500',
    lightColor: 'bg-teal-50',
  },
  {
    icon: Clock,
    title: 'Economia de Tempo',
    description: 'Automatize processos manuais e libere horas do seu dia para focar no crescimento.',
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
  },
];

export function LandingBenefits() {
  return (
    <section id="beneficios" className="py-20 md:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Benefícios
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas completas para organizar, controlar e fazer seu negócio crescer.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className={cn(
                "group relative bg-background rounded-2xl p-6 border border-border",
                "hover:shadow-lg hover:border-primary/20 transition-all duration-300",
                "flex flex-col"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                benefit.lightColor
              )}>
                <benefit.icon className={cn("h-6 w-6", benefit.color.replace('bg-', 'text-'))} />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
