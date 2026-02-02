import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type ExpenseCategory = 
  | "material" 
  | "salary" 
  | "rent" 
  | "utilities" 
  | "maintenance" 
  | "marketing" 
  | "other";

export type PaymentMethod = "CASH" | "CREDIT" | "DEBIT" | "PIX" | "TRANSFER";

export interface Expense {
  id: string;
  venue_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: PaymentMethod | null;
  expense_date: string;
  due_date: string | null;
  paid_at: string | null;
  is_paid: boolean;
  supplier: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFormData {
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method?: PaymentMethod | null;
  expense_date: string;
  due_date?: string | null;
  is_paid: boolean;
  supplier?: string | null;
  notes?: string | null;
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: "material", label: "Material/Produtos", icon: "📦" },
  { value: "salary", label: "Pagamento Funcionários", icon: "👥" },
  { value: "rent", label: "Aluguel", icon: "🏠" },
  { value: "utilities", label: "Água/Luz/Internet", icon: "💡" },
  { value: "maintenance", label: "Manutenção/Reparos", icon: "🔧" },
  { value: "marketing", label: "Marketing/Publicidade", icon: "📢" },
  { value: "other", label: "Outros", icon: "📋" },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "PIX", label: "PIX" },
  { value: "CASH", label: "Dinheiro" },
  { value: "CREDIT", label: "Cartão de Crédito" },
  { value: "DEBIT", label: "Cartão de Débito" },
  { value: "TRANSFER", label: "Transferência" },
];

export function useExpenses(filters?: {
  startDate?: string;
  endDate?: string;
  category?: ExpenseCategory;
  isPaid?: boolean;
}) {
  const { currentVenue } = useVenue();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: expenses, isLoading, error } = useQuery({
    queryKey: ["expenses", currentVenue?.id, filters],
    queryFn: async () => {
      if (!currentVenue?.id) return [];

      let query = supabase
        .from("expenses")
        .select("*")
        .eq("venue_id", currentVenue.id)
        .order("expense_date", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("expense_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("expense_date", filters.endDate);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.isPaid !== undefined) {
        query = query.eq("is_paid", filters.isPaid);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!currentVenue?.id,
  });

  const createExpense = useMutation({
    mutationFn: async (formData: ExpenseFormData) => {
      if (!currentVenue?.id) throw new Error("Venue não selecionada");

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          venue_id: currentVenue.id,
          category: formData.category,
          description: formData.description,
          amount: formData.amount,
          payment_method: formData.payment_method || null,
          expense_date: formData.expense_date,
          due_date: formData.due_date || null,
          is_paid: formData.is_paid,
          paid_at: formData.is_paid ? new Date().toISOString() : null,
          supplier: formData.supplier || null,
          notes: formData.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["financial-metrics"] });
      toast({ title: "Despesa registrada com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar despesa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...formData }: ExpenseFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update({
          category: formData.category,
          description: formData.description,
          amount: formData.amount,
          payment_method: formData.payment_method || null,
          expense_date: formData.expense_date,
          due_date: formData.due_date || null,
          is_paid: formData.is_paid,
          paid_at: formData.is_paid ? new Date().toISOString() : null,
          supplier: formData.supplier || null,
          notes: formData.notes || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["financial-metrics"] });
      toast({ title: "Despesa atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar despesa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["financial-metrics"] });
      toast({ title: "Despesa excluída com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir despesa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["financial-metrics"] });
      toast({ title: "Despesa marcada como paga!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao marcar como paga",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    expenses: expenses || [],
    isLoading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    markAsPaid,
  };
}
