import { TestimonialsSection as TestimonialsSectionType } from '@/types/public-page';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestimonialsSectionProps {
  section: TestimonialsSectionType;
}

function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}

export function TestimonialsSection({ section }: TestimonialsSectionProps) {
  if (!section.enabled || section.items.length === 0) return null;

  return (
    <section className="py-8">
      {/* Section Title */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          O que dizem sobre nós
        </h2>
        <div className="w-12 h-0.5 bg-primary rounded-full" />
      </div>

      <div className="space-y-3">
        {section.items.slice(0, 3).map((testimonial) => (
          <Card
            key={testimonial.id}
            className="border bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Avatar */}
                <Avatar className="h-10 w-10 flex-shrink-0">
                  {isSafeImageUrl(testimonial.avatar_url) ? (
                    <AvatarImage src={testimonial.avatar_url!} alt={testimonial.author} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {testimonial.author.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  {/* Header: Name + Rating */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <p className="font-medium text-sm">{testimonial.author}</p>
                      {testimonial.role && (
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      )}
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-3.5 w-3.5",
                            star <= testimonial.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/20"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-foreground/70 text-sm leading-relaxed line-clamp-2">
                    "{testimonial.content}"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
