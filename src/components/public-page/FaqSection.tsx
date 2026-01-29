import { FaqSection as FaqSectionType } from '@/types/public-page';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

interface FaqSectionProps {
  section: FaqSectionType;
}

export function FaqSection({ section }: FaqSectionProps) {
  if (!section.enabled || section.items.length === 0) return null;

  return (
    <section className="py-16 md:py-24 px-4 bg-muted/30">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Tire suas dúvidas sobre nossos serviços
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {section.items.map((faq, index) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="bg-card rounded-xl border shadow-sm px-6 data-[state=open]:shadow-md transition-shadow"
            >
              <AccordionTrigger className="text-left font-medium py-5 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
