import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVenue } from '@/contexts/VenueContext';
import { useExcelExport } from '@/hooks/useExcelExport';
import { useReportsData } from '@/hooks/useReportsData';
import { getClientLabel, getClientsLabel } from '@/lib/segment-utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import {
  FileDown, Loader2, TrendingUp, Users, DollarSign, Clock,
  FileSpreadsheet, Package, Wrench, Scissors, Heart, Calendar,
} from 'lucide-react';
import jsPDF from 'jspdf';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export default function Relatorios() {
  const { currentVenue } = useVenue();
  const { exportCustomers, exportServiceOrders, exportServiceOrdersDetailed, exportToExcel } = useExcelExport();
  const [period, setPeriod] = useState('current');
  const [activeTab, setActiveTab] = useState('revenue');

  const segment = currentVenue?.segment || 'sports';

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === 'current') return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === 'last') {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm) };
    }
    return { start: subMonths(now, 3), end: now };
  }, [period]);

  const data = useReportsData(dateRange);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Labels based on segment
  const clientLabel = getClientLabel(segment, true);
  const clientsLabel = getClientsLabel(segment, true);
  const activityLabel = segment === 'health' ? 'Consultas' : segment === 'beauty' ? 'Atendimentos' : segment === 'custom' ? 'OS' : 'Reservas';
  const activitySingular = segment === 'health' ? 'consulta(s)' : segment === 'beauty' ? 'atendimento(s)' : segment === 'custom' ? 'OS' : 'reserva(s)';

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Relatório - ' + (currentVenue?.name || ''), 20, 20);
    doc.setFontSize(12);
    doc.text(`Período: ${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`, 20, 30);
    doc.setFontSize(14);
    doc.text('Resumo', 20, 45);
    doc.setFontSize(11);

    if (segment === 'custom') {
      doc.text(`Faturamento OS: ${formatCurrency(data.osStats.totalRevenue)}`, 20, 55);
      doc.text(`Total OS: ${data.osStats.total}`, 20, 62);
      doc.text(`Finalizadas: ${data.osStats.finishedCount}`, 20, 69);
      doc.text(`Ticket Médio: ${formatCurrency(data.osStats.ticketMedio)}`, 20, 76);
    } else if (segment === 'beauty' || segment === 'health') {
      doc.text(`Faturamento: ${formatCurrency(data.serviceStats.totalRevenue)}`, 20, 55);
      doc.text(`${activityLabel}: ${data.serviceStats.totalAppointments}`, 20, 62);
      doc.text(`Ticket Médio: ${formatCurrency(data.serviceStats.ticketMedio)}`, 20, 69);
      doc.text(`${clientsLabel}: ${data.serviceStats.uniqueCustomers}`, 20, 76);
    } else {
      doc.text(`Faturamento: ${formatCurrency(data.sportsStats.totalRevenue)}`, 20, 55);
      doc.text(`Reservas: ${data.sportsStats.totalBookings}`, 20, 62);
      doc.text(`Horas Ocupadas: ${data.sportsStats.totalHours}h`, 20, 69);
      doc.text(`Clientes: ${data.sportsStats.uniqueCustomers}`, 20, 76);
    }

    if (data.topCustomers.length > 0) {
      doc.setFontSize(14);
      doc.text(`Top ${clientsLabel}`, 20, 93);
      doc.setFontSize(11);
      data.topCustomers.forEach((c, i) => {
        doc.text(`${c.name}: ${c.count} ${activitySingular} - ${formatCurrency(c.revenue)}`, 20, 103 + i * 7);
      });
    }

    doc.save(`relatorio-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportCustomers = async () => await exportCustomers(data.customers);

  const handleExportBookings = async () => {
    const rows = data.bookings.filter(b => b.status !== 'CANCELLED').map(b => ({
      customer_name: b.customer_name,
      customer_phone: b.customer_phone || '-',
      start_time: format(new Date(b.start_time), 'dd/MM/yyyy HH:mm'),
      end_time: format(new Date(b.end_time), 'dd/MM/yyyy HH:mm'),
      status: b.status === 'FINALIZED' ? 'Finalizada' : b.status === 'CONFIRMED' ? 'Confirmada' : b.status === 'PENDING' ? 'Pendente' : b.status,
      total: formatCurrency(Number(b.grand_total || 0)),
    }));
    await exportToExcel(
      rows,
      [
        { key: 'customer_name', header: clientLabel },
        { key: 'customer_phone', header: 'Telefone' },
        { key: 'start_time', header: 'Início' },
        { key: 'end_time', header: 'Fim' },
        { key: 'status', header: 'Status' },
        { key: 'total', header: 'Total' },
      ],
      { filename: segment === 'health' ? 'consultas' : segment === 'beauty' ? 'atendimentos' : 'reservas', sheetName: activityLabel }
    );
  };

  const handleExportOrders = async () => {
    const filtered = data.orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    });
    await exportServiceOrders(filtered);
  };

  const handleExportOrdersDetailed = async () => {
    const filtered = data.orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    });
    await exportServiceOrdersDetailed(filtered);
  };

  if (data.isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Determine tabs per segment
  const getTabs = () => {
    if (segment === 'custom') {
      return [
        { value: 'revenue', label: 'Peças vs M.O.' },
        { value: 'status', label: 'OS por Status' },
        { value: 'customers', label: `Top ${clientsLabel}` },
        { value: 'exports', label: 'Exportações' },
      ];
    }
    if (segment === 'beauty' || segment === 'health') {
      return [
        { value: 'revenue', label: 'Por Serviço' },
        { value: 'professional', label: 'Por Profissional' },
        { value: 'popular', label: 'Mais Populares' },
        { value: 'occupancy', label: 'Por Horário' },
        { value: 'customers', label: `Top ${clientsLabel}` },
        { value: 'exports', label: 'Exportações' },
      ];
    }
    // sports
    return [
      { value: 'revenue', label: 'Por Espaço' },
      { value: 'occupancy', label: 'Por Horário' },
      { value: 'occupancy-rate', label: 'Taxa Ocupação' },
      { value: 'customers', label: 'Top Clientes' },
      { value: 'exports', label: 'Exportações' },
    ];
  };

  const tabs = getTabs();

  // Stats cards per segment
  const renderStatsCards = () => {
    if (segment === 'custom') {
      return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard title="Faturamento OS" value={formatCurrency(data.osStats.totalRevenue)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title="Total OS" value={String(data.osStats.total)} subtitle={`${data.osStats.openCount} abertas • ${data.osStats.finishedCount} fin.`} icon={<Wrench className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title="Ticket Médio" value={formatCurrency(data.osStats.ticketMedio)} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title="Tempo Médio" value={`${data.osStats.avgCompletionDays}d`} subtitle="dias p/ concluir" icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
        </div>
      );
    }
    if (segment === 'beauty' || segment === 'health') {
      const icon = segment === 'health' ? <Heart className="h-4 w-4 text-muted-foreground" /> : <Scissors className="h-4 w-4 text-muted-foreground" />;
      return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard title="Faturamento" value={formatCurrency(data.serviceStats.totalRevenue)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title={activityLabel} value={String(data.serviceStats.totalAppointments)} icon={icon} />
          <StatCard title="Ticket Médio" value={formatCurrency(data.serviceStats.ticketMedio)} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title={`${clientsLabel} Únicos`} value={String(data.serviceStats.uniqueCustomers)} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
        </div>
      );
    }
    // sports
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard title="Faturamento" value={formatCurrency(data.sportsStats.totalRevenue)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Reservas" value={String(data.sportsStats.totalBookings)} icon={<Calendar className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Horas Ocupadas" value={`${data.sportsStats.totalHours}h`} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Clientes Únicos" value={String(data.sportsStats.uniqueCustomers)} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
      </div>
    );
  };

  const EmptyState = () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      Sem dados para o período selecionado
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">Análise de desempenho e faturamento</p>
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

        {/* Stats */}
        {renderStatsCards()}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full overflow-x-auto scrollbar-hide -mx-1 px-1">
            <TabsList className="inline-flex w-auto">
              {tabs.map(t => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ========== REVENUE TAB ========== */}
          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle>
                  {segment === 'custom' ? 'Distribuição: Peças vs Mão de Obra' :
                    segment === 'beauty' || segment === 'health' ? 'Faturamento por Serviço' :
                      'Faturamento por Espaço'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {segment === 'custom' ? (
                  data.osStats.totalRevenue === 0 ? <EmptyState /> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={[{ name: 'Peças/Produtos', value: data.osStats.partsTotal }, { name: 'Mão de Obra', value: data.osStats.laborTotal }]}
                          cx="50%" cy="50%" labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100} dataKey="value">
                          <Cell fill="#3b82f6" /><Cell fill="#f97316" />
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  (() => {
                    const chartData = (segment === 'beauty' || segment === 'health') ? data.revenueByService : data.revenueBySpace;
                    return chartData.length === 0 ? <EmptyState /> : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={chartData} cx="50%" cy="50%" labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={100} dataKey="value">
                            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== PROFESSIONAL TAB (beauty/health) ========== */}
          <TabsContent value="professional">
            <Card>
              <CardHeader>
                <CardTitle>Faturamento por Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                {data.revenueByProfessional.length === 0 ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.revenueByProfessional} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#6366f1" name="Faturamento" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== POPULAR SERVICES (beauty/health) ========== */}
          <TabsContent value="popular">
            <Card>
              <CardHeader>
                <CardTitle>Serviços Mais Populares</CardTitle>
              </CardHeader>
              <CardContent>
                {data.servicePopularity.length === 0 ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.servicePopularity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-20} textAnchor="end" height={80} fontSize={12} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#22c55e" name={activityLabel} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== STATUS TAB (custom) ========== */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>OS por Status</CardTitle>
              </CardHeader>
              <CardContent>
                {data.osByStatus.length === 0 ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.osByStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" name="Quantidade" radius={[4, 4, 0, 0]}>
                        {data.osByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== OCCUPANCY TAB ========== */}
          <TabsContent value="occupancy">
            <Card>
              <CardHeader>
                <CardTitle>{segment === 'beauty' || segment === 'health' ? `${activityLabel} por Horário` : 'Ocupação por Horário'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.bookingsByHour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" name={activityLabel} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== OCCUPANCY RATE TAB (sports) ========== */}
          <TabsContent value="occupancy-rate">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Ocupação por Espaço</CardTitle>
              </CardHeader>
              <CardContent>
                {data.occupancyBySpace.length === 0 ? <EmptyState /> : (
                  <div className="space-y-4">
                    {data.occupancyBySpace.map((space, i) => (
                      <div key={space.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{space.name}</span>
                          <span className="text-muted-foreground">{space.taxa}% ({space.horas}h)</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(space.taxa, 100)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== TOP CUSTOMERS TAB ========== */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Top 5 {clientsLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topCustomers.length === 0 ? <EmptyState /> : (
                  <div className="space-y-4">
                    {data.topCustomers.map((customer, index) => (
                      <div key={customer.name} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full text-white font-bold"
                            style={{ backgroundColor: COLORS[index] }}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.count} {activitySingular}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-primary">{formatCurrency(customer.revenue)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== EXPORTS TAB ========== */}
          <TabsContent value="exports">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {/* Export Customers/Patients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {clientsLabel}
                  </CardTitle>
                  <CardDescription>Exportar lista completa de {clientsLabel.toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>{data.customers.length}</strong> {clientsLabel.toLowerCase()} cadastrados
                    </p>
                    <p className="text-xs text-muted-foreground">Inclui: Nome, E-mail, Telefone, CPF/CNPJ, Endereço</p>
                  </div>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button onClick={handleExportCustomers} className="w-full">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </Button>
                </div>
              </Card>

              {/* Segment-specific exports */}
              {segment === 'custom' ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />OS - Resumo</CardTitle>
                      <CardDescription>Exportar ordens de serviço do período</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground"><strong>{data.osStats.total}</strong> ordens no período</p>
                      <p className="text-xs text-muted-foreground">Inclui: Cliente, Status, Peças, Mão de Obra, Total</p>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Button onClick={handleExportOrders} className="w-full">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />Exportar Excel
                      </Button>
                    </div>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />OS - Detalhada</CardTitle>
                      <CardDescription>Exportar com todos os itens de cada OS</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Uma linha por item de cada OS</p>
                      <p className="text-xs text-muted-foreground">Inclui: Nº OS, Cliente, Item, Qtd, Preço, Subtotal</p>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Button onClick={handleExportOrdersDetailed} className="w-full" variant="outline">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />Exportar Excel
                      </Button>
                    </div>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />{activityLabel}</CardTitle>
                    <CardDescription>Exportar {activityLabel.toLowerCase()} do período</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      <strong>{data.bookings.filter(b => b.status !== 'CANCELLED').length}</strong> {activityLabel.toLowerCase()} no período
                    </p>
                    <p className="text-xs text-muted-foreground">Inclui: {clientLabel}, Horário, Status, Total</p>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Button onClick={handleExportBookings} className="w-full">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />Exportar Excel
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// Reusable stat card component
function StatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
