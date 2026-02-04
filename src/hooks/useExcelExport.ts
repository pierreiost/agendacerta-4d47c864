import ExcelJS from 'exceljs';
import { format } from 'date-fns';

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

export function useExcelExport() {
  const exportToExcel = async <T extends Record<string, unknown>>(
    data: T[],
    columns: { key: keyof T; header: string; transform?: (value: unknown) => string | number }[],
    options: ExportOptions
  ) => {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(options.sheetName || 'Dados');

    // Add headers
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: String(col.key),
      width: Math.min(col.header.length + 5, 50),
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    data.forEach((item) => {
      const rowData: Record<string, string | number> = {};
      columns.forEach((col) => {
        const value = item[col.key];
        rowData[String(col.key)] = col.transform ? col.transform(value) : (value as string | number) || '';
      });
      worksheet.addRow(rowData);
    });

    // Auto-size columns based on content
    worksheet.columns.forEach((column) => {
      let maxLength = column.header?.toString().length || 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellLength = cell.value?.toString().length || 0;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Generate filename with date
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `${options.filename}-${dateStr}.xlsx`;

    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportCustomers = async (
    customers: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      document: string | null;
      address: string | null;
      notes: string | null;
      created_at: string;
    }[]
  ) => {
    await exportToExcel(
      customers,
      [
        { key: 'name', header: 'Nome' },
        { key: 'email', header: 'E-mail', transform: (v) => (v as string) || '-' },
        { key: 'phone', header: 'Telefone', transform: (v) => (v as string) || '-' },
        { key: 'document', header: 'CPF/CNPJ', transform: (v) => (v as string) || '-' },
        { key: 'address', header: 'Endereço', transform: (v) => (v as string) || '-' },
        { key: 'notes', header: 'Observações', transform: (v) => (v as string) || '-' },
        {
          key: 'created_at',
          header: 'Data Cadastro',
          transform: (v) => format(new Date(v as string), 'dd/MM/yyyy'),
        },
      ],
      { filename: 'clientes', sheetName: 'Clientes' }
    );
  };

  const exportServiceOrders = async (
    orders: {
      order_number: number;
      customer_name: string;
      customer_phone: string | null;
      customer_email: string | null;
      description: string;
      order_type: string;
      status_simple: string | null;
      status_complete: string | null;
      subtotal: number;
      discount: number;
      tax_amount: number | null;
      total: number;
      created_at: string;
      finished_at: string | null;
      items?: { description: string; quantity: number; unit_price: number; subtotal: number }[];
    }[]
  ) => {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const getStatusLabel = (order: typeof orders[0]) => {
      if (order.order_type === 'simple') {
        const statusMap: Record<string, string> = {
          open: 'Aberta',
          finished: 'Finalizada',
          invoiced: 'Faturada',
        };
        return statusMap[order.status_simple || ''] || order.status_simple || '-';
      } else {
        const statusMap: Record<string, string> = {
          draft: 'Rascunho',
          approved: 'Aprovada',
          in_progress: 'Em Andamento',
          finished: 'Finalizada',
          invoiced: 'Faturada',
          cancelled: 'Cancelada',
        };
        return statusMap[order.status_complete || ''] || order.status_complete || '-';
      }
    };

    // Calculate items breakdown for each order
    const ordersWithBreakdown = orders.map((order) => {
      const items = order.items || [];
      const laborItems = items.filter((item) => {
        const desc = item.description.toLowerCase();
        return (
          desc.includes('mão de obra') ||
          desc.includes('serviço') ||
          desc.includes('instalação') ||
          desc.includes('manutenção')
        );
      });
      const partItems = items.filter((item) => !laborItems.includes(item));

      return {
        ...order,
        laborTotal: laborItems.reduce((sum, item) => sum + item.subtotal, 0),
        partsTotal: partItems.reduce((sum, item) => sum + item.subtotal, 0),
        itemsCount: items.length,
      };
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ordens de Serviço');

    // Define columns
    worksheet.columns = [
      { header: 'Nº OS', key: 'orderNumber', width: 10 },
      { header: 'Cliente', key: 'customer', width: 25 },
      { header: 'Telefone', key: 'phone', width: 15 },
      { header: 'Descrição', key: 'description', width: 30 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Qtd Itens', key: 'itemsCount', width: 10 },
      { header: 'Peças', key: 'parts', width: 15 },
      { header: 'Mão de Obra', key: 'labor', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Desconto', key: 'discount', width: 12 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Data Criação', key: 'createdAt', width: 15 },
      { header: 'Data Conclusão', key: 'finishedAt', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    ordersWithBreakdown.forEach((order) => {
      worksheet.addRow({
        orderNumber: order.order_number,
        customer: order.customer_name,
        phone: order.customer_phone || '-',
        description: order.description,
        type: order.order_type === 'simple' ? 'Simples' : 'Completa',
        status: getStatusLabel(order),
        itemsCount: order.itemsCount,
        parts: formatCurrency(order.partsTotal),
        labor: formatCurrency(order.laborTotal),
        subtotal: formatCurrency(order.subtotal),
        discount: formatCurrency(order.discount),
        total: formatCurrency(order.total),
        createdAt: format(new Date(order.created_at), 'dd/MM/yyyy'),
        finishedAt: order.finished_at ? format(new Date(order.finished_at), 'dd/MM/yyyy') : '-',
      });
    });

    // Download file
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ordens-servico-${dateStr}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportServiceOrdersDetailed = async (
    orders: {
      order_number: number;
      customer_name: string;
      description: string;
      total: number;
      created_at: string;
      items?: { description: string; quantity: number; unit_price: number; subtotal: number }[];
    }[]
  ) => {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    // Flatten orders with items for detailed export
    const flatData: {
      order_number: number;
      customer_name: string;
      order_description: string;
      item_description: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }[] = [];

    orders.forEach((order) => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          flatData.push({
            order_number: order.order_number,
            customer_name: order.customer_name,
            order_description: order.description,
            item_description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          });
        });
      } else {
        flatData.push({
          order_number: order.order_number,
          customer_name: order.customer_name,
          order_description: order.description,
          item_description: '(sem itens)',
          quantity: 0,
          unit_price: 0,
          subtotal: 0,
        });
      }
    });

    await exportToExcel(
      flatData,
      [
        { key: 'order_number', header: 'Nº OS' },
        { key: 'customer_name', header: 'Cliente' },
        { key: 'order_description', header: 'Descrição OS' },
        { key: 'item_description', header: 'Item' },
        { key: 'quantity', header: 'Qtd' },
        { key: 'unit_price', header: 'Preço Un.', transform: (v) => formatCurrency(v as number) },
        { key: 'subtotal', header: 'Subtotal', transform: (v) => formatCurrency(v as number) },
      ],
      { filename: 'os-detalhada', sheetName: 'Itens por OS' }
    );
  };

  return {
    exportToExcel,
    exportCustomers,
    exportServiceOrders,
    exportServiceOrdersDetailed,
  };
}
