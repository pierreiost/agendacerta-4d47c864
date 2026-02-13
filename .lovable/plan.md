

# Comanda Beauty/Health + Bloqueio de Horarios Retroativos

## Visao Geral

Duas frentes de trabalho: (1) bloquear agendamentos em horarios passados na agenda interna, e (2) construir a comanda completa para os segmentos Health e Beauty, substituindo o stub atual do `BeautyBookingSheet`.

---

## 1. Bloqueio de Datas/Horarios Retroativos (Agenda Interna)

### Problema
O `ServiceBookingWizard` ja bloqueia datas passadas no calendario (linha 546), mas os horarios exibidos no Step 3 vem da funcao `useProfessionalAvailability` e nao filtram slots que ja passaram no dia de hoje.

### Solucao
Filtrar os slots no frontend antes de exibi-los. No `useMemo` de `availableSlots` (linhas 202-206 do `ServiceBookingWizard.tsx`), adicionar logica para remover slots cujo horario ja passou quando a data selecionada for hoje.

### Arquivo: `src/components/agenda/ServiceBookingWizard.tsx`
- No `availableSlots` useMemo, apos obter `prof?.available_slots`, filtrar com:
  - Se `selectedDate` for hoje, remover slots onde `new Date(slot) <= new Date()`
  - Caso contrario, manter todos os slots

---

## 2. Comanda Unificada Beauty/Health

### Problema
O `BeautyBookingSheet` e atualmente um stub de debug (apenas mostra ID, Status e Data). Precisa se tornar uma comanda funcional semelhante ao `BookingOrderSheet` (esportes), mas adaptada para servicos.

### Estrutura da Comanda

A comanda tera as seguintes secoes:

```text
+----------------------------------+
| Detalhes do Agendamento   [Status]|
+----------------------------------+
| CLIENTE                          |
| Nome / Telefone / Email          |
+----------------------------------+
| AGENDAMENTO                     |
| Data / Horario / Duracao         |
| Profissional                     |
+----------------------------------+
| SERVICOS                        |
| Servico 1 ........... R$ XX,XX   |
| Servico 2 ........... R$ XX,XX   |
| Subtotal Servicos     R$ XX,XX   |
+----------------------------------+
| PRODUTOS (consumo adicional)     |
| [+ Produto] [+ Avulso]          |
| Produto 1 ........... R$ XX,XX   |
| Subtotal Produtos     R$ XX,XX   |
+----------------------------------+
| TOTAL              R$ XXX,XX     |
+----------------------------------+
| [Fechar Comanda]                 |
| [Confirmar] [Cancelar]           |
+----------------------------------+
```

### Dados utilizados
- **Servicos agendados**: hook `useBookingServices(bookingId)` - ja existe e retorna servicos com profissional, preco e duracao
- **Produtos consumidos**: hook `useOrderItems(bookingId)` - ja existe
- **Status e acoes**: hook `useBookings()` - `updateBooking` para confirmar/cancelar
- **Checkout/Pagamento**: componente `CheckoutDialog` - ja existe, sera reutilizado

### Arquivo: `src/components/bookings/BeautyBookingSheet.tsx`
Reescrever completamente, seguindo a estrutura do `BookingOrderSheet` como referencia, com as seguintes diferencas:

1. **Secao "Servicos"** em vez de "Espaco": Listar servicos do `useBookingServices`, mostrando titulo, profissional e preco individual
2. **Secao "Produtos"** (identica ao BookingOrderSheet): Permitir adicionar produtos e itens avulsos
3. **Total**: `servicesTotal + itemsTotal` (em vez de `spaceTotal + itemsTotal`)
4. **Acoes**:
   - "Fechar Comanda" abre o `CheckoutDialog` (reutilizado, adaptando para passar `servicesTotal` no lugar de `spaceTotal`)
   - "Confirmar" (visivel quando status = PENDING)
   - "Cancelar" com dialogo de confirmacao
5. **Estado visual**: Badges de status identicos ao BookingOrderSheet

### Componentes reutilizados (sem alteracao)
- `CheckoutDialog` - Precisa de pequeno ajuste: aceitar `servicesTotal` como alternativa a `spaceTotal`, ou simplesmente receber ambos somados no `grandTotal`
- `AddProductDialog`
- `AddCustomItemDialog`
- `OrderItemsList`

### Ajuste no CheckoutDialog
O `CheckoutDialog` atualmente exibe "Espaco (nome)" no resumo. Para Beauty/Health, precisa exibir "Servicos (X itens)" no lugar. Solucao: adicionar prop opcional `summaryLabel` para customizar o rotulo da primeira linha do resumo.

---

## Resumo Tecnico

| Item | Arquivo | Tipo |
|------|---------|------|
| Filtro horarios passados (agenda interna) | ServiceBookingWizard.tsx | Frontend |
| Comanda Beauty/Health | BeautyBookingSheet.tsx | Frontend (reescrita) |
| Ajuste rotulo resumo | CheckoutDialog.tsx | Frontend (prop opcional) |

## Beneficios

- Unifica o fluxo de finalizacao para Beauty e Health
- Reutiliza toda a infraestrutura de pagamento ja existente (CheckoutDialog, usePayments)
- Profissional pode revisar servicos prestados antes de fechar a comanda
- Horarios retroativos sao bloqueados tanto no site publico (ja feito via SQL) quanto na agenda interna (novo filtro frontend)
