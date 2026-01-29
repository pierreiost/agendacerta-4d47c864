import { TestimonialsSection as TestimonialsSectionType } from '@/types/public-page';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestimonialsSectionProps {
  section: TestimonialsSectionType;
}

export function TestimonialsSection({ section }: TestimonialsSectionProps) {
  if (!section.enabled || section.items.length === 0) return null;

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
          O que nossos clientes dizem
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Confira a opinião de quem já utilizou nossos serviços
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {section.items.map((testimonial, index) => (
            <Card
              key={testimonial.id}
              className={cn(
                "relative overflow-hidden border-0 shadow-lg",
                "bg-gradient-to-br from-card via-card to-muted/20",
                "hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                {/* Quote icon */}
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-4 w-4",
                        star <= testimonial.rating
                          ? "fill-warning text-warning"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>

                {/* Content */}
                <p className="text-foreground/80 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    {testimonial.avatar_url ? (
                      <AvatarImage src={testimonial.avatar_url} alt={testimonial.author} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.author.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    {testimonial.role && (
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
