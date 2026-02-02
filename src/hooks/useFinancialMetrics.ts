import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  revenueChange: number;
  expenseChange: number;
  pendingExpenses: number;
  monthlyData: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
}

export function useFinancialMetrics(period: "month" | "year" = "month") {
  const { currentVenue } = useVenue();

  return useQuery({
    queryKey: ["financial-metrics", currentVenue?.id, period],
    queryFn: async (): Promise<FinancialMetrics> => {
      if (!currentVenue?.id) {
        return {
          totalRevenue: 0,
          totalExpenses: 0,
          balance: 0,
          revenueChange: 0,
          expenseChange: 0,
          pendingExpenses: 0,
          monthlyData: [],
        };
      }

      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      let prevStartDate: Date;
      let prevEndDate: Date;

      if (period === "month") {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        prevStartDate = startOfMonth(subMonths(now, 1));
        prevEndDate = endOfMonth(subMonths(now, 1));
      } else {
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        prevStartDate = startOfYear(subMonths(now, 12));
        prevEndDate = endOfYear(subMonths(now, 12));
      }

      // Fetch finalized bookings (revenue)
      const { data: bookings } = await supabase
        .from("bookings")
        .select("grand_total, start_time")
        .eq("venue_id", currentVenue.id)
        .eq("status", "FINALIZED")
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString());

      // Fetch previous period bookings for comparison
      const { data: prevBookings } = await supabase
        .from("bookings")
        .select("grand_total")
        .eq("venue_id", currentVenue.id)
        .eq("status", "FINALIZED")
        .gte("start_time", prevStartDate.toISOString())
        .lte("start_time", prevEndDate.toISOString());

      // Fetch finalized service orders (revenue)
      const { data: serviceOrders } = await supabase
        .from("service_orders")
        .select("total, created_at")
        .eq("venue_id", currentVenue.id)
        .or("status_simple.eq.finished,status_simple.eq.invoiced,status_complete.eq.finished,status_complete.eq.invoiced")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch previous period service orders
      const { data: prevServiceOrders } = await supabase
        .from("service_orders")
        .select("total")
        .eq("venue_id", currentVenue.id)
        .or("status_simple.eq.finished,status_simple.eq.invoiced,status_complete.eq.finished,status_complete.eq.invoiced")
        .gte("created_at", prevStartDate.toISOString())
        .lte("created_at", prevEndDate.toISOString());

      // Fetch expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, expense_date, is_paid")
        .eq("venue_id", currentVenue.id)
        .gte("expense_date", format(startDate, "yyyy-MM-dd"))
        .lte("expense_date", format(endDate, "yyyy-MM-dd"));

      // Fetch previous period expenses
      const { data: prevExpenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("venue_id", currentVenue.id)
        .gte("expense_date", format(prevStartDate, "yyyy-MM-dd"))
        .lte("expense_date", format(prevEndDate, "yyyy-MM-dd"));

      // Fetch pending expenses (unpaid)
      const { data: pendingExpensesData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("venue_id", currentVenue.id)
        .eq("is_paid", false);

      // Calculate totals
      const bookingRevenue = (bookings || []).reduce((sum, b) => sum + (b.grand_total || 0), 0);
      const serviceOrderRevenue = (serviceOrders || []).reduce((sum, so) => sum + (so.total || 0), 0);
      const totalRevenue = bookingRevenue + serviceOrderRevenue;

      const prevBookingRevenue = (prevBookings || []).reduce((sum, b) => sum + (b.grand_total || 0), 0);
      const prevServiceOrderRevenue = (prevServiceOrders || []).reduce((sum, so) => sum + (so.total || 0), 0);
      const prevTotalRevenue = prevBookingRevenue + prevServiceOrderRevenue;

      const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
      const prevTotalExpenses = (prevExpenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
      const pendingExpenses = (pendingExpensesData || []).reduce((sum, e) => sum + Number(e.amount), 0);

      // Calculate changes
      const revenueChange = prevTotalRevenue > 0 
        ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
        : 0;
      const expenseChange = prevTotalExpenses > 0 
        ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 
        : 0;

      // Build monthly data for charts
      const months = eachMonthOfInterval({
        start: subMonths(now, 5),
        end: now,
      });

      const monthlyData = await Promise.all(
        months.map(async (month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);

          const { data: monthBookings } = await supabase
            .from("bookings")
            .select("grand_total")
            .eq("venue_id", currentVenue.id)
            .eq("status", "FINALIZED")
            .gte("start_time", monthStart.toISOString())
            .lte("start_time", monthEnd.toISOString());

          const { data: monthServiceOrders } = await supabase
            .from("service_orders")
            .select("total")
            .eq("venue_id", currentVenue.id)
            .or("status_simple.eq.finished,status_simple.eq.invoiced,status_complete.eq.finished,status_complete.eq.invoiced")
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString());

          const { data: monthExpenses } = await supabase
            .from("expenses")
            .select("amount")
            .eq("venue_id", currentVenue.id)
            .gte("expense_date", format(monthStart, "yyyy-MM-dd"))
            .lte("expense_date", format(monthEnd, "yyyy-MM-dd"));

          const monthRevenue = 
            (monthBookings || []).reduce((sum, b) => sum + (b.grand_total || 0), 0) +
            (monthServiceOrders || []).reduce((sum, so) => sum + (so.total || 0), 0);
          
          const monthExpenseTotal = (monthExpenses || []).reduce((sum, e) => sum + Number(e.amount), 0);

          return {
            month: format(month, "MMM", { locale: ptBR }),
            revenue: monthRevenue,
            expenses: monthExpenseTotal,
          };
        })
      );

      return {
        totalRevenue,
        totalExpenses,
        balance: totalRevenue - totalExpenses,
        revenueChange,
        expenseChange,
        pendingExpenses,
        monthlyData,
      };
    },
    enabled: !!currentVenue?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
