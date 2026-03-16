

## Botão "Finalizar Dia" na Agenda

### O que será feito
Adicionar um botão na agenda que, com um clique, finaliza todas as reservas **CONFIRMED** do dia atual — inserindo pagamento como **Dinheiro (CASH)** pelo valor do `grand_total` de cada reserva e atualizando o status para `FINALIZED`.

### UX (Mobile-first)
- Botão flutuante (FAB) ao lado do botão de filtro existente (canto inferior, lado direito), visível apenas quando há reservas confirmadas no dia.
- Ícone de `CheckCheck` (lucide) + texto "Finalizar Dia" no desktop.
- Ao clicar, abre um **AlertDialog** de confirmação mostrando quantas reservas serão finalizadas e o valor total estimado.
- Feedback via toast ao concluir.

### Implementação

**1. Arquivo: `src/pages/Agenda.tsx`**
- Computar `confirmedTodayBookings`: filtrar `bookings` com `status === 'CONFIRMED'` e `start_time` no dia de `currentDate`.
- Adicionar função `handleFinalizeDay`:
  - Para cada reserva confirmada do dia, chamar `supabase.from('payments').insert(...)` com `method: 'CASH'` e `amount: booking.grand_total`.
  - Depois, atualizar o status de todas para `FINALIZED` em batch.
  - Invalidar queries de bookings, payments, financial-metrics, dashboard-metrics.
- Adicionar `AlertDialog` com resumo (ex: "Finalizar 5 atendimentos? Total: R$ 1.200,00").
- Botão FAB fixo no canto inferior direito (`fixed bottom-16 right-3 z-40`), visível apenas se `confirmedTodayBookings.length > 0`.

**2. Fluxo de dados**
- Usa o `supabase` client diretamente (sem criar novo hook) para a operação em lote.
- Pagamento: 1 registro por reserva, `method: 'CASH'`, `amount: booking.grand_total || booking.space_total || 0`.
- Status update: batch `UPDATE bookings SET status = 'FINALIZED' WHERE id IN (...)`.

**3. Proteções**
- Estado `isFinalizingDay` para desabilitar o botão e mostrar spinner durante a operação.
- Não finaliza reservas com `grand_total = 0` ou nulo (pula silenciosamente ou inclui com valor 0 — a confirmar, mas incluiremos com o valor que tiver).

