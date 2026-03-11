

## Plano: 4 Correções UX/Mobile

### Tarefa 1: Default `booking_mode` ao habilitar página pública

**Arquivo**: `src/pages/PublicPageConfig.tsx`

Na função `handleSave` (linha 119), antes do `.update()`, adicionar lógica:
- Se `publicPageEnabled === true`, verificar se `currentVenue.booking_mode` é nulo
- Se nulo, incluir no payload: `booking_mode: currentVenue.segment === 'custom' ? 'inquiry' : 'calendar'`
- Também carregar `booking_mode` no `loadData` (linha 95, adicionar ao `.select()`)

### Tarefa 2: Scroll horizontal nas tabelas (mobile)

Adicionar `overflow-x-auto` nos containers de tabela:

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `src/pages/OrdensServico.tsx` | 148 | `"rounded-md border bg-card"` → `"rounded-md border bg-card overflow-x-auto"` |
| `src/pages/Espacos.tsx` | 170 | Envolver `<Table>` em `<div className="overflow-x-auto">` |
| `src/pages/Produtos.tsx` | 192 | `"hidden md:block"` → `"hidden md:block overflow-x-auto"` |
| `src/components/financeiro/ExpenseList.tsx` | 90 | `"rounded-md border"` → `"rounded-md border overflow-x-auto"` |
| `src/components/financeiro/RevenueList.tsx` | 136 | `"rounded-md border"` → `"rounded-md border overflow-x-auto"` |

### Tarefa 3: Viewport meta tag (iOS)

**Arquivo**: `index.html` (linha 5)

Alterar de:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
Para:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
```

### Tarefa 4: Verificação dos slot clicks na Agenda

Já verificado na análise anterior: `handleSlotClick` em `Agenda.tsx` já abre o `BookingWizard` (mesma chamada do botão "Nova Reserva"). Nenhuma alteração necessária — comportamento já está correto.

---

**Resumo**: 3 tarefas com alterações de código (booking_mode, scroll, viewport) + 1 confirmação (slots já corretos). Total ~7 arquivos modificados.

