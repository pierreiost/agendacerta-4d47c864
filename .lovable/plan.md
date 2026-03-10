

## Plan: Two Changes

### 1. Fix day abbreviations to pt-BR in Delinquency Heatmap

**Problem**: The SQL `to_char(date, 'Dy')` outputs English abbreviations (Mon, Tue, Wed) because the database locale is en_US.

**Solution**: Replace `to_char(dy.day_date, 'Dy')` with a `CASE` expression that maps `EXTRACT(DOW FROM dy.day_date)` to pt-BR abbreviations: Dom, Seg, Ter, Qua, Qui, Sex, Sáb.

**Change**: New SQL migration updating `get_financial_charts` RPC.

---

### 2. Segment-specific Reports page

**Problem**: The current Relatórios page is a one-size-fits-all layout with tabs (Faturamento, Ocupação, Clientes, OS, Exportações) that don't adapt to the venue segment. Sports venues see irrelevant OS tabs, beauty/health venues see space-based metrics, and custom venues miss relevant data.

**Solution**: Rebuild the Relatórios page with segment-aware tabs, stats cards, and charts. Each segment gets its own relevant reports.

#### Segment-specific tabs and content:

**Sports (Quadras)**:
- **Stats**: Faturamento, Reservas, Horas Ocupadas, Clientes Únicos
- **Tabs**: Faturamento por Espaço (pie chart) | Ocupação por Horário (bar chart) | Taxa de Ocupação por Espaço | Top Clientes | Exportações (Clientes, Reservas)

**Beauty (Salões)**:
- **Stats**: Faturamento, Atendimentos, Ticket Médio, Clientes Únicos
- **Tabs**: Faturamento por Serviço (pie chart) | Faturamento por Profissional (bar chart) | Serviços Mais Populares | Top Clientes | Exportações (Clientes, Atendimentos)

**Health (Clínicas)**:
- **Stats**: Faturamento, Consultas, Ticket Médio, Pacientes Únicos
- **Tabs**: Faturamento por Serviço | Faturamento por Profissional | Consultas por Horário | Top Pacientes | Exportações (Pacientes, Consultas)

**Custom (Assistência Técnica)**:
- **Stats**: Faturamento OS, Total OS, Abertas/Finalizadas, Ticket Médio
- **Tabs**: Peças vs Mão de Obra (pie chart) | OS por Status (bar chart) | Tempo Médio de Conclusão | Top Clientes | Exportações (Clientes, OS Resumo, OS Detalhada)

#### Technical approach:
- Refactor `Relatorios.tsx` to read `currentVenue.segment` and conditionally render:
  - Segment-specific stats cards (top row)
  - Segment-specific tab set with appropriate charts
  - Segment-specific terminology (paciente vs cliente, reserva vs atendimento vs consulta vs OS)
- Add new data computations using existing hooks (`useBookings`, `useServices`, `useServiceOrders`, `useCustomers`, `useProfessionals`)
- For beauty/health: compute revenue by service (from `booking_services`) and revenue by professional (from `booking_services.professional_id`)
- Add Excel export functions for bookings/atendimentos in `useExcelExport.ts`
- The PDF export will also adapt terminology per segment

#### Files to modify:
- `supabase/migrations/` — new migration for pt-BR day names
- `src/pages/Relatorios.tsx` — full refactor with segment-aware rendering
- `src/hooks/useExcelExport.ts` — add `exportBookings` function for sports/beauty/health segments

