

# Financeiro Avançado — Saldo Acumulado + 4 Gráficos por Segmento

## 1. Saldo Acumulado (não reseta)

Alterar a RPC `get_financial_metrics` para que o campo `balance` seja calculado com **toda a receita histórica** menos **toda a despesa histórica**, sem filtro de período. Os cards de Receita e Despesa continuam mostrando o período selecionado.

```sql
-- Linha 143 atual: v_current_revenue - v_current_expenses
-- Nova: calcula all-time
SELECT COALESCE(SUM(grand_total),0) INTO v_all_revenue FROM (
  SELECT grand_total FROM bookings WHERE venue_id=p_venue_id AND status='FINALIZED'
  UNION ALL
  SELECT total FROM service_orders WHERE venue_id=p_venue_id AND (...)
) r;
SELECT COALESCE(SUM(amount),0) INTO v_all_expenses FROM expenses WHERE venue_id=p_venue_id;
-- balance = v_all_revenue - v_all_expenses
```

## 2. Nova RPC: `get_financial_charts(p_venue_id, p_segment)`

Retorna os dados dos 4 gráficos em um único call. Cada campo é JSONB.

### Waterfall — Personalizado por segmento

| Segmento | Faturamento Bruto vem de... | Comissões | Custos de Produtos |
|---|---|---|---|
| **Sports** | Reservas finalizadas (aluguel de quadra) | Despesas cat=`salary` | Despesas cat=`material` |
| **Beauty** | Booking services (serviços prestados) | Despesas cat=`salary` (comissões dos profissionais) | Despesas cat=`material` (produtos consumidos) |
| **Health** | Booking services (consultas/procedimentos) | Despesas cat=`salary` | Despesas cat=`material` (insumos clínicos) |
| **Custom** | Service Orders finalizadas (OS) | Despesas cat=`salary` | `service_order_items` (peças/componentes usados) |

Resultado: array `[{name, value, type}]` onde type = "positive" ou "negative".

### Cash Projection (30 dias)

- Saldo inicial = saldo acumulado atual
- **Contas a Receber**: 
  - Sports: reservas confirmadas futuras (`grand_total`)
  - Beauty/Health: agendamentos confirmados futuros (`booking_services.price`)
  - Custom: OS abertas/em andamento (`total`)
- **Contas a Pagar**: despesas com `is_paid=false` e `due_date` nos próximos 30 dias
- Resultado: array de 30 pontos `[{day, projected_balance}]`

### Revenue vs Cost por Profissional

- **Apenas Beauty e Health** (segmentos com profissionais vinculados a serviços)
- Revenue: soma de `booking_services.price` agrupado por `professional_id`
- Cost: despesas cat=`salary` (ou futuro campo de comissão no profissional)
- Resultado: array `[{name, revenue, cost}]`
- **Sports/Custom**: retorna `null` — o grid adapta o layout

### Heatmap de Inadimplência

- **Sports**: reservas passadas com status != FINALIZED/CANCELLED (não pagaram após jogar)
- **Beauty/Health**: agendamentos passados não finalizados (atendeu mas não fechou comanda)
- **Custom**: OS abertas há mais de X dias + orçamentos pendentes há mais de 7 dias
- Agrupado por semana (últimas 8 semanas)
- Resultado: array `[{week_label, count, total_value}]`

## 3. Novos Componentes

| Componente | Tipo | Detalhe por Segmento |
|---|---|---|
| `WaterfallChart.tsx` | BarChart (waterfall simulado) | Títulos dos eixos mudam: Sports="Locações", Beauty="Serviços", Custom="Ordens de Serviço" |
| `CashProjectionChart.tsx` | AreaChart/LineChart | Label muda: Sports="Reservas futuras", Beauty="Agendamentos", Custom="OS em andamento" |
| `RevenueByCostChart.tsx` | Horizontal BarChart | Só renderiza em Beauty/Health. Mostra nome do profissional |
| `DelinquencyHeatmap.tsx` | Grid CSS com cells coloridas | Label muda: Sports="Reservas não pagas", Beauty="Comandas abertas", Custom="OS atrasadas" |
| `FinancialChartsGrid.tsx` | Grid wrapper | `grid-cols-1 md:grid-cols-2`. Se não tem profissionais (sports/custom), heatmap ocupa `md:col-span-2` |

## 4. Hook `useFinancialCharts.ts`

Chama `get_financial_charts` RPC, recebe o segmento do `useVenue()`, passa como parâmetro.

## 5. Integração no `Financeiro.tsx`

Adicionar `<FinancialChartsGrid />` abaixo das Tabs existentes, com título de seção "Análise Financeira".

## 6. Arquivos

| Arquivo | Ação |
|---|---|
| Migração SQL | Atualizar `get_financial_metrics` (saldo acumulado) + criar `get_financial_charts` |
| `src/hooks/useFinancialCharts.ts` | Novo |
| `src/components/financeiro/WaterfallChart.tsx` | Novo |
| `src/components/financeiro/CashProjectionChart.tsx` | Novo |
| `src/components/financeiro/RevenueByCostChart.tsx` | Novo |
| `src/components/financeiro/DelinquencyHeatmap.tsx` | Novo |
| `src/components/financeiro/FinancialChartsGrid.tsx` | Novo |
| `src/pages/Financeiro.tsx` | Adicionar grid de gráficos |

