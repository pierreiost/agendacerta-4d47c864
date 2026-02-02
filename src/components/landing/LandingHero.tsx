import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Play } from 'lucide-react';

interface LandingHeroProps {
  onCTA: () => void;
}

export function LandingHero({ onCTA }: LandingHeroProps) {
  const benefits = [
    'Agenda online 24/7',
    'Gestão de clientes',
    'Relatórios automáticos',
    '7 dias grátis',
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 gradient-primary" />
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/3 right-10 w-32 h-32 bg-white/10 rounded-full animate-pulse" />
      <div className="absolute bottom-1/3 left-20 w-20 h-20 bg-white/10 rounded-full animate-pulse delay-700" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              <span className="text-white/90 text-sm font-medium">
                +500 empresas já usam
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Transforme sua gestão em{' '}
              <span className="text-yellow-300">resultados reais</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl mx-auto lg:mx-0">
              Sistema completo de agendamento, gestão de clientes e controle financeiro. 
              Perfeito para quadras, salões, clínicas e assistência técnica.
            </p>

            {/* Benefits List */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-8">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-white/90">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span className="text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                onClick={onCTA}
                className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                Começar Teste Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-full"
                onClick={() => document.getElementById('funcionalidades')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="mr-2 h-5 w-5" />
                Ver Como Funciona
              </Button>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="hidden lg:block relative">
            <div className="relative">
              {/* Mock Dashboard Card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white/60 text-sm">Reservas Hoje</p>
                    <p className="text-3xl font-bold text-white">24</p>
                  </div>
                  <div className="h-12 w-12 bg-green-400/20 rounded-xl flex items-center justify-center">
                    <span className="text-green-400 text-xl">📊</span>
                  </div>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-green-400 rounded-full" />
                </div>
                <p className="text-white/60 text-xs mt-2">75% de ocupação</p>
              </div>

              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-xl animate-bounce-slow">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary">💰</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Receita do Mês</p>
                    <p className="font-bold text-foreground">R$ 12.450</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-xl animate-bounce-slow delay-300">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600">✓</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nova Reserva</p>
                    <p className="font-bold text-foreground">João Silva</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-1">
          <div className="w-1 h-3 bg-white/60 rounded-full animate-scroll" />
        </div>
      </div>
    </section>
  );
}
