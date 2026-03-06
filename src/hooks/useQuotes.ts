import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";
import { useToast } from "@/hooks/use-toast";

export interface Quote {
  id: string;
  venue_id: string;
  quote_number: number;
  status: "pending" | "approved" | "rejected";
  customer_id: string | null;
  customer_name: string;
  customer_document: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_zip_code: string | null;
  description: string;
  notes: string | null;
  device_model: string | null;
  photo_urls: string[];
  inquiry_id: string | null;
  service_order_id: string | null;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  description: string;
  service_code: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface QuoteInsert {
  venue_id: string;
  customer_name: string;
  description: string;
  customer_id?: string | null;
  customer_document?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_city?: string | null;
  customer_state?: string | null;
  customer_zip_code?: string | null;
  notes?: string | null;
  device_model?: string | null;
  discount?: number;
  tax_rate?: number;
}

export interface QuoteItemInsert {
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  service_code?: string | null;
}

export function useQuotes() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const quotesQuery = useQuery({
    queryKey: ["quotes", currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];
      const { data, error } = await supabase
        .from("quotes")
        .select("*, items:quote_items(*)")
        .eq("venue_id", currentVenue.id)
        .order("quote_number", { ascending: false });
      if (error) throw error;
      return data as unknown as Quote[];
    },
    enabled: !!currentVenue?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (quote: QuoteInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("quotes")
        .insert({ ...quote, created_by: user?.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", currentVenue?.id] });
      toast({ title: "Orçamento criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar orçamento", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuoteInsert> & { id: string; status?: Quote["status"]; service_order_id?: string | null }) => {
      const { data, error } = await supabase
        .from("quotes")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", currentVenue?.id] });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar orçamento", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", currentVenue?.id] });
      toast({ title: "Orçamento excluído!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir orçamento", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: QuoteItemInsert) => {
      const { data, error } = await supabase
        .from("quote_items")
        .insert(item as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", currentVenue?.id] });
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar item", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuoteItemInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("quote_items")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", currentVenue?.id] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("quote_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes", currentVenue?.id] });
    },
  });

  const getQuoteItems = async (quoteId: string): Promise<QuoteItem[]> => {
    const { data, error } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data as unknown as QuoteItem[];
  };

  // Approve quote → create OS Completa
  const approveQuote = async (quoteId: string) => {
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("*, items:quote_items(*)")
      .eq("id", quoteId)
      .single();
    if (fetchError || !quote) throw fetchError || new Error("Orçamento não encontrado");

    const q = quote as unknown as Quote;

    // Create OS Completa
    const { data: { user } } = await supabase.auth.getUser();
    const { data: os, error: osError } = await supabase
      .from("service_orders")
      .insert({
        venue_id: q.venue_id,
        order_type: "complete",
        status_complete: "draft",
        customer_id: q.customer_id,
        customer_name: q.customer_name,
        customer_document: q.customer_document,
        customer_email: q.customer_email,
        customer_phone: q.customer_phone,
        customer_address: q.customer_address,
        customer_city: q.customer_city,
        customer_state: q.customer_state,
        customer_zip_code: q.customer_zip_code,
        description: q.description,
        notes: q.notes,
        discount: q.discount,
        tax_rate: q.tax_rate,
        created_by: user?.id,
      } as never)
      .select()
      .single();
    if (osError) throw osError;

    // Copy items
    if (q.items && q.items.length > 0) {
      const osItems = q.items.map((item) => ({
        service_order_id: (os as any).id,
        description: item.description,
        service_code: item.service_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));
      const { error: itemsError } = await supabase.from("service_order_items").insert(osItems as never[]);
      if (itemsError) throw itemsError;
    }

    // Update quote status
    await supabase
      .from("quotes")
      .update({ status: "approved", service_order_id: (os as any).id } as never)
      .eq("id", quoteId);

    queryClient.invalidateQueries({ queryKey: ["quotes", currentVenue?.id] });
    queryClient.invalidateQueries({ queryKey: ["service-orders", currentVenue?.id] });
    toast({ title: "Orçamento aprovado! OS gerada com sucesso." });

    return (os as any).id as string;
  };

  const rejectQuote = async (quoteId: string) => {
    await supabase.from("quotes").update({ status: "rejected" } as never).eq("id", quoteId);
    queryClient.invalidateQueries({ queryKey: ["quotes", currentVenue?.id] });
    toast({ title: "Orçamento rejeitado." });
  };

  return {
    quotes: quotesQuery.data ?? [],
    isLoading: quotesQuery.isLoading,
    error: quotesQuery.error,
    createQuote: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateQuote: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteQuote: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    addItem: addItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    removeItem: removeItemMutation.mutateAsync,
    getQuoteItems,
    approveQuote,
    rejectQuote,
  };
}

export function useQuote(id: string | null) {
  const { currentVenue } = useVenue();
  return useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("quotes")
        .select("*, items:quote_items(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Quote | null;
    },
    enabled: !!id && !!currentVenue?.id,
  });
}
