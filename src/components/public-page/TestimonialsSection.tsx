import { TestimonialsSection as TestimonialsSectionType } from '@/types/public-page';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquareQuote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestimonialsSectionProps {
  section: TestimonialsSectionType;
}

// Validar se URL de imagem é segura
function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function TestimonialsSection({ section }: TestimonialsSectionProps) {
  if (!section.enabled || section.items.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquareQuote className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">O que dizem sobre nós</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Confira a opinião de quem já utilizou nossos serviços
        </p>
      </div>

      <div className="space-y-4">
        {section.items.slice(0, 4).map((testimonial, index) => (
          <Card
            key={testimonial.id}
            className={cn(
              "border shadow-sm",
              "hover:shadow-md transition-shadow duration-200"
            )}
          >
            <CardContent className="p-5">
              {/* Rating */}
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      star <= testimonial.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/20"
                    )}
                  />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {isSafeImageUrl(testimonial.avatar_url) ? (
                    <AvatarImage src={testimonial.avatar_url!} alt={testimonial.author} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {testimonial.author.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{testimonial.author}</p>
                  {testimonial.role && (
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
