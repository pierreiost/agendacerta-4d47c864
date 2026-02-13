
# Refinamento Final: Limpar Notificacoes + Cadastro Automatico de Cliente

## 1. Botao "Limpar Todas" no Popover de Notificacoes

### Arquivo: `src/hooks/useNotifications.ts`
- Adicionar nova mutacao `clearAll` que deleta todas as notificacoes da venue atual (`DELETE FROM venue_notifications WHERE venue_id = ?`).

### Arquivo: `src/components/notifications/NotificationBell.tsx`
- Adicionar botao "Limpar" (icone Trash2) no header do popover, ao lado do "Marcar todas".
- O botao so aparece quando `notifications.length > 0`.
- Ao clicar, executa `clearAll.mutate()` e limpa a lista.

---

## 2. Botao "Cadastrar Cliente" nos Sheets de Booking

Quando um agendamento vem da pagina publica, o booking tem `customer_name`, `customer_email` e `customer_phone` preenchidos, mas o `customer_id` pode ser `null` (cliente nao cadastrado).

### Logica
- No Sheet (BeautyBookingSheet, BookingOrderSheet, TechnicianBookingSheet), verificar se `booking.customer_id` e `null`.
- Se for null, exibir um botao "Cadastrar Cliente" na secao de dados do cliente.
- Ao clicar:
  1. Cria um novo registro em `customers` com `name`, `email`, `phone` extraidos do booking.
  2. Atualiza o booking com o `customer_id` retornado.
  3. Exibe toast de sucesso e o botao desaparece (substituido pelo link para o perfil do cliente).

### Arquivos editados
- `src/components/bookings/BeautyBookingSheet.tsx` - Adicionar botao + logica
- `src/components/bookings/BookingOrderSheet.tsx` - Mesmo ajuste
- `src/components/bookings/TechnicianBookingSheet.tsx` - Mesmo ajuste

Para evitar duplicacao de codigo, a logica de criacao sera encapsulada em um pequeno hook ou funcao utilitaria reutilizavel.

---

## Resumo Tecnico

| Item | Arquivo | Tipo |
|------|---------|------|
| Mutacao clearAll | src/hooks/useNotifications.ts | Frontend (edit) |
| Botao Limpar no popover | src/components/notifications/NotificationBell.tsx | Frontend (edit) |
| Botao Cadastrar Cliente | src/components/bookings/BeautyBookingSheet.tsx | Frontend (edit) |
| Botao Cadastrar Cliente | src/components/bookings/BookingOrderSheet.tsx | Frontend (edit) |
| Botao Cadastrar Cliente | src/components/bookings/TechnicianBookingSheet.tsx | Frontend (edit) |
