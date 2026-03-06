import { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useVenue } from '@/contexts/VenueContext';
import { Quote, QuoteItem } from '@/hooks/useQuotes';
import { maskPhone } from '@/lib/masks';

export function useQuotePdf() {
  const { currentVenue } = useVenue();

  const generatePdf = useCallback(
    async (quote: Quote, items: QuoteItem[]) => {
      const doc = new jsPDF();

      const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
      const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

      let yPos = 20;

      // Logo
      if (currentVenue?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = currentVenue.logo_url;
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
          doc.addImage(img, 'PNG', 14, yPos - 5, 30, 30);
          yPos += 5;
        } catch { /* skip logo */ }
      }

      const xOffset = currentVenue?.logo_url ? 50 : 14;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(currentVenue?.name || 'Empresa', xOffset, yPos);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      if (currentVenue?.cnpj_cpf) { yPos += 6; doc.text(`CNPJ/CPF: ${currentVenue.cnpj_cpf}`, xOffset, yPos); }
      if (currentVenue?.address) { yPos += 5; doc.text(currentVenue.address, xOffset, yPos); }

      const venuePhones = (currentVenue as any)?.phones;
      const phonesDisplay = venuePhones?.length
        ? venuePhones.map((p: string) => maskPhone(p)).join(' | ')
        : currentVenue?.phone ? maskPhone(currentVenue.phone) : null;
      const contactParts = [phonesDisplay, currentVenue?.email].filter(Boolean);
      if (contactParts.length > 0) { yPos += 5; doc.text(contactParts.join(' | '), xOffset, yPos); }

      // Quote number (right)
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text('ORÇAMENTO', 196, 20, { align: 'right' });

      doc.setFontSize(12);
      doc.text(`ORC-${String(quote.quote_number).padStart(3, '0')}`, 196, 28, { align: 'right' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Data: ${formatDate(quote.created_at)}`, 196, 35, { align: 'right' });

      // Line
      yPos = Math.max(yPos, 45) + 10;
      doc.setDrawColor(200);
      doc.line(14, yPos, 196, yPos);
      yPos += 10;

      // Client
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('DADOS DO CLIENTE', 14, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const clientInfo = [
        { label: 'Nome', value: quote.customer_name },
        { label: 'CPF/CNPJ', value: quote.customer_document },
        { label: 'E-mail', value: quote.customer_email },
        { label: 'Telefone', value: quote.customer_phone },
      ].filter((i) => i.value);

      if (quote.device_model) clientInfo.push({ label: 'Equipamento', value: quote.device_model });

      const addressParts = [quote.customer_address, quote.customer_city, quote.customer_state, quote.customer_zip_code].filter(Boolean);
      if (addressParts.length > 0) clientInfo.push({ label: 'Endereço', value: addressParts.join(', ') });

      clientInfo.forEach((item) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.label}: `, 14, yPos);
        const lw = doc.getTextWidth(`${item.label}: `);
        doc.setFont('helvetica', 'normal');
        doc.text(item.value || '', 14 + lw, yPos);
        yPos += 5;
      });
      yPos += 5;

      // Description
      if (quote.description) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIÇÃO', 14, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(quote.description, 180);
        doc.text(descLines, 14, yPos);
        yPos += descLines.length * 5 + 5;
      }

      if (quote.notes) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        const noteLines = doc.splitTextToSize(`Obs: ${quote.notes}`, 180);
        doc.text(noteLines, 14, yPos);
        yPos += noteLines.length * 5 + 5;
        doc.setTextColor(0);
      }
      yPos += 5;

      // Items table
      if (items.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('ITENS', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Descrição', 'Código', 'Qtd', 'Valor Unit.', 'Subtotal']],
          body: items.map((item) => [
            item.description,
            item.service_code || '-',
            item.quantity.toString(),
            formatCurrency(Number(item.unit_price)),
            formatCurrency(Number(item.subtotal)),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [40, 40, 40], textColor: 255, fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 25 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' },
          },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Totals
      const totalsX = 140;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', totalsX, yPos);
      doc.text(formatCurrency(Number(quote.subtotal)), 196, yPos, { align: 'right' });
      yPos += 6;

      if (Number(quote.discount) > 0) {
        doc.text('Desconto:', totalsX, yPos);
        doc.text(`- ${formatCurrency(Number(quote.discount))}`, 196, yPos, { align: 'right' });
        yPos += 6;
      }

      if (Number(quote.tax_rate) > 0) {
        const pct = Number(quote.tax_rate) * 100;
        doc.text(`ISS (${pct.toFixed(0)}%):`, totalsX, yPos);
        doc.text(formatCurrency(Number(quote.tax_amount)), 196, yPos, { align: 'right' });
        yPos += 6;
      }

      doc.setDrawColor(66);
      doc.line(totalsX - 5, yPos, 196, yPos);
      yPos += 8;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', totalsX, yPos);
      doc.text(formatCurrency(Number(quote.total)), 196, yPos, { align: 'right' });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text(`Orçamento gerado em ${new Date().toLocaleString('pt-BR')} — Validade: 30 dias`, 105, pageHeight - 10, { align: 'center' });
      }

      doc.save(`ORC-${String(quote.quote_number).padStart(3, '0')}.pdf`);
    },
    [currentVenue]
  );

  return { generatePdf };
}
