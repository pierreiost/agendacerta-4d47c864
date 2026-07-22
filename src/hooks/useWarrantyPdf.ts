import { useCallback } from "react";
import jsPDF from "jspdf";
import { useVenue } from "@/contexts/VenueContext";
import { maskPhone } from "@/lib/masks";

export type WarrantyPdfFormat = "a4" | "80mm";

export interface WarrantyItem {
  description: string;
  quantity: number;
  unit_price: number;
  warranty_days: number;
}

export interface WarrantyPdfData {
  orderNumber: number | string;
  cliente: string;
  equipamento: string;
  tecnico: string;
  dataEntrega: string; // display string dd/MM/yyyy
  clausulas: string;
  items: WarrantyItem[];
  total: number;
  observacoes?: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(v) && v > 0 ? v : 0
  );

export function useWarrantyPdf() {
  const { currentVenue } = useVenue();

  const generatePdf = useCallback(
    async (data: WarrantyPdfData, pdfFormat: WarrantyPdfFormat) => {
      const is80mm = pdfFormat === "80mm";
      const pageWidth = is80mm ? 80 : 210;
      const doc = new jsPDF({
        unit: "mm",
        format: is80mm ? [80, 297] : "a4",
      });

      const margin = is80mm ? 4 : 14;
      const contentWidth = pageWidth - margin * 2;
      const fontSize = is80mm ? 7 : 10;
      let yPos = is80mm ? 8 : 18;

      const pageHeight = doc.internal.pageSize.height;
      const ensureSpace = (needed: number) => {
        if (yPos + needed > pageHeight - (is80mm ? 10 : 20)) {
          doc.addPage();
          yPos = is80mm ? 8 : 18;
        }
      };

      // ========== HEADER (venue) ==========
      if (!is80mm && currentVenue?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = currentVenue.logo_url;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          doc.addImage(img, "PNG", margin, yPos - 4, 22, 22);
        } catch {
          // no-op
        }
      }

      const xOffset = !is80mm && currentVenue?.logo_url ? margin + 26 : margin;

      doc.setFontSize(is80mm ? 10 : 14);
      doc.setFont("helvetica", "bold");
      doc.text(
        currentVenue?.name || "Empresa",
        is80mm ? pageWidth / 2 : xOffset,
        yPos,
        is80mm ? { align: "center" } : undefined
      );

      doc.setFontSize(is80mm ? 6 : 8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90);

      if (currentVenue?.cnpj_cpf) {
        yPos += is80mm ? 4 : 5;
        doc.text(
          `CNPJ/CPF: ${currentVenue.cnpj_cpf}`,
          is80mm ? pageWidth / 2 : xOffset,
          yPos,
          is80mm ? { align: "center" } : undefined
        );
      }
      if (currentVenue?.address) {
        yPos += is80mm ? 3 : 4;
        const addrLines = doc.splitTextToSize(currentVenue.address, is80mm ? contentWidth : contentWidth - 30);
        doc.text(addrLines, is80mm ? pageWidth / 2 : xOffset, yPos, is80mm ? { align: "center" } : undefined);
        yPos += (addrLines.length - 1) * (is80mm ? 3 : 4);
      }
      const venuePhones = (currentVenue as { phones?: string[] } | null)?.phones;
      const phonesDisplay = venuePhones?.length
        ? venuePhones.map((p) => maskPhone(p)).join(" | ")
        : currentVenue?.phone
          ? maskPhone(currentVenue.phone)
          : null;
      if (phonesDisplay) {
        yPos += is80mm ? 3 : 4;
        doc.text(phonesDisplay, is80mm ? pageWidth / 2 : xOffset, yPos, is80mm ? { align: "center" } : undefined);
      }

      yPos += is80mm ? 5 : 8;
      doc.setDrawColor(180);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += is80mm ? 5 : 8;

      // ========== TITLE ==========
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(is80mm ? 9 : 13);
      doc.text("TERMO DE ENTREGA DE GARANTIA E SERVIÇO", pageWidth / 2, yPos, { align: "center" });
      yPos += is80mm ? 5 : 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      const thanksLines = doc.splitTextToSize(
        `Agradecemos pela confiança em nossos serviços. Este documento formaliza a entrega do equipamento e as condições de garantia referentes à OS #${data.orderNumber}.`,
        contentWidth
      );
      doc.text(thanksLines, margin, yPos);
      yPos += thanksLines.length * (is80mm ? 3.2 : 4.5) + (is80mm ? 3 : 4);

      // ========== INFO ATENDIMENTO ==========
      doc.setFont("helvetica", "bold");
      doc.setFontSize(is80mm ? 8 : 11);
      doc.text("Informações do Atendimento", margin, yPos);
      yPos += is80mm ? 4 : 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      const infoRows = [
        ["Cliente:", data.cliente || "—"],
        ["Equipamento:", data.equipamento || "—"],
        ["Técnico responsável:", data.tecnico || "—"],
        ["Data de entrega:", data.dataEntrega || "—"],
      ];
      for (const [label, value] of infoRows) {
        ensureSpace(is80mm ? 4 : 5);
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, yPos);
        doc.setFont("helvetica", "normal");
        const valueLines = doc.splitTextToSize(String(value), contentWidth - 40);
        doc.text(valueLines, margin + (is80mm ? 22 : 38), yPos);
        yPos += valueLines.length * (is80mm ? 3.2 : 5);
      }

      yPos += is80mm ? 3 : 4;

      // ========== CLÁUSULAS ==========
      ensureSpace(is80mm ? 6 : 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(is80mm ? 8 : 11);
      doc.text("Cláusulas de Garantia", margin, yPos);
      yPos += is80mm ? 4 : 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      const clausulaLines = doc.splitTextToSize(data.clausulas || "", contentWidth);
      const lineH = is80mm ? 3.2 : 4.6;
      for (const l of clausulaLines) {
        ensureSpace(lineH);
        doc.text(l, margin, yPos);
        yPos += lineH;
      }

      yPos += is80mm ? 3 : 5;

      // ========== ITENS ==========
      ensureSpace(is80mm ? 8 : 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(is80mm ? 8 : 11);
      doc.text("Resumo do Serviço Realizado", margin, yPos);
      yPos += is80mm ? 4 : 6;

      doc.setFontSize(is80mm ? 6 : 9);
      // header row
      const colX = is80mm
        ? { desc: margin, qty: margin + 30, val: margin + 42, war: margin + 58 }
        : { desc: margin, qty: margin + 90, val: margin + 110, war: margin + 145 };
      doc.setFont("helvetica", "bold");
      doc.text("Descrição", colX.desc, yPos);
      doc.text("Qtd", colX.qty, yPos, { align: "right" });
      doc.text("Valor", colX.val, yPos, { align: "right" });
      doc.text("Garantia", pageWidth - margin, yPos, { align: "right" });
      yPos += is80mm ? 2 : 3;
      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += is80mm ? 3 : 4;

      doc.setFont("helvetica", "normal");
      const items = data.items.length ? data.items : [{ description: "—", quantity: 0, unit_price: 0, warranty_days: 90 }];
      for (const item of items) {
        const descLines = doc.splitTextToSize(item.description || "—", (is80mm ? 28 : 85));
        const rowH = Math.max(descLines.length * lineH, lineH);
        ensureSpace(rowH + 1);
        doc.text(descLines, colX.desc, yPos);
        doc.text(String(item.quantity ?? 0), colX.qty, yPos, { align: "right" });
        doc.text(formatCurrency(Number(item.unit_price) * Number(item.quantity || 1)), colX.val, yPos, { align: "right" });
        doc.text(`${item.warranty_days ?? 90} dias`, pageWidth - margin, yPos, { align: "right" });
        yPos += rowH + 1;
      }

      yPos += is80mm ? 2 : 3;
      doc.setDrawColor(150);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += is80mm ? 4 : 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(is80mm ? 9 : 12);
      doc.text("VALOR TOTAL:", margin, yPos);
      doc.text(formatCurrency(data.total), pageWidth - margin, yPos, { align: "right" });
      yPos += is80mm ? 5 : 8;

      // ========== OBSERVAÇÕES ==========
      if (data.observacoes?.trim()) {
        ensureSpace(is80mm ? 8 : 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(is80mm ? 7 : 10);
        doc.text("Observações:", margin, yPos);
        yPos += is80mm ? 3.5 : 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fontSize);
        const obsLines = doc.splitTextToSize(data.observacoes, contentWidth);
        for (const l of obsLines) {
          ensureSpace(lineH);
          doc.text(l, margin, yPos);
          yPos += lineH;
        }
        yPos += is80mm ? 2 : 4;
      }

      // ========== BACKUP REMINDER ==========
      ensureSpace(is80mm ? 6 : 10);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(is80mm ? 6 : 8);
      doc.setTextColor(100);
      const reminder = doc.splitTextToSize(
        "Lembrete: mantenha sempre um backup atualizado dos seus dados. A empresa não se responsabiliza por perda de informações.",
        contentWidth
      );
      doc.text(reminder, margin, yPos);
      yPos += reminder.length * (is80mm ? 3 : 4) + (is80mm ? 4 : 8);

      // ========== SIGNATURES ==========
      doc.setTextColor(0);
      if (!is80mm) {
        const sigY = Math.max(yPos + 18, pageHeight - 40);
        if (sigY > pageHeight - 15) {
          doc.addPage();
          yPos = pageHeight - 40;
        } else {
          yPos = sigY;
        }
        const halfW = contentWidth / 2 - 10;
        doc.setDrawColor(0);
        doc.line(margin, yPos, margin + halfW, yPos);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Carimbo / Assinatura da Empresa", margin + halfW / 2, yPos + 5, { align: "center" });
        const rightX = margin + halfW + 20;
        doc.line(rightX, yPos, rightX + halfW, yPos);
        doc.text("Assinatura do Cliente", rightX + halfW / 2, yPos + 5, { align: "center" });
      } else {
        yPos += 6;
        doc.setDrawColor(0);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        doc.setFontSize(6);
        doc.text("Assinatura do Cliente", pageWidth / 2, yPos + 4, { align: "center" });
      }

      // ========== FOOTER ==========
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const ph = doc.internal.pageSize.height;
        doc.setFontSize(is80mm ? 5 : 7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        doc.text(
          `Documento gerado em ${new Date().toLocaleString("pt-BR")}`,
          pageWidth / 2,
          ph - (is80mm ? 3 : 6),
          { align: "center" }
        );
      }

      doc.save(`Termo-Garantia-OS-${data.orderNumber}.pdf`);
    },
    [currentVenue]
  );

  return { generatePdf };
}
