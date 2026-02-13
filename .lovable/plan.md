# Central de Notificacoes Inteligente ("O Sino") + Ajustes na Pagina Publica

## Visao Geral

Tres frentes: (1) infraestrutura de notificacoes no banco, (2) componente visual do sino no header, (3) ajuste da tela de sucesso e bloqueio de horario na pagina publica.

---

## 1. Infraestrutura de Notificacoes (Backend)

### Tabela `venue_notifications`

```text
id           uuid PK
venue_id     uuid FK -> venues
type         text (ex: 'NEW_BOOKING', 'BOOKING_CANCELLED')
title        text
message      text
reference_id uuid (ID do booking relacionado)
is_read      boolean default false
created_at   timestamptz default now()
```

- RLS: leitura/escrita permitida para membros da venue (via `venue_members`).
- Realtime habilitado para atualizacoes instantaneas.

### Trigger Automatico

Criar um trigger `AFTER INSERT` na tabela `bookings` que, quando `NEW.status = 'PENDING'`, insere automaticamente uma notificacao na `venue_notifications` com:

- `title`: 'Novo Agendamento'
- `message`: 'Cliente [customer_name] solicitou horario em [start_time formatado]'
- `reference_id`: o ID do booking

Isso garante que qualquer booking PENDING (vindo da pagina publica) gera alerta automaticamente, sem depender do frontend.

---

## 2. Componente Visual - O Sino

### Novo componente: `src/components/notifications/NotificationBell.tsx`

- Icone de sino (Bell do lucide-react) posicionado no header do `AppLayout.tsx`.
- Badge vermelho com contador de notificacoes nao lidas.
- Ao clicar, abre um Popover com a lista de notificacoes ordenadas por data (mais recente primeiro).
- Cada item mostra titulo, mensagem resumida e tempo relativo ("ha 5 min").
- Ao clicar em uma notificacao:
  1. Marca como lida (UPDATE `is_read = true`).
  2. Navega para `/agenda` e abre o Sheet do booking correspondente.

### Novo hook: `src/hooks/useNotifications.ts`

- Query para buscar notificacoes da venue atual.
- Contador de nao lidas (derivado da query).
- Subscription realtime para receber novas notificacoes instantaneamente.
- Mutacao para marcar como lida.
- Mutacao para marcar todas como lidas.

### Integracao no AppLayout

Adicionar o `NotificationBell` no header ao lado do `SidebarTrigger`, garantindo que seja visivel em todas as paginas.

---

## 3. Fluxo de Resolucao (Click -> Sheet)

Quando o usuario clica em uma notificacao de "Novo Agendamento":

1. Se ja esta na pagina `/agenda`, abre diretamente o Sheet (BeautyBookingSheet/BookingOrderSheet/TechnicianBookingSheet conforme o segmento).
2. Se esta em outra pagina, navega para `/agenda` com query param `?openBooking=[bookingId]`.
3. A pagina `Agenda.tsx` detecta o query param e abre o Sheet automaticamente.

O Sheet ja possui o botao "Confirmar" para bookings PENDING, entao nao precisa de mudanca.

---

## 4. Tela de Sucesso na Pagina Publica

### Arquivo: `src/components/public-page/ServiceBookingWidget.tsx`

Atualmente o `onSuccess` do mutation exibe um toast "Agendamento confirmado!" e reseta o formulario. Mudar para:

- Em vez de voltar ao Step 1, ir para um **Step 5 (Tela de Sucesso)** que exibe:
  - Icone de relogio/pendente (nao check verde)
  - Titulo: "Pedido Realizado!"
  - Mensagem: "Recebemos sua solicitacao para [data] as [hora]. O estabelecimento ira confirmar sua disponibilidade em breve."
  - Subtexto: "Fique atento ao seu WhatsApp/E-mail para a confirmacao."
  - Botao "Fazer novo agendamento" para voltar ao Step 1.

### Bloqueio de Horario para Outros Clientes

Isso ja funciona corretamente: a funcao `get_professional_availability_public` consulta bookings existentes para calcular slots livres. Como o booking PENDING ja e inserido no banco, o horario automaticamente desaparece para outros clientes. Nenhuma mudanca necessaria nesta parte.  
  
  
Ao implementar a lógica de leitura do query param `?openBooking=[id]` na página `Agenda.tsx`: 1. Use um `useEffect` para detectar o parametro na montagem. 2. Se existir, busque os dados desse booking e abra o Sheet correspondente. 3. **Importante:** Após abrir o Sheet, limpe o parametro da URL silenciosamente (usando `window.history.replaceState` ou o hook de navegação do router) para evitar que o modal reabra sozinho caso o usuário atualize a página (F5).

---

## Resumo Tecnico


| Item                        | Arquivo/Local                                       | Tipo            |
| --------------------------- | --------------------------------------------------- | --------------- |
| Tabela venue_notifications  | Migracao SQL                                        | Backend         |
| Trigger de notificacao      | Migracao SQL                                        | Backend         |
| RLS policies                | Migracao SQL                                        | Backend         |
| Realtime habilitado         | Migracao SQL                                        | Backend         |
| Hook useNotifications       | src/hooks/useNotifications.ts                       | Frontend (novo) |
| Componente NotificationBell | src/components/notifications/NotificationBell.tsx   | Frontend (novo) |
| Integracao no header        | src/components/layout/AppLayout.tsx                 | Frontend (edit) |
| Deep link para booking      | src/pages/Agenda.tsx                                | Frontend (edit) |
| Tela de sucesso publica     | src/components/public-page/ServiceBookingWidget.tsx | Frontend (edit) |
