import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, FileDown, Check, Loader2, Paperclip, X as XIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuotes, type Quote, type QuoteItem } from "@/hooks/useQuotes";
import { useQuotePdf } from "@/hooks/useQuotePdf";
import { useCustomers } from "@/hooks/useCustomers";
import { useVenue } from "@/contexts/VenueContext";
import { useToast } from "@/hooks/use-toast";
import { maskCPFCNPJ, maskPhone, maskCEP } from "@/lib/masks";
import { ServiceOrderItemForm } from "@/components/service-orders/ServiceOrderItemForm";
import { useCepLookup } from "@/hooks/useCepLookup";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Styles
const input = "w-full border border-foreground/20 bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground/50 transition-colors placeholder:text-muted-foreground";
const label = "block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1";
const btn = "inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50";
const btnPrimary = `${btn} bg-foreground text-background hover:bg-foreground/90`;
const btnOutline = `${btn} border border-foreground/20 hover:bg-muted`;
const btnGhost = `${btn} hover:bg-muted`;
const S = { borderRadius: 0 } as const;

interface FormItem {
  id?: string;
  description: string;
  service_code: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export default function OrcamentoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const { quotes, createQuote, updateQuote, getQuoteItems, addItem, updateItem, removeItem, approveQuote } = useQuotes();
  const { generatePdf } = useQuotePdf();
  const { customers } = useCustomers();
  const { lookupCep, isLoading: isLoadingCep } = useCepLookup();
  const isMobile = useIsMobile();

