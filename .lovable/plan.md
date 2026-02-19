

# Correcao Completa: Agendamento Beauty - Status, Servicos e Exibicao

## Problemas Identificados

Apos analise detalhada, foram encontrados **4 problemas interligados**:

### 1. Status vem como CONFIRMED (em vez de PENDING)
O `ServiceBookingWidget.tsx` (pagina publica) chama `create_service_booking` **sem passar `p_status`**, que tem valor padrao `'CONFIRMED'`. Isso tambem impede que o trigger `notify_new_pending_booking` dispare (ele so atua em `status = 'PENDING'`).

### 2. Sem identificacao de origem
O campo `p_notes` nao e passado, entao nao ha como saber que o agendamento veio da pagina publica.

### 3. Agenda mostra "Espaco" em vez do servico
O `DayView.tsx` e `WeekViewNew.tsx` sempre mostram `space?.name || 'Espaco'` com icone de `MapPin`. Para bookings do tipo `service`, deveria mostrar o nome do servico e/ou profissional em vez do espaco ficticio.

### 4. Historico do cliente mostra "Espaco removido" e nao lista servicos
O `CustomerHistorySheet.tsx`:
- Busca `space:spaces(name)` e exibe `booking.space?.name || 'Espaco removido'` -- mas bookings de servico usam um space ficticio
- Busca `order_items` (produtos consumidos) mas **nao busca `booking_services`** (servicos agendados)
- Mostra `Espaco: R$ 20,00` porque a RPC grava o preco dos servicos em `space_total`

---

## Solucao

### Arquivo 1: `src/components/public-page/ServiceBookingWidget.tsx`
**Alteracao**: Passar `p_status: 'PENDING'` e `p_notes: 'Agendamento via pagina publica'` na chamada da RPC.

```typescript
const { data, error } = await supabase.rpc('create_service_booking', {
  p_venue_id: venue.id,
  p_professional_id: activeProfessionalId,
  p_service_ids: selectedServiceIds,
  p_start_time: selectedSlot,
  p_customer_name: customerName,
  p_customer_email: customerEmail || 'sem-email@agendamento.local',
  p_customer_phone: customerPhone || undefined,
  p_status: 'PENDING',
  p_notes: 'Agendamento via pagina publica',
});
```

### Arquivo 2: `src/components/agenda/DayView.tsx`
**Alteracao**: Quando `booking.booking_type === 'service'`, mostrar o nome do profissional ou "Servico" em vez do nome do espaco com icone MapPin. Trocar o icone para `Scissors` e exibir info relevante.

```tsx
{booking.booking_type === 'service' ? (
  <div className="flex items-center gap-0.5 ...">
    <Scissors className="h-2 w-2 ..." />
    <span className="truncate">Servico</span>
  </div>
) : (
  <div className="flex items-center gap-0.5 ...">
    <MapPin className="h-2 w-2 ..." />
    <span className="truncate">{space?.name || 'Espaco'}</span>
  </div>
)}
```

### Arquivo 3: `src/components/agenda/WeekViewNew.tsx`
**Alteracao**: Mesma logica do DayView -- diferenciar exibicao por `booking_type`.

### Arquivo 4: `src/components/customers/CustomerHistorySheet.tsx`
**Alteracoes**:
- Adicionar `booking_services(id, price, duration_minutes, service:services(title))` ao select
- Adicionar `booking_type` ao select
- Quando `booking_type === 'service'`: mostrar nome dos servicos em vez de "Espaco removido"
- Rotular o valor como "Servicos" em vez de "Espaco" para bookings de servico
- Exibir lista de servicos agendados no card

### Arquivo 5 (RPC - Migration SQL): `create_service_booking`
**Alteracao**: Gravar `space_total = 0` e `grand_total = v_total_price` (em vez de `space_total = v_total_price`). O valor dos servicos nao e "aluguel de espaco". Isso corrige a exibicao "Espaco: R$ 20,00".

```sql
INSERT INTO bookings (...)
VALUES (
  ...
  0,              -- space_total (era v_total_price)
  v_total_price,  -- grand_total
  ...
);
```

---

## Resumo das Alteracoes

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `ServiceBookingWidget.tsx` | Frontend | Passar `p_status: 'PENDING'` e `p_notes` |
| `DayView.tsx` | Frontend | Diferenciar exibicao service vs space |
| `WeekViewNew.tsx` | Frontend | Diferenciar exibicao service vs space |
| `CustomerHistorySheet.tsx` | Frontend | Buscar e exibir booking_services; tratar booking_type |
| Migration SQL | Backend | Corrigir space_total = 0 para bookings de servico |

## Impacto

- Agendamentos da pagina publica entram como **PENDING** (gera notificacao)
- Agenda mostra "Servico" em vez de "Espaco" para bookings beauty/health
- Historico do cliente lista os servicos agendados corretamente
- Valor exibido como "Servicos" em vez de "Espaco"
- Agendamentos existentes com space_total incorreto continuam exibindo o valor antigo (sem migracao de dados retroativa)

