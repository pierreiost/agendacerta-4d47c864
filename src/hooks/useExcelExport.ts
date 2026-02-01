import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

export function useExcelExport() {
  const exportToExcel = <T extends Record<string, unknown>>(
    data: T[],
    columns: { key: keyof T; header: string; transform?: (value: unknown) => string | number }[],
    options: ExportOptions
  ) => {
    // Transform data to rows with headers
    const rows = data.map((item) =>
      columns.reduce((acc, col) => {
        const value = item[col.key];
        acc[col.header] = col.transform ? col.transform(value) : (value as string | number);
        return acc;
      }, {} as Record<string, string | number>)
    );

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = columns.map((col) => {
      const maxLength = Math.max(
        col.header.length,
        ...rows.map((row) => String(row[col.header] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = colWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Dados');

    // Generate filename with date
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `${options.filename}-${dateStr}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  };

  const exportCustomers = (
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
    exportToExcel(
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

  const exportServiceOrders = (
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

    // Build rows manually to handle the status correctly
    const rows = ordersWithBreakdown.map((order) => ({
      'Nº OS': order.order_number,
      'Cliente': order.customer_name,
      'Telefone': order.customer_phone || '-',
      'Descrição': order.description,
      'Tipo': order.order_type === 'simple' ? 'Simples' : 'Completa',
      'Status': getStatusLabel(order),
      'Qtd Itens': order.itemsCount,
      'Peças': formatCurrency(order.partsTotal),
      'Mão de Obra': formatCurrency(order.laborTotal),
      'Subtotal': formatCurrency(order.subtotal),
      'Desconto': formatCurrency(order.discount),
      'Total': formatCurrency(order.total),
      'Data Criação': format(new Date(order.created_at), 'dd/MM/yyyy'),
      'Data Conclusão': order.finished_at ? format(new Date(order.finished_at), 'dd/MM/yyyy') : '-',
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const headers = Object.keys(rows[0] || {});
    const colWidths = headers.map((header) => {
      const maxLength = Math.max(
        header.length,
        ...rows.map((row) => String(row[header as keyof typeof row] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = colWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordens de Serviço');

    // Generate filename with date
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(workbook, `ordens-servico-${dateStr}.xlsx`);
  };

  const exportServiceOrdersDetailed = (
    orders: {
      order_number: number;
      customer_name: string;
      description: string;
      total: number;
      created_at: string;
      items?: { description: string; quantity: number; unit_price: number; subtotal: number }[];
    }[]
  ) => {
    // Flatten orders with items for detailed export
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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

    exportToExcel(
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
