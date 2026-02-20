
# Correção Crítica: Totais de Serviços, Valores Avulsos e Adição de Serviços

## Diagnóstico Preciso (Confirmado via banco de dados)

### Problema 1 — Trigger `calculate_booking_totals` destrói o valor dos serviços

Este é o bug raiz mais grave. Quando um produto ou item avulso é adicionado a um agendamento de serviço, o trigger é disparado e recalcula:

```
grand_total = space_total + items_total
```

Mas para bookings de serviço, o valor dos serviços está em `booking_services` (tabela separada), não em `space_total` nem `items_total`. Resultado: `grand_total` é sobrescrito sem incluir o valor dos serviços.

**Confirmação no banco:** registros recentes têm `space_total = 0`, então se um produto de R$ 50 for adicionado, o trigger vai calcular `grand_total = 0 + 50 = R$ 50` — apagando os R$ 70 de serviços do agendamento.

### Problema 2 — BeautyBookingSheet calcula total correto na tela, mas usa o `grand_total` errado no checkout

A tela mostra `servicesTotal + itemsTotal` (correto), mas o `CheckoutDialog` recebe `grandTotal` que vem do estado local — esse valor é calculado corretamente no componente. Porém, ao finalizar, o `finalizeBooking` em `usePayments` muda o status para `FINALIZED` sem atualizar o `grand_total` no banco. O financeiro lê o `grand_total` do banco (que pode estar errado após o trigger).

### Problema 3 — Não é possível adicionar serviços a um agendamento existente

O `BeautyBookingSheet` só oferece "Produto" e "Avulso" como opções de adição. Não há botão nem dialog para adicionar serviços da tabela `booking_services` a um agendamento já criado. Quando um novo serviço é adicionado, o `grand_total` também precisa ser atualizado.

### Problema 4 — Valores avulsos (order_items) não alimentam corretamente o financeiro

Ocorre em cadeia pelo Problema 1: o trigger recalcula `grand_total = space_total + items_total`. Para bookings de serviço com `space_total = 0`, `grand_total` fica igual ao valor dos avulsos — apagando os serviços. O módulo financeiro usa `grand_total` do banco (lido quando `status = FINALIZED`), então qualquer distorção no `grand_total` afeta o financeiro diretamente.

---

## Solução

### Parte 1 — Backend: Corrigir o trigger `calculate_booking_totals` (Migration SQL)

O trigger precisa saber que bookings de tipo `service` têm um valor em `booking_services` que deve ser preservado. A correção muda a lógica de recalculo:

**Para bookings de serviço:**
```sql
grand_total = services_total_from_booking_services + items_total_from_order_items
```

**Para bookings de espaço:**
```sql
grand_total = space_total + items_total_from_order_items  (comportamento atual, mantido)
```

A migração vai alterar a função `calculate_booking_totals()` para:
1. Verificar o `booking_type` do registro afetado
2. Se `booking_type = 'service'`, somar os valores de `booking_services` ao invés de usar `space_total`
3. Se outro tipo, manter o comportamento atual

Adicionalmente, uma função auxiliar `recalculate_service_booking_total(booking_id)` será criada para uso no frontend quando um novo serviço for adicionado via UI.

### Parte 2 — Backend: Função RPC para adicionar serviço a agendamento existente

Nova função `add_service_to_booking(p_booking_id, p_service_id, p_professional_id)` que:
1. Busca o preço e duração do serviço (considerando preço customizado do profissional)
2. Insere em `booking_services`
3. Atualiza `grand_total` e `total_duration_minutes` na booking

### Parte 3 — Frontend: `AddServiceToBookingDialog` (novo componente)

Novo dialog similar ao `AddProductDialog`, mas para serviços. Exibe a lista de serviços ativos do venue, permite selecionar um profissional, e chama a RPC `add_service_to_booking`.

### Parte 4 — Frontend: Atualizar `BeautyBookingSheet`

Adicionar o botão "Serviço" na seção de ações, ao lado de "Produto" e "Avulso". Ao clicar, abre o novo `AddServiceToBookingDialog`.

### Parte 5 — Frontend: Garantir que o `finalizeBooking` salve o `grand_total` correto

No `usePayments.ts`, antes de marcar como `FINALIZED`, atualizar o `grand_total` da booking com o valor correto (soma de `booking_services + order_items`). Isso garante que o financeiro nunca leia um valor desatualizado.

---

## Resumo das Alterações

| # | Arquivo / Local | Tipo | Descrição |
|---|-----------------|------|-----------|
| 1 | Migration SQL | Backend | Corrigir `calculate_booking_totals()` para respeitar `booking_type = 'service'` |
| 2 | Migration SQL | Backend | Nova RPC `add_service_to_booking()` |
| 3 | `src/components/bookings/AddServiceToBookingDialog.tsx` | Frontend (novo) | Dialog para adicionar serviço a agendamento existente |
| 4 | `src/components/bookings/BeautyBookingSheet.tsx` | Frontend | Adicionar botão "Serviço" + integrar novo dialog |
| 5 | `src/hooks/usePayments.ts` | Frontend | Atualizar `grand_total` antes de finalizar para garantir valor correto no financeiro |

---

## Fluxo Corrigido

```text
[Adicionar produto/avulso]
        |
        v
trigger calculate_booking_totals
        |
        v
booking_type = 'service'?
   YES → grand_total = SUM(booking_services.price) + SUM(order_items.subtotal)
   NO  → grand_total = space_total + SUM(order_items.subtotal)   [comportamento atual]

[Fechar Comanda / Finalizar]
        |
        v
usePayments.finalizeBooking
        |
        v
Atualiza grand_total = servicesTotal + itemsTotal (valor do componente, garantidamente correto)
        |
        v
Muda status → FINALIZED
        |
        v
Financeiro lê grand_total (correto)
```

---

## Impacto

- Produtos e avulsos adicionados a agendamentos de serviço não mais apagam o valor dos serviços
- Serviços podem ser adicionados a agendamentos existentes
- O módulo financeiro passa a receber os valores corretos ao finalizar
- Nenhuma breaking change para agendamentos de espaço (sports)
- Registros históricos com `grand_total` incorreto não são alterados automaticamente (sem retroatividade nos dados)
