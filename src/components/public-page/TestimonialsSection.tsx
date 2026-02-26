import { useState } from 'react';
import { TestimonialsSection as TestimonialsSectionType } from '@/types/public-page';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ChevronDown } from 'lucide-react';
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

function TestimonialCard({ testimonial }: { testimonial: { id: string; author: string; role?: string; avatar_url?: string | null; rating: number; content: string } }) {
  const [expanded, setExpanded] = useState(false);
  // Only show expand button if content is likely to be truncated (rough heuristic: >80 chars)
  const isLong = testimonial.content.length > 80;

  return (
    <Card
      className={cn(
        "border bg-white rounded-xl overflow-hidden",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "hover:border-primary/30"
      )}
    >
      <CardContent className="p-5">
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
            <p className={cn(
              "text-foreground/70 text-sm leading-relaxed",
              !expanded && "line-clamp-2"
            )}>
              "{testimonial.content}"
            </p>

            {/* Expand/collapse toggle */}
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-0.5 mt-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <span>{expanded ? 'Ver menos' : 'Ver mais'}</span>
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  expanded && "rotate-180"
                )} />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestimonialsSection({ section }: TestimonialsSectionProps) {
  if (!section.enabled || section.items.length === 0) return null;

  return (
    <section className="py-8">
      {/* Section Title */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {section.title || 'O que dizem sobre nós'}
        </h2>
        <div className="w-12 h-0.5 bg-primary rounded-full" />
      </div>

      <div className="space-y-3">
        {section.items.slice(0, 3).map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>
    </section>
  );
}