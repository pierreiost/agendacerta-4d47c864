import { FaqSection as FaqSectionType } from '@/types/public-page';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FaqSectionProps {
  section: FaqSectionType;
}

export function FaqSection({ section }: FaqSectionProps) {
  if (!section.enabled || section.items.length === 0) return null;

  return (
    <section className="py-8">
      {/* Section Title */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Perguntas Frequentes
        </h2>
        <div className="w-12 h-0.5 bg-primary rounded-full" />
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {section.items.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className="bg-white rounded-xl border shadow-sm px-5 data-[state=open]:shadow-md data-[state=open]:border-primary/30 transition-all duration-200 hover:border-primary/20"
          >
            <AccordionTrigger className="text-left text-sm font-medium py-4 hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-sm pb-5 leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
