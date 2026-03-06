import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileDown, Pencil, Trash2, Check, X, Loader2, Eye, EyeOff } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuotes, type Quote } from "@/hooks/useQuotes";
import { useQuotePdf } from "@/hooks/useQuotePdf";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusMap: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "PENDENTE", bg: "bg-amber-400/20", text: "text-amber-700 dark:text-amber-300" },
  approved: { label: "APROVADO", bg: "bg-emerald-400/20", text: "text-emerald-700 dark:text-emerald-300" },
  rejected: { label: "REJEITADO", bg: "bg-neutral-400/20", text: "text-neutral-500 dark:text-neutral-400" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function Orcamentos() {
  const navigate = useNavigate();
  const { quotes, isLoading, deleteQuote, approveQuote, rejectQuote, getQuoteItems } = useQuotes();
  const { generatePdf } = useQuotePdf();
  const { toast } = useToast();

  const [showRejected, setShowRejected] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = showRejected ? quotes : quotes.filter((q) => q.status !== "rejected");

  const handleApprove = async (q: Quote) => {
    setApprovingId(q.id);
    try {
      const osId = await approveQuote(q.id);
      navigate(`/ordens-servico/${osId}`);
    } catch {
      toast({ title: "Erro ao aprovar", variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (q: Quote) => {
    try {
      await rejectQuote(q.id);
    } catch {
      toast({ title: "Erro ao rejeitar", variant: "destructive" });
    }
  };

  const handlePdf = async (q: Quote) => {
    setDownloadingId(q.id);
    try {
      const items = await getQuoteItems(q.id);
      await generatePdf(q, items);
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = () => {
    if (deleteId) deleteQuote(deleteId);
    setDeleteId(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              Orçamentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1 tracking-wide">
              Pré-OS — Aprove para gerar Ordem de Serviço
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRejected(!showRejected)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider border border-foreground/20 bg-background text-foreground hover:bg-muted transition-colors"
              style={{ borderRadius: 0 }}
            >
              {showRejected ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showRejected ? "Ocultar Rejeitados" : "Mostrar Rejeitados"}
            </button>
            <button
              onClick={() => navigate("/orcamentos/novo")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-colors"
              style={{ borderRadius: 0 }}
            >
              <Plus className="w-4 h-4" />
              Novo Orçamento
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border border-foreground/10 overflow-hidden" style={{ borderRadius: 0 }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10 bg-muted/50">
                    <th className="text-left px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Nº</th>
                    <th className="text-left px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-muted-foreground hidden md:table-cell">Descrição</th>
                    <th className="text-left px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Total</th>
                    <th className="text-left px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-muted-foreground hidden sm:table-cell">Data</th>
                    <th className="text-right px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                        Nenhum orçamento encontrado
                      </td>
                    </tr>
                  ) : (
                    filtered.map((q) => {
                      const s = statusMap[q.status];
                      return (
                        <tr
                          key={q.id}
                          className="border-b border-foreground/5 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/orcamentos/${q.id}`)}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-xs">
                            ORC-{String(q.quote_number).padStart(3, "0")}
                          </td>
                          <td className="px-4 py-3 font-medium">{q.customer_name}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground hidden md:table-cell">
                            {q.description || q.device_model || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}
                              style={{ borderRadius: 0 }}
                            >
                              {s.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                            {formatCurrency(Number(q.total))}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                            {format(new Date(q.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {q.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(q)}
                                    disabled={approvingId === q.id}
                                    className="p-1.5 hover:bg-emerald-500/10 text-emerald-600 transition-colors"
                                    style={{ borderRadius: 0 }}
                                    title="Aprovar"
                                  >
                                    {approvingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => handleReject(q)}
                                    className="p-1.5 hover:bg-red-500/10 text-red-500 transition-colors"
                                    style={{ borderRadius: 0 }}
                                    title="Rejeitar"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handlePdf(q)}
                                disabled={downloadingId === q.id}
                                className="p-1.5 hover:bg-muted transition-colors"
                                style={{ borderRadius: 0 }}
                                title="PDF"
                              >
                                {downloadingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => navigate(`/orcamentos/${q.id}`)}
                                className="p-1.5 hover:bg-muted transition-colors"
                                style={{ borderRadius: 0 }}
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {q.status !== "approved" && (
                                <button
                                  onClick={() => setDeleteId(q.id)}
                                  className="p-1.5 hover:bg-red-500/10 text-red-500 transition-colors"
                                  style={{ borderRadius: 0 }}
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete confirmation - custom, no shadcn */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background border border-foreground/10 p-6 max-w-sm w-full mx-4 space-y-4" style={{ borderRadius: 0 }}>
              <h3 className="text-lg font-bold">Excluir Orçamento</h3>
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 text-sm font-medium border border-foreground/20 hover:bg-muted transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