  const isEditing = !!id;
  const existingQuote = useMemo(() => quotes.find((q) => q.id === id), [quotes, id]);
  const isApproved = existingQuote?.status === "approved";
  const isRejected = existingQuote?.status === "rejected";
  const readOnly = isApproved || isRejected;

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCep, setCustomerCep] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [items, setItems] = useState<FormItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showAddItemForm, setShowAddItemForm] = useState(false);

  const loadedRef = useRef(false);
  const lastIdRef = useRef<string | undefined>(undefined);

  // Load existing quote
  useEffect(() => {
    if (lastIdRef.current !== id) { lastIdRef.current = id; loadedRef.current = false; }
    if (!existingQuote || !id || loadedRef.current) return;

    const load = async () => {
      setCustomerName(existingQuote.customer_name);
      setCustomerDocument(existingQuote.customer_document || "");
      setCustomerEmail(existingQuote.customer_email || "");
      setCustomerPhone(existingQuote.customer_phone || "");
      setCustomerCep(existingQuote.customer_zip_code || "");
      setCustomerAddress(existingQuote.customer_address || "");
      setCustomerCity(existingQuote.customer_city || "");
      setCustomerState(existingQuote.customer_state || "");
      setCustomerId(existingQuote.customer_id);
      setDescription(existingQuote.description);
      setNotes(existingQuote.notes || "");
      setDeviceModel(existingQuote.device_model || "");
      setDiscount(Number(existingQuote.discount) || 0);
      setTaxRate(existingQuote.tax_rate != null ? Number(existingQuote.tax_rate) * 100 : 0);

      const dbItems = await getQuoteItems(id);
      setItems(dbItems.map((i) => ({
        id: i.id,
        description: i.description,
        service_code: i.service_code || "",
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
        subtotal: Number(i.subtotal),
      })));
      loadedRef.current = true;
    };
    load();
  }, [existingQuote, id, getQuoteItems]);

  // Totals
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal - discount + taxAmount;
    return { subtotal, taxAmount, total };
  }, [items, discount, taxRate]);

  // Customer search
  const filteredCustomers = customerSearch.length >= 2
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 5)
    : [];

  const selectCustomer = (c: typeof customers[0]) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerDocument(c.document || "");
    setCustomerEmail(c.email || "");
    setCustomerPhone(c.phone || "");
    if (c.address) setCustomerAddress(c.address);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  };

  const handleCep = async (value: string) => {
    const masked = maskCEP(value);
    setCustomerCep(masked);
    const digits = value.replace(/\D/g, "");
    if (digits.length === 8) {
      const data = await lookupCep(digits);
      if (data) {
        setCustomerAddress(data.logradouro || "");
        setCustomerCity(data.localidade || "");
        setCustomerState(data.uf || "");
      }
    }
  };

  const handleAddItemFromForm = async (newItem: any) => {
    setItems([...items, {
      description: newItem.description,
      service_code: newItem.service_code || "",
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      subtotal: newItem.subtotal,
    }]);
    setShowAddItemForm(false);
  };

  const removeItemAt = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!currentVenue || !customerName.trim()) {
      toast({ title: "Nome do cliente é obrigatório", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const quoteData = {
        venue_id: currentVenue.id,
        customer_id: customerId,
        customer_name: customerName,
        customer_document: customerDocument || null,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        customer_address: customerAddress || null,
        customer_city: customerCity || null,
        customer_state: customerState || null,
        customer_zip_code: customerCep || null,
        description,
        notes: notes || null,
        device_model: deviceModel || null,
        discount,
        tax_rate: taxRate / 100,
      };

      if (isEditing && id) {
        await updateQuote({ id, ...quoteData });
        // Sync items
        const dbItems = await getQuoteItems(id);
        const formIds = items.map((i) => i.id).filter(Boolean);
        for (const di of dbItems) {
          if (!formIds.includes(di.id)) await removeItem(di.id);
        }
        for (const item of items) {
          if (item.id) {
            await updateItem({ id: item.id, description: item.description, service_code: item.service_code || null, quantity: item.quantity, unit_price: item.unit_price, subtotal: item.subtotal });
          } else {
            await addItem({ quote_id: id, description: item.description, service_code: item.service_code || null, quantity: item.quantity, unit_price: item.unit_price, subtotal: item.subtotal });
          }
        }
        toast({ title: "Orçamento atualizado!" });
      } else {
        const newQuote = await createQuote(quoteData);
        if (newQuote) {
          for (const item of items) {
            await addItem({ quote_id: (newQuote as any).id, description: item.description, service_code: item.service_code || null, quantity: item.quantity, unit_price: item.unit_price, subtotal: item.subtotal });
          }
        }
      }
      navigate("/orcamentos");
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePdf = async () => {
    if (!existingQuote) return;
    setIsGeneratingPdf(true);
    try {
      const qi = await getQuoteItems(existingQuote.id);
      await generatePdf(existingQuote, qi);
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleApproveClick = async () => {
    if (!existingQuote) return;
    setIsApproving(true);
    try {
      // Save first
      await handleSave();
      const osId = await approveQuote(existingQuote.id);
      navigate(`/ordens-servico/${osId}`);
    } catch {
      toast({ title: "Erro ao aprovar", variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <button onClick={() => navigate("/orcamentos")} className={btnGhost} style={S}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
                {isEditing ? `ORC-${String(existingQuote?.quote_number || 0).padStart(3, "0")}` : "Novo Orçamento"}
              </h1>
              {existingQuote && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    existingQuote.status === "pending" ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" :
                    existingQuote.status === "approved" ? "bg-emerald-400/20 text-emerald-700 dark:text-emerald-300" :
                    "bg-neutral-400/20 text-neutral-500"
                  }`}
                  style={S}
                >
                  {existingQuote.status === "pending" ? "PENDENTE" : existingQuote.status === "approved" ? "APROVADO" : "REJEITADO"}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isEditing && (
              <button onClick={handlePdf} disabled={isGeneratingPdf} className={btnOutline} style={S}>
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                PDF
              </button>
            )}
            {!readOnly && isEditing && existingQuote?.status === "pending" && (
              <button onClick={handleApproveClick} disabled={isApproving} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`} style={S}>
                {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Aprovar → OS
              </button>
            )}
            {!readOnly && (
              <button onClick={handleSave} disabled={isSaving} className={btnPrimary} style={S}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            )}
          </div>
        </div>

        {/* Approved link */}
        {isApproved && existingQuote?.service_order_id && (
          <div className="border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between" style={S}>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              OS gerada a partir deste orçamento
            </span>
            <button
              onClick={() => navigate(`/ordens-servico/${existingQuote.service_order_id}`)}
              className={`${btn} text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10`}
              style={S}
            >
              Ver OS →
            </button>
          </div>
        )}

        {/* Cliente */}
        <section className="border border-foreground/10 p-4 md:p-6 space-y-4" style={S}>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-foreground/10 pb-2">
            Cliente
          </h2>
          <div className="relative">
            <label className={label}>Buscar cliente existente</label>
            <input
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
              onFocus={() => setShowCustomerDropdown(true)}
              placeholder="Digite para buscar..."
              className={input}
              style={S}
              disabled={readOnly}
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-10 w-full border border-foreground/10 bg-background shadow-lg mt-1 max-h-40 overflow-y-auto" style={S}>
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.phone && <span className="text-muted-foreground ml-2">· {c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Nome *</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={input} style={S} disabled={readOnly} />
            </div>
            <div>
              <label className={label}>CPF/CNPJ</label>
              <input value={customerDocument} onChange={(e) => setCustomerDocument(maskCPFCNPJ(e.target.value))} className={input} style={S} disabled={readOnly} />
            </div>
            <div>
              <label className={label}>E-mail</label>
              <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} type="email" className={input} style={S} disabled={readOnly} />
            </div>
            <div>
              <label className={label}>Telefone</label>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(maskPhone(e.target.value))} className={input} style={S} disabled={readOnly} />
            </div>
            <div>
              <label className={label}>CEP</label>
              <input value={customerCep} onChange={(e) => handleCep(e.target.value)} className={input} style={S} disabled={readOnly} />
            </div>
            <div>
              <label className={label}>Endereço</label>
              <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className={input} style={S} disabled={readOnly} />
            </div>
            <div>
              <label className={label}>Cidade</label>
              <input value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} className={input} style={S} disabled={readOnly} />
            </div>
            <div>
              <label className={label}>Estado</label>
              <input value={customerState} onChange={(e) => setCustomerState(e.target.value)} className={input} style={S} disabled={readOnly} />
            </div>
          </div>
        </section>

        {/* Descrição */}
        <section className="border border-foreground/10 p-4 md:p-6 space-y-4" style={S}>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-foreground/10 pb-2">
            Detalhes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={label}>Descrição</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${input} resize-none`} style={S} disabled={readOnly} />
            </div>
            <div>
              <label className={label}>Equipamento / Modelo</label>
              <input value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} className={input} style={S} disabled={readOnly} />
            </div>
            <div className="md:col-span-2">
              <label className={label}>Observações</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${input} resize-none`} style={S} disabled={readOnly} />
            </div>
          </div>
        </section>

        {/* Anexos / Fotos */}
        {existingQuote?.photo_urls && existingQuote.photo_urls.length > 0 && (
          <>
            {/* Mobile: botão que abre modal */}
            {isMobile ? (
              <>
                <button
                  onClick={() => setShowPhotos(true)}
                  className={`${btnOutline} w-full justify-center`}
                  style={S}
                >
                  <Paperclip className="w-4 h-4" />
                  Ver Anexos ({existingQuote.photo_urls.length})
                </button>

                {showPhotos && (
                  <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
                    <div className="flex items-center justify-between p-4">
                      <span className="text-white text-sm font-bold uppercase tracking-wider">
                        Anexos ({existingQuote.photo_urls.length})
                      </span>
                      <button onClick={() => setShowPhotos(false)} className="text-white p-2">
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
                      {existingQuote.photo_urls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Anexo ${i + 1}`}
                          className="w-full aspect-square object-cover border border-white/10 cursor-pointer"
                          style={S}
                          onClick={() => setLightboxUrl(url)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Desktop: mini galeria inline */
              <section className="border border-foreground/10 p-4 md:p-6 space-y-4" style={S}>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-foreground/10 pb-2">
                  Anexos ({existingQuote.photo_urls.length})
                </h2>
                <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {existingQuote.photo_urls.map((url, i) => (
                    <div
                      key={i}
                      className="group relative aspect-square border border-foreground/10 overflow-hidden cursor-pointer hover:border-foreground/30 transition-colors"
                      style={S}
                      onClick={() => setLightboxUrl(url)}
                    >
                      <img
                        src={url}
                        alt={`Anexo ${i + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Lightbox */}
            {lightboxUrl && (
              <div
                className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
                onClick={() => setLightboxUrl(null)}
              >
                <button className="absolute top-4 right-4 text-white p-2" onClick={() => setLightboxUrl(null)}>
                  <XIcon className="w-6 h-6" />
                </button>
                <img
                  src={lightboxUrl}
                  alt="Anexo ampliado"
                  className="max-w-full max-h-[90vh] object-contain"
                  style={S}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </>
        )}

        {/* Items */}
        <section className="border border-foreground/10 p-4 md:p-6 space-y-4" style={S}>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-foreground/10 pb-2">
            Itens do Orçamento
          </h2>

          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={S}>
                <thead>
                  <tr className="border-b border-foreground/10">
                    <th className="text-left py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descrição</th>
                    <th className="text-left py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Código</th>
                    <th className="text-center py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qtd</th>
                    <th className="text-right py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unit.</th>
                    <th className="text-right py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subtotal</th>
                    {!readOnly && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-foreground/5">
                      <td className="py-2 pr-2">{item.description}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{item.service_code || "—"}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2 text-right font-mono text-xs font-semibold">{formatCurrency(item.subtotal)}</td>
                      {!readOnly && (
                        <td className="py-2 text-right">
                          <button onClick={() => removeItemAt(idx)} className="p-1 text-red-500 hover:bg-red-500/10" style={S}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add item form */}
          {!readOnly && !showAddItemForm && (
            <div className="border-t border-foreground/10 pt-4">
              <button onClick={() => setShowAddItemForm(true)} className={btnOutline} style={S}>
                <Plus className="w-4 h-4" />
                Adicionar Item
              </button>
            </div>
          )}
          {!readOnly && showAddItemForm && (
            <ServiceOrderItemForm
              orderType="complete"
              onAddItem={handleAddItemFromForm}
              onCancel={() => setShowAddItemForm(false)}
            />
          )}
        </section>

        {/* Totals */}
        <section className="border border-foreground/10 p-4 md:p-6" style={S}>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-foreground/10 pb-2 mb-4">
            Resumo Financeiro
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={label}>Desconto (R$)</label>
              <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} min={0} step="0.01" className={input} style={S} disabled={readOnly} />
            </div>
            <div>
              <label className={label}>ISS (%)</label>
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} min={0} max={100} step="0.5" className={input} style={S} disabled={readOnly} />
            </div>
          </div>
          <div className="space-y-2 text-sm border-t border-foreground/10 pt-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto</span>
                <span className="font-mono text-red-500">- {formatCurrency(discount)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ISS ({taxRate}%)</span>
                <span className="font-mono">{formatCurrency(totals.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-foreground/20 pt-2">
              <span className="font-black uppercase tracking-wider">Total</span>
              <span className="font-mono font-black text-lg">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
