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
    <section className="py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Perguntas Frequentes</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Tire suas dúvidas sobre nossos serviços
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {section.items.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className="bg-card rounded-lg border px-4 data-[state=open]:bg-muted/30 transition-colors"
          >
            <AccordionTrigger className="text-left text-sm font-medium py-4 hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-sm pb-4 leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
