

## Plano: Mover recorrência para Step 3 + Corrigir scroll definitivo

### Problema raiz do scroll
O `DialogContent` base em `dialog.tsx` (linha 39) aplica `max-h-[90vh] overflow-y-auto` por padrão. Os wizards tentam usar `overflow-hidden` para controlar o scroll internamente, mas a regra CSS `[&.overflow-hidden]:overflow-hidden [&.overflow-hidden]:max-h-none` remove o `max-h`, fazendo o modal crescer sem limite e sem scroll nativo funcional. A div interna `overflow-y-auto` não tem altura fixa calculável porque o pai não tem constraint.

### Correção definitiva

**1. `dialog.tsx` - Remover `max-h` e `overflow-y-auto` do default**
- Trocar a classe base para **não** incluir `max-h-[90vh] overflow-y-auto` por padrão
- Usar apenas `grid` layout base, sem overflow management
- Cada dialog que precisar de scroll controlará isso via className
- Remover a regra `[&.overflow-hidden]:overflow-hidden [&.overflow-hidden]:max-h-none`
- Adicionar apenas `max-h-[90dvh] overflow-y-auto` como fallback quando nenhuma classe `overflow-*` ou `max-h-*` for passada (implementar via string check ou simplesmente deixar sem e cada consumer define)

Na prática: a linha base fica sem `max-h` e sem `overflow`, e os wizards controlam via suas classes já aplicadas (`max-h-[92dvh] flex flex-col overflow-hidden`).

**2. `BookingWizard.tsx` - Reestruturar steps**
- Step 2: Remover seção de recorrência e card de preço. Manter apenas: Espaço, Data, Horário, Duração, Observações
- Step 3 (Revisão + Recorrência): Sempre visível com resumo da reserva + toggle "Reserva Recorrente" (por padrão desligado). Ao ativar, mostra frequência e repetições inline. Card de preço total fica aqui, atualizado conforme recorrência
- O step 3 atual de "Confirmação" incorpora a recorrência, então não há step 4 — continua com 3 steps

**3. `CustomerFormDialog.tsx`** - Aplicar `max-h-[90dvh] overflow-y-auto` explícito (já funciona, só garantir `dvh`)

**4. `ServiceBookingWizard.tsx` e `TechnicianBookingWizard.tsx`** - Sem mudança funcional, apenas garantir que o `DialogContent` funcione com a nova base do `dialog.tsx`

### Arquivos alterados
- `src/components/ui/dialog.tsx` — remover max-h/overflow default
- `src/components/agenda/BookingWizard.tsx` — mover recorrência para step 3
- `src/components/customers/CustomerFormDialog.tsx` — adicionar max-h-[90dvh] explícito

### Resultado esperado
- Step 2 fica mais curto e scrollável naturalmente
- Step 3 mostra resumo + toggle recorrência + preço, tudo scrollável
- Scroll funciona via mouse wheel em todos os modais
- Footer sempre visível e clicável

