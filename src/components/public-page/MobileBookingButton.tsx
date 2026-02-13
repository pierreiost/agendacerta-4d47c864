import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Calendar, X } from 'lucide-react';
import { BookingWidget } from './BookingWidget';
import { ServiceBookingWidget } from './ServiceBookingWidget';
import { cn } from '@/lib/utils';

interface PublicVenue {
  id: string;
  name: string;
  slug: string;
  booking_mode: 'calendar' | 'inquiry' | 'external_link';
  public_settings: {
    external_link_url?: string;
    inquiry_notification_email?: string;
    page_title?: string;
    page_instruction?: string;
  } | null;
  logo_url: string | null;
  primary_color: string | null;
  segment?: string | null;
}

interface MobileBookingButtonProps {
  venue: PublicVenue;
  whatsappPhone?: string | null;
}

export function MobileBookingButton({ venue, whatsappPhone }: MobileBookingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isServiceSegment = venue.segment === 'beauty' || venue.segment === 'health';

  const buttonLabel = isServiceSegment
    ? 'Agendar Serviço'
    : venue.booking_mode === 'calendar'
      ? 'Agendar Horário'
      : 'Solicitar Orçamento';

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className={cn(
            "w-full h-14 text-base font-semibold rounded-xl",
            "shadow-lg shadow-primary/25",
            "bg-primary hover:bg-primary/90",
            "transition-all duration-300",
            "flex items-center justify-center gap-2"
          )}
        >
          <Calendar className="h-5 w-5" />
          {buttonLabel}
        </Button>
      </div>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-semibold">
                {buttonLabel}
              </DrawerTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 py-4">
            {isServiceSegment ? (
              <ServiceBookingWidget venue={venue} whatsappPhone={whatsappPhone} />
            ) : (
              <BookingWidget venue={venue} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
