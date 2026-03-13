

# Ajuste Dashboard: 3 cards em 1 linha no mobile + Reservas no Mês

## Mudanças

### 1. Grid 3 colunas no mobile (`DashboardBookings.tsx`)
- Linha 160: trocar `grid-cols-2 lg:grid-cols-3` para `grid-cols-3`
- Reduzir padding/font do card custom "Reservas Hoje" para mobile (p-2.5 md:p-6, textos menores)
- Substituir o 3º card "Taxa de Ocupação" por "Reservas no Mês" usando `serverMetrics.month_bookings` (ícone `Calendar`, cor `purple`)

### 2. MetricCard mais compacto no mobile (`metric-card.tsx`)
- Padding: `p-2 md:p-4`
- Título: `text-[8px] md:text-xs`
- Valor: `text-sm md:text-2xl`
- Ícone container: `p-1.5 md:p-2.5`, ícone: `h-3.5 w-3.5 md:h-5 md:w-5`

### 3. Mesma lógica nos outros dashboards
- `DashboardAppointments.tsx` e `DashboardServiceOrders.tsx`: trocar grid para `grid-cols-3`

### Resultado
- 3 cards ficam lado a lado mesmo em telas de 360px
- "Taxa de Ocupação" substituída por "Reservas no Mês" (dado já disponível no servidor)

