import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookings } from '@/hooks/useBookings';
import { useSpaces } from '@/hooks/useSpaces';
import { useCustomers } from '@/hooks/useCustomers';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { useVenue } from '@/contexts/VenueContext';
import { useExcelExport } from '@/hooks/useExcelExport';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  parseISO,
  getHours,
  differenceInHours,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileDown, Loader2, TrendingUp, Users, DollarSign, Clock, FileSpreadsheet, Package, Wrench } from 'lucide-react';
import jsPDF from 'jspdf';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Relatorios() {
  const { currentVenue } = useVenue();
  const { spaces } = useSpaces();
  const { customers } = useCustomers();
  const { orders } = useServiceOrders();
  const { exportCustomers, exportServiceOrders, exportServiceOrdersDetailed } = useExcelExport();
  const [period, setPeriod] = useState('current');

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === 'current') {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    } else if (period === 'last') {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    } else {
      return { start: subMonths(now, 3), end: now };
    }
  }, [period]);

  const { bookings, isLoading } = useBookings(dateRange.start, dateRange.end);

  const stats = useMemo(() => {
    const finalizedBookings = bookings.filter(b => b.status === 'FINALIZED');
    const totalRevenue = finalizedBookings.reduce((sum, b) => sum + Number(b.grand_total || 0), 0);
    const totalBookings = bookings.filter(b => b.status !== 'CANCELLED').length;
    const totalHours = bookings.filter(b => b.status !== 'CANCELLED').reduce((sum, b) => {
      return sum + differenceInHours(parseISO(b.end_time), parseISO(b.start_time));
    }, 0);
    const uniqueCustomers = new Set(bookings.map(b => b.customer_name.toLowerCase())).size;

    return { totalRevenue, totalBookings, totalHours, uniqueCustomers };
  }, [bookings]);

  // OS Stats
  const osStats = useMemo(() => {
    const filtered = orders.filter((o) => {
      const createdAt = new Date(o.created_at);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });

    const total = filtered.length;
    const totalRevenue = filtered.reduce((sum, o) => sum + Number(o.total || 0), 0);
    
    // Calculate parts vs labor
    let partsTotal = 0;
    let laborTotal = 0;
    
    filtered.forEach((order) => {
      const items = order.items || [];
      items.forEach((item) => {
        const desc = item.description.toLowerCase();
        const isLabor =
          desc.includes('mão de obra') ||
          desc.includes('serviço') ||
          desc.includes('instalação') ||
          desc.includes('manutenção') ||
          desc.includes('limpeza') ||
          desc.includes('reparo');
        
        if (isLabor) {
          laborTotal += Number(item.subtotal);
        } else {
          partsTotal += Number(item.subtotal);
        }
      });
    });

    const openCount = filtered.filter(
      (o) => o.status_simple === 'open' || o.status_complete === 'draft' || o.status_complete === 'in_progress'
    ).length;

    const finishedCount = filtered.filter(
      (o) => o.status_simple === 'finished' || o.status_complete === 'finished' || o.status_simple === 'invoiced' || o.status_complete === 'invoiced'
    ).length;

    return { total, totalRevenue, partsTotal, laborTotal, openCount, finishedCount };
  }, [orders, dateRange]);

  const revenueBySpace = useMemo(() => {
    const data: Record<string, number> = {};
    bookings.filter(b => b.status === 'FINALIZED').forEach(b => {
      const spaceName = b.space?.name || 'Outro';
      data[spaceName] = (data[spaceName] || 0) + Number(b.grand_total || 0);
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [bookings]);

  const bookingsByHour = useMemo(() => {
    const hours = Array.from({ length: 18 }, (_, i) => ({
      hour: `${(i + 6).toString().padStart(2, '0')}:00`,
      count: 0,
    }));

    bookings.filter(b => b.status !== 'CANCELLED').forEach(b => {
      const startHour = getHours(parseISO(b.start_time));
      const endHour = getHours(parseISO(b.end_time));
      for (let h = startHour; h < endHour; h++) {
        if (h >= 6 && h < 24) {
          hours[h - 6].count++;
        }
      }
    });

    return hours;
  }, [bookings]);

  const topCustomers = useMemo(() => {
    const data: Record<string, { count: number; revenue: number }> = {};
    bookings.filter(b => b.status === 'FINALIZED').forEach(b => {
      const name = b.customer_name;
      if (!data[name]) data[name] = { count: 0, revenue: 0 };
      data[name].count++;
      data[name].revenue += Number(b.grand_total || 0);
    });
    return Object.entries(data)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [bookings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Relatório - ' + currentVenue?.name, 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Período: ${format(dateRange.start, "dd/MM/yyyy")} - ${format(dateRange.end, "dd/MM/yyyy")}`, 20, 30);
    
    doc.setFontSize(14);
    doc.text('Resumo', 20, 45);
    
    doc.setFontSize(11);
    doc.text(`Faturamento Total: ${formatCurrency(stats.totalRevenue)}`, 20, 55);
    doc.text(`Total de Reservas: ${stats.totalBookings}`, 20, 62);
    doc.text(`Horas Ocupadas: ${stats.totalHours}h`, 20, 69);
    doc.text(`Clientes Únicos: ${stats.uniqueCustomers}`, 20, 76);
    
    if (revenueBySpace.length > 0) {
      doc.setFontSize(14);
      doc.text('Faturamento por Espaço', 20, 90);
      
      doc.setFontSize(11);
      revenueBySpace.forEach((item, i) => {
        doc.text(`${item.name}: ${formatCurrency(item.value)}`, 20, 100 + (i * 7));
      });
    }
    
    if (topCustomers.length > 0) {
      const yOffset = 100 + (revenueBySpace.length * 7) + 15;
      doc.setFontSize(14);
      doc.text('Top Clientes', 20, yOffset);
      
      doc.setFontSize(11);
      topCustomers.forEach((customer, i) => {
        doc.text(
          `${customer.name}: ${customer.count} reservas - ${formatCurrency(customer.revenue)}`,
          20,
          yOffset + 10 + (i * 7)
        );
      });
    }
    
    doc.save(`relatorio-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportCustomers = () => {
    exportCustomers(customers);
  };

  const handleExportOrders = () => {
    const filteredOrders = orders.filter((o) => {
      const createdAt = new Date(o.created_at);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });
    exportServiceOrders(filteredOrders);
  };

  const handleExportOrdersDetailed = () => {
    const filteredOrders = orders.filter((o) => {
      const createdAt = new Date(o.created_at);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });
    exportServiceOrdersDetailed(filteredOrders);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">
              Análise de desempenho e faturamento
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Mês Atual</SelectItem>
                <SelectItem value="last">Mês Anterior</SelectItem>
                <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horas Ocupadas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHours}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueCustomers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Faturamento</TabsTrigger>
            <TabsTrigger value="occupancy">Ocupação</TabsTrigger>
            <TabsTrigger value="customers">Clientes</TabsTrigger>
            <TabsTrigger value="os">Ordens de Serviço</TabsTrigger>
            <TabsTrigger value="exports">Exportações</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle>Faturamento por Espaço</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueBySpace.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Sem dados para o período selecionado
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenueBySpace}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {revenueBySpace.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="occupancy">
            <Card>
              <CardHeader>
                <CardTitle>Ocupação por Horário</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bookingsByHour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" name="Reservas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                {topCustomers.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Sem dados para o período selecionado
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topCustomers.map((customer, index) => (
                      <div
                        key={customer.name}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full text-white font-bold"
                            style={{ backgroundColor: COLORS[index] }}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {customer.count} reserva(s)
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-primary">
                          {formatCurrency(customer.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="os">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total OS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{osStats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {osStats.openCount} abertas • {osStats.finishedCount} finalizadas
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Faturamento OS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(osStats.totalRevenue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    Peças/Produtos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(osStats.partsTotal)}</div>
                  <p className="text-xs text-muted-foreground">
                    {osStats.totalRevenue > 0
                      ? `${((osStats.partsTotal / osStats.totalRevenue) * 100).toFixed(0)}% do total`
                      : '-'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-orange-500" />
                    Mão de Obra
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(osStats.laborTotal)}</div>
                  <p className="text-xs text-muted-foreground">
                    {osStats.totalRevenue > 0
                      ? `${((osStats.laborTotal / osStats.totalRevenue) * 100).toFixed(0)}% do total`
                      : '-'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Parts vs Labor Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição: Peças vs Mão de Obra</CardTitle>
              </CardHeader>
              <CardContent>
                {osStats.totalRevenue === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Sem dados para o período selecionado
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Peças/Produtos', value: osStats.partsTotal },
                          { name: 'Mão de Obra', value: osStats.laborTotal },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#f97316" />
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exports">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Export Customers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Clientes
                  </CardTitle>
                  <CardDescription>
                    Exportar lista completa de clientes cadastrados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>{customers.length}</strong> clientes cadastrados
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inclui: Nome, E-mail, Telefone, CPF/CNPJ, Endereço
                    </p>
                  </div>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button onClick={handleExportCustomers} className="w-full">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </Button>
                </div>
              </Card>

              {/* Export OS Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    OS - Resumo
                  </CardTitle>
                  <CardDescription>
                    Exportar ordens de serviço do período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>{osStats.total}</strong> ordens no período
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inclui: Cliente, Status, Peças, Mão de Obra, Total
                    </p>
                  </div>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button onClick={handleExportOrders} className="w-full">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </Button>
                </div>
              </Card>

              {/* Export OS Detailed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    OS - Detalhada
                  </CardTitle>
                  <CardDescription>
                    Exportar com todos os itens de cada OS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Uma linha por item de cada OS
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inclui: Nº OS, Cliente, Item, Qtd, Preço, Subtotal
                    </p>
                  </div>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button onClick={handleExportOrdersDetailed} className="w-full" variant="outline">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
