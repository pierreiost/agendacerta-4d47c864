import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

interface LandingCTAProps {
  onCTA: () => void;
}

export function LandingCTA({ onCTA }: LandingCTAProps) {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-primary" />
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/10 backdrop-blur-sm mb-8">
          <Sparkles className="h-8 w-8 text-yellow-300" />
        </div>

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
          Pronto para transformar sua gestão?
        </h2>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
          Junte-se a mais de 500 empresas que já automatizaram seus agendamentos 
          e aumentaram seu faturamento com o AgendaCerta.
        </p>

        {/* CTA Button */}
        <Button
          size="lg"
          onClick={onCTA}
          className="bg-white text-primary hover:bg-white/90 text-lg px-10 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105"
        >
          Começar Teste Grátis de 7 Dias
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {/* Trust Elements */}
        <div className="flex flex-wrap justify-center gap-8 mt-12 text-white/70">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="text-sm">Sem cartão de crédito</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="text-sm">Setup em 2 minutos</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="text-sm">Cancele quando quiser</span>
          </div>
        </div>
      </div>
    </section>
  );
}
