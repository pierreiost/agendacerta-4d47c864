import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Carlos M.',
    role: 'Gestor de Complexo Esportivo',
    segment: 'Quadras',
    content: 'Antes perdíamos reservas por falta de organização. Agora tudo é automático e os clientes conseguem agendar online. Reduziu muito os conflitos de horário.',
    rating: 5,
    avatar: 'CM',
  },
  {
    name: 'Amanda S.',
    role: 'Proprietária de Salão de Beleza',
    segment: 'Beleza',
    content: 'Finalmente um sistema que entende a realidade de um salão. Controlo a agenda de vários profissionais, vejo o faturamento de cada um e nunca mais tive conflito de horários.',
    rating: 5,
    avatar: 'AS',
  },
  {
    name: 'Roberto O.',
    role: 'Técnico em Climatização',
    segment: 'Assistência',
    content: 'As ordens de serviço ficaram profissionais. Abro OS no celular, controlo peças e mão de obra, e o cliente recebe tudo por PDF. Organização total.',
    rating: 5,
    avatar: 'RO',
  },
];

export function LandingTestimonials() {
  return (
    <section id="depoimentos" className="py-20 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Depoimentos
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Profissionais de diversos segmentos usando o AgendaCerta todos os dias.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="relative bg-background rounded-2xl p-8 shadow-sm border border-border hover:shadow-lg transition-shadow duration-300"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/10" />

              {/* Segment Badge - Positioned at top */}
              <div className="mb-4">
                <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                  {testimonial.segment}
                </span>
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-muted-foreground mb-6 italic">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">{testimonial.avatar}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
