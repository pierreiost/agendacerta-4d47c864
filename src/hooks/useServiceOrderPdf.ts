import { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useVenue } from '@/contexts/VenueContext';
import { ServiceOrder, ServiceOrderItem } from '@/hooks/useServiceOrders';
import { useOSCustomFields } from '@/hooks/useOSCustomFields';
import { maskPhone } from '@/lib/masks';

export function useServiceOrderPdf() {
  const { currentVenue } = useVenue();
  const { activeFields } = useOSCustomFields();

  const generatePdf = useCallback(
    async (order: ServiceOrder, items: ServiceOrderItem[]) => {
      const doc = new jsPDF();

      const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);

      const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('pt-BR');

      // ========== HEADER - Company Info ==========
      let yPos = 20;

      // Logo (if available)
      if (currentVenue?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = currentVenue.logo_url;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          doc.addImage(img, 'PNG', 14, yPos - 5, 30, 30);
          yPos += 5;
        } catch (err) {
          console.warn('Could not load logo for PDF:', err);
        }
      }

      // Company name
      const xOffset = currentVenue?.logo_url ? 50 : 14;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(currentVenue?.name || 'Empresa', xOffset, yPos);

      // Company details
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);

      if (currentVenue?.cnpj_cpf) {
        yPos += 6;
        doc.text(`CNPJ/CPF: ${currentVenue.cnpj_cpf}`, xOffset, yPos);
      }

      if (currentVenue?.address) {
        yPos += 5;
        doc.text(currentVenue.address, xOffset, yPos);
      }

      // Get phones from array with fallback to legacy phone field
      const venuePhones = (currentVenue as { phones?: string[] } | null)?.phones;
      const phonesDisplay = venuePhones?.length
        ? venuePhones.map((p: string) => maskPhone(p)).join(' | ')
        : currentVenue?.phone
          ? maskPhone(currentVenue.phone)
          : null;

      const contactParts = [phonesDisplay, currentVenue?.email].filter(Boolean);
      if (contactParts.length > 0) {
        yPos += 5;
        doc.text(contactParts.join(' | '), xOffset, yPos);
      }

      // Order number and date (right side)
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text(`OS #${order.order_number}`, 196, 20, { align: 'right' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Emissão: ${formatDate(order.created_at)}`, 196, 27, {
        align: 'right',
      });

      if (order.finished_at) {
        doc.text(`Finalização: ${formatDate(order.finished_at)}`, 196, 33, {
          align: 'right',
        });
      }

      // Horizontal line
      yPos = Math.max(yPos, 45) + 10;
      doc.setDrawColor(200);
      doc.line(14, yPos, 196, yPos);
      yPos += 10;

      // ========== CLIENT INFO ==========
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('DADOS DO CLIENTE', 14, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const clientInfo = [
        { label: 'Nome', value: order.customer_name },
        { label: 'CPF/CNPJ', value: order.customer_document },
        { label: 'E-mail', value: order.customer_email },
        { label: 'Telefone', value: order.customer_phone },
      ].filter((item) => item.value);

      const addressParts = [
        order.customer_address,
        order.customer_city,
        order.customer_state,
        order.customer_zip_code,
      ].filter(Boolean);

      if (addressParts.length > 0) {
        clientInfo.push({ label: 'Endereço', value: addressParts.join(', ') });
      }

      clientInfo.forEach((item) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.label}: `, 14, yPos);
        const labelWidth = doc.getTextWidth(`${item.label}: `);
        doc.setFont('helvetica', 'normal');
        doc.text(item.value || '', 14 + labelWidth, yPos);
        yPos += 5;
      });

      yPos += 5;

      // ========== SERVICE DESCRIPTION ==========
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIÇÃO DO SERVIÇO', 14, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(order.description, 180);
      doc.text(descLines, 14, yPos);
      yPos += descLines.length * 5 + 5;

      if (order.notes) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        const noteLines = doc.splitTextToSize(`Obs: ${order.notes}`, 180);
        doc.text(noteLines, 14, yPos);
        yPos += noteLines.length * 5 + 5;
        doc.setTextColor(0);
      }

      yPos += 5;

      // ========== ITEMS TABLE ==========
      if (items.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('ITENS DO SERVIÇO', 14, yPos);
        yPos += 5;

        const tableData = items.map((item) => [
          item.description,
          order.order_type === 'complete' ? item.service_code || '-' : '',
          item.quantity.toString(),
          formatCurrency(Number(item.unit_price)),
          formatCurrency(Number(item.subtotal)),
        ]);

        const columns =
          order.order_type === 'complete'
            ? ['Descrição', 'Código', 'Qtd', 'Valor Unit.', 'Subtotal']
            : ['Descrição', '', 'Qtd', 'Valor Unit.', 'Subtotal'];

        autoTable(doc, {
          startY: yPos,
          head: [columns.filter(Boolean)],
          body: tableData.map((row) =>
            order.order_type === 'complete' ? row : [row[0], row[2], row[3], row[4]]
          ),
          theme: 'striped',
          headStyles: {
            fillColor: [66, 66, 66],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 9,
          },
          columnStyles: order.order_type === 'complete'
            ? {
                0: { cellWidth: 70 },
                1: { cellWidth: 25 },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 35, halign: 'right' },
                4: { cellWidth: 35, halign: 'right' },
              }
            : {
                0: { cellWidth: 95 },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 35, halign: 'right' },
                3: { cellWidth: 35, halign: 'right' },
              },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // ========== TOTALS ==========
      const totalsX = 140;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      doc.text('Subtotal:', totalsX, yPos);
      doc.text(formatCurrency(Number(order.subtotal)), 196, yPos, { align: 'right' });
      yPos += 6;

      if (Number(order.discount) > 0) {
        doc.text('Desconto:', totalsX, yPos);
        doc.text(`- ${formatCurrency(Number(order.discount))}`, 196, yPos, {
          align: 'right',
        });
        yPos += 6;
      }

      if (order.order_type === 'complete' && Number(order.tax_rate) > 0) {
        // tax_rate is stored as decimal (0.05), display as percentage (5%)
        const taxRatePercent = Number(order.tax_rate) * 100;
        doc.text(`ISS (${taxRatePercent.toFixed(0)}%):`, totalsX, yPos);
        doc.text(formatCurrency(Number(order.tax_amount)), 196, yPos, {
          align: 'right',
        });
        yPos += 6;
      }

      // Total line
      doc.setDrawColor(66);
      doc.line(totalsX - 5, yPos, 196, yPos);
      yPos += 8;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', totalsX, yPos);
      doc.text(formatCurrency(Number(order.total)), 196, yPos, { align: 'right' });

      // ========== CUSTOM FIELDS (TERMOS E CONDIÇÕES) ==========
      if (activeFields.length > 0) {
        yPos += 15;
        const pageHeight = doc.internal.pageSize.height;

        // Section header
        if (yPos + 20 > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('TERMOS E CONDIÇÕES', 14, yPos);
        yPos += 7;

        doc.setFontSize(9);
        for (const field of activeFields) {
          doc.setFont('helvetica', field.is_bold ? 'bold' : 'normal');
          doc.setTextColor(60);
          const lines = doc.splitTextToSize(field.content, 180);
          const blockHeight = lines.length * 4.5;

          if (yPos + blockHeight > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }

          doc.text(lines, 14, yPos);
          yPos += blockHeight + 4;
        }
      }

      // ========== FOOTER ==========
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text(
          `Documento gerado em ${new Date().toLocaleString('pt-BR')}`,
          105,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      doc.save(`OS-${order.order_number}.pdf`);
    },
    [currentVenue, activeFields]
  );

  return { generatePdf };
}
