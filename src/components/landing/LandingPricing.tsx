import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check, X, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LandingPricingProps {
  onCTA: () => void;
}

const plans = [
  {
    name: 'Basic',
    icon: Zap,
    description: 'Para pequenos negócios começando a organizar sua agenda.',
    monthlyPrice: 49,
    yearlyPrice: 39,
    popular: false,
    features: [
      { name: 'Até 3 espaços/profissionais', included: true },
      { name: 'Agenda online ilimitada', included: true },
      { name: 'Gestão de clientes', included: true },
      { name: 'Dashboard básico', included: true },
      { name: 'Relatórios simples', included: true },
      { name: 'Suporte por email', included: true },
      { name: 'Página pública personalizada', included: false },
      { name: 'Identidade visual', included: false },
      { name: 'Ordens de serviço', included: false },
      { name: 'Relatórios avançados', included: false },
      { name: 'Suporte prioritário', included: false },
    ],
  },
  {
    name: 'Max',
    icon: Crown,
    description: 'Tudo liberado para escalar seu negócio sem limites.',
    monthlyPrice: 99,
    yearlyPrice: 79,
    popular: true,
    features: [
      { name: 'Espaços/profissionais ilimitados', included: true },
      { name: 'Agenda online ilimitada', included: true },
      { name: 'Gestão de clientes', included: true },
      { name: 'Dashboard completo', included: true },
      { name: 'Relatórios completos', included: true },
      { name: 'Suporte por email', included: true },
      { name: 'Página pública personalizada', included: true },
      { name: 'Identidade visual', included: true },
      { name: 'Ordens de serviço + PDF', included: true },
      { name: 'Relatórios avançados + Excel', included: true },
      { name: 'Suporte prioritário WhatsApp', included: true },
    ],
  },
];

export function LandingPricing({ onCTA }: LandingPricingProps) {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section id="precos" className="py-20 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Preços
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Planos simples e transparentes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Comece com 7 dias grátis. Sem cartão de crédito. Cancele quando quiser.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-4 bg-background rounded-full p-2 border border-border">
            <span className={cn("text-sm font-medium px-3", !isYearly && "text-primary")}>
              Mensal
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={cn("text-sm font-medium px-3", isYearly && "text-primary")}>
              Anual
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                -20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative bg-background rounded-2xl p-8 border-2 transition-all duration-300",
                plan.popular
                  ? "border-primary shadow-xl scale-105"
                  : "border-border hover:border-primary/50"
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-block bg-primary text-primary-foreground text-sm font-semibold px-4 py-1 rounded-full">
                    Mais Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-8">
                <div className={cn(
                  "inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4",
                  plan.popular ? "bg-primary text-white" : "bg-primary/10 text-primary"
                )}>
                  <plan.icon className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl text-muted-foreground">R$</span>
                  <span className="text-5xl font-bold text-foreground">
                    {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                {isYearly && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Cobrado anualmente (R$ {plan.yearlyPrice * 12}/ano)
                  </p>
                )}
              </div>

              {/* CTA */}
              <Button
                onClick={onCTA}
                className={cn(
                  "w-full h-12 text-base font-semibold mb-8",
                  plan.popular
                    ? "gradient-primary hover:opacity-90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                Começar 7 dias grátis
              </Button>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm",
                      feature.included ? "text-foreground" : "text-muted-foreground/50"
                    )}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            💳 Não precisa de cartão de crédito para testar
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Garantia de 7 dias. Cancele a qualquer momento sem burocracia.
          </p>
        </div>
      </div>
    </section>
  );
}
