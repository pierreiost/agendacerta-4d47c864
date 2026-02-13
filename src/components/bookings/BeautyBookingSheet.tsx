import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { useBooking, type Booking } from "@/hooks/useBookings";

interface BeautyBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
}

export function BeautyBookingSheet({ open, onOpenChange, booking: initialBooking }: BeautyBookingSheetProps) {
  console.log("🔄 Renderizando BeautyBookingSheet", {
    id: initialBooking?.id,
    open,
  });

  // 1. Apenas o Hook Principal (Se travar aqui, o problema é no useBooking)
  const { data: booking, isLoading } = useBooking(initialBooking?.id ?? null);

  // 2. Fallback seguro para exibição
  const currentBooking = booking || initialBooking;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col bg-background/80 backdrop-blur-xl">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle>{currentBooking ? `Cliente: ${currentBooking.customer_name}` : "Carregando..."}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 p-6">
          {isLoading && !booking ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-100 text-green-800 rounded-md border border-green-200">
                ✅ <strong>Sucesso:</strong> Se você está lendo isso, o loop infinito parou.
              </div>

              <div className="p-4 bg-muted rounded-md text-sm font-mono">
                <p>ID: {currentBooking?.id}</p>
                <p>Status: {currentBooking?.status}</p>
                <p>Data: {currentBooking?.start_time}</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
