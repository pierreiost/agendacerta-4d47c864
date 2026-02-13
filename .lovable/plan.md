

# Correcoes: Status de Agendamento, Erro no Filtro e Horarios Passados

## 1. Agendamentos pela agenda devem vir CONFIRMED

**Problema**: O `ServiceBookingWizard` (usado na agenda interna) chama a mesma funcao SQL `create_service_booking` que o site publico. Essa funcao sempre insere com `status = 'PENDING'` (linha 305 da migracao).

**Solucao**: Adicionar um parametro opcional `p_status` na funcao `create_service_booking` com default `'PENDING'`. O `ServiceBookingWizard.tsx` passara `p_status: 'CONFIRMED'` na chamada RPC, enquanto o `ServiceBookingWidget.tsx` (site publico) continuara sem passar o parametro, mantendo `'PENDING'`.

### Mudancas:
- **Migracao SQL**: `ALTER` a funcao `create_service_booking` adicionando `p_status text DEFAULT 'PENDING'` e usando esse parametro no INSERT em vez do valor fixo.
- **`src/components/agenda/ServiceBookingWizard.tsx`**: Adicionar `p_status: 'CONFIRMED'` na chamada `supabase.rpc('create_service_booking', {...})`.

---

## 2. Erro "Cannot read properties of undefined (reading 'dot')" ao filtrar pendentes

**Problema**: Quando reservas de servico aparecem na agenda, o `booking.space_id` pode ser um placeholder ou nao existir no array `allSpaces`. O `findIndex` retorna `-1`, e `-1 % 5 = -1` em JavaScript, resultando em `SPACE_COLORS[-1]` que e `undefined`.

**Solucao**: Corrigir a funcao `getSpaceColor` para tratar indices negativos.

### Mudanca:
- **`src/components/agenda/AgendaSidebar.tsx`** (linha 45-46): Alterar de:
  ```
  return SPACE_COLORS[index % SPACE_COLORS.length];
  ```
  para:
  ```
  const safeIndex = index < 0 ? 0 : index % SPACE_COLORS.length;
  return SPACE_COLORS[safeIndex];
  ```

Isso corrige o crash em `DayView.tsx`, `WeekViewNew.tsx` e `MonthView.tsx` que todos usam essa funcao.

---

## 3. Site publico mostrando horarios passados no dia de hoje

**Problema**: A funcao SQL `get_professional_availability_public` gera slots a partir das 8h do dia selecionado, sem verificar se o horario ja passou quando o dia e hoje.

**Solucao**: Adicionar uma condicao na query SQL para filtrar slots que ja passaram. Quando `p_date = CURRENT_DATE`, apenas slots futuros (com margem de seguranca) serao retornados.

### Mudanca:
- **Migracao SQL**: Atualizar a funcao `get_professional_availability_public` adicionando um filtro:
  ```sql
  AND ts.slot_time > (NOW() AT TIME ZONE 'America/Sao_Paulo' AT TIME ZONE 'America/Sao_Paulo')
  ```
  Isso garante que, para o dia de hoje, apenas horarios que ainda nao passaram sejam exibidos.

---

## Resumo Tecnico

| Item | Arquivo | Tipo de Mudanca |
|------|---------|-----------------|
| Status CONFIRMED | Migracao SQL + ServiceBookingWizard.tsx | SQL + Frontend |
| Erro getSpaceColor | AgendaSidebar.tsx | Frontend |
| Horarios passados | Migracao SQL | SQL |

