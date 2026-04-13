import { useCallback } from "react";
import jsPDF from "jspdf";
import { useVenue } from "@/contexts/VenueContext";
import { maskPhone } from "@/lib/masks";
import type { ServiceOrder } from "@/hooks/useServiceOrders";

type PdfFormat = "a4" | "80mm";

export function useWarrantyPdf() {
  const { currentVenue } = useVenue();

  const generatePdf = useCallback(
    async (
      processedText: string,
      order: ServiceOrder,
      extraNotes: string,
      pdfFormat: PdfFormat
    ) => {
      const is80mm = pdfFormat === "80mm";
      const pageWidth = is80mm ? 80 : 210;
      const doc = new jsPDF({
        unit: "mm",
        format: is80mm ? [80, 297] : "a4",
      });

      const margin = is80mm ? 4 : 14;
      const contentWidth = pageWidth - margin * 2;
      const fontSize = is80mm ? 7 : 10;
      let yPos = is80mm ? 8 : 20;

      // ========== HEADER ==========
      if (!is80mm && currentVenue?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = currentVenue.logo_url;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          doc.addImage(img, "PNG", margin, yPos - 5, 25, 25);
          yPos += 5;
        } catch {
          // logo not available
        }
      }

      const xOffset = !is80mm && currentVenue?.logo_url ? 45 : margin;

      doc.setFontSize(is80mm ? 10 : 16);
      doc.setFont("helvetica", "bold");
      doc.text(currentVenue?.name || "Empresa", is80mm ? pageWidth / 2 : xOffset, yPos, is80mm ? { align: "center" } : undefined);

      doc.setFontSize(is80mm ? 6 : 8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);

      if (currentVenue?.cnpj_cpf) {
        yPos += is80mm ? 4 : 6;
        doc.text(`CNPJ/CPF: ${currentVenue.cnpj_cpf}`, is80mm ? pageWidth / 2 : xOffset, yPos, is80mm ? { align: "center" } : undefined);
      }

      if (currentVenue?.address) {
        yPos += is80mm ? 3 : 5;
        const addrLines = doc.splitTextToSize(currentVenue.address, contentWidth);
        doc.text(addrLines, is80mm ? pageWidth / 2 : xOffset, yPos, is80mm ? { align: "center" } : undefined);
        yPos += (addrLines.length - 1) * (is80mm ? 3 : 4);
      }

      const venuePhones = (currentVenue as { phones?: string[] } | null)?.phones;
      const phonesDisplay = venuePhones?.length
        ? venuePhones.map((p: string) => maskPhone(p)).join(" | ")
        : currentVenue?.phone
          ? maskPhone(currentVenue.phone)
          : null;

      if (phonesDisplay) {
        yPos += is80mm ? 3 : 5;
        doc.text(phonesDisplay, is80mm ? pageWidth / 2 : xOffset, yPos, is80mm ? { align: "center" } : undefined);
      }

      // Separator
      yPos += is80mm ? 5 : 10;
      doc.setDrawColor(180);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += is80mm ? 5 : 10;

      // ========== BODY ==========
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);

      const lines = doc.splitTextToSize(processedText, contentWidth);
      const lineHeight = is80mm ? 3.2 : 5;
      const pageHeight = doc.internal.pageSize.height;

      for (const line of lines) {
        if (yPos + lineHeight > pageHeight - (is80mm ? 10 : 30)) {
          doc.addPage();
          yPos = is80mm ? 8 : 20;
        }
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      }

      // Extra notes
      if (extraNotes.trim()) {
        yPos += lineHeight;
        if (yPos + lineHeight * 3 > pageHeight - (is80mm ? 10 : 30)) {
          doc.addPage();
          yPos = is80mm ? 8 : 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text("Observações adicionais:", margin, yPos);
        yPos += lineHeight;
        doc.setFont("helvetica", "normal");
        const noteLines = doc.splitTextToSize(extraNotes, contentWidth);
        for (const nl of noteLines) {
          if (yPos + lineHeight > pageHeight - (is80mm ? 10 : 30)) {
            doc.addPage();
            yPos = is80mm ? 8 : 20;
          }
          doc.text(nl, margin, yPos);
          yPos += lineHeight;
        }
      }

      // ========== SIGNATURE FIELDS ==========
      if (!is80mm) {
        const sigY = Math.max(yPos + 25, pageHeight - 60);
        if (sigY > pageHeight - 20) {
          doc.addPage();
          yPos = 80;
        } else {
          yPos = sigY;
        }

        const halfW = contentWidth / 2 - 10;
        // Company
        doc.setDrawColor(0);
        doc.line(margin, yPos, margin + halfW, yPos);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Carimbo/Assinatura da Empresa", margin + halfW / 2, yPos + 5, { align: "center" });

        // Client
        const rightX = margin + halfW + 20;
        doc.line(rightX, yPos, rightX + halfW, yPos);
        doc.text("Assinatura do Cliente", rightX + halfW / 2, yPos + 5, { align: "center" });
      } else {
        yPos += 10;
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
          ph - (is80mm ? 3 : 8),
          { align: "center" }
        );
      }

      doc.save(`Termo-Garantia-OS-${order.order_number}.pdf`);
    },
    [currentVenue]
  );

  return { generatePdf };
}
