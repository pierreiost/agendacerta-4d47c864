import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";

interface Revenue {
  id: string;
  type: "booking" | "service_order";
  date: string;
  description: string;
  customer: string;
  amount: number;
}

export function RevenueList() {
  const { currentVenue } = useVenue();
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  const { data: revenues, isLoading } = useQuery({
    queryKey: ["revenues", currentVenue?.id, startDate.toISOString()],
    queryFn: async (): Promise<Revenue[]> => {
      if (!currentVenue?.id) return [];

      // Fetch finalized bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, start_time, customer_name, grand_total, space_id")
        .eq("venue_id", currentVenue.id)
        .eq("status", "FINALIZED")
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .order("start_time", { ascending: false });

      // Fetch finalized service orders
      const { data: serviceOrders } = await supabase
        .from("service_orders")
        .select("id, created_at, customer_name, total, description, order_number")
        .eq("venue_id", currentVenue.id)
        .or("status_simple.eq.finished,status_simple.eq.invoiced,status_complete.eq.finished,status_complete.eq.invoiced")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      const revenueItems: Revenue[] = [];

      // Map bookings
      for (const booking of bookings || []) {
        revenueItems.push({
          id: booking.id,
          type: "booking",
          date: booking.start_time,
          description: "Reserva",
          customer: booking.customer_name,
          amount: booking.grand_total || 0,
        });
      }

      // Map service orders
      for (const so of serviceOrders || []) {
        revenueItems.push({
          id: so.id,
          type: "service_order",
          date: so.created_at,
          description: `OS #${so.order_number} - ${so.description.substring(0, 30)}...`,
          customer: so.customer_name,
          amount: so.total || 0,
        });
      }

      // Sort by date descending
      return revenueItems.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    enabled: !!currentVenue?.id,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!revenues || revenues.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma receita no período</p>
        <p className="text-sm mt-1">
          Receitas são geradas automaticamente ao finalizar reservas e ordens de serviço
        </p>
      </div>
    );
  }

  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {revenues.length} receita(s) neste mês
        </p>
        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
          Total: {formatCurrency(totalRevenue)}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revenues.map((revenue) => (
              <TableRow key={revenue.id}>
                <TableCell className="font-medium">
                  {format(new Date(revenue.date), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      revenue.type === "booking"
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-purple-500 text-purple-600 dark:text-purple-400"
                    }
                  >
                    {revenue.type === "booking" ? "Reserva" : "O.S."}
                  </Badge>
                </TableCell>
                <TableCell>{revenue.description}</TableCell>
                <TableCell>{revenue.customer}</TableCell>
                <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(revenue.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
