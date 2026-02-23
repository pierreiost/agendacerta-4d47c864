
# Plano: Responsividade Mobile-First e Ajustes Globais

## Resumo
Varredura completa de responsividade no sistema AgendaCerta, focando em 3 frentes: notificacoes globais, pagina de Relatorios, e padroes responsivos em componentes-chave. Zero alteracoes em logica de negocio ou banco de dados.

---

## Tarefa 1: Toasts Globais (Sonner + Toaster)

O sistema usa **dois** sistemas de toast simultaneamente (`sonner` e `ui/toaster`). Ambos serao ajustados.

**Arquivo: `src/components/ui/sonner.tsx`**
- Adicionar `duration={2000}` para tempo maximo de 2s
- Adicionar `closeButton={true}` para botao de fechar visivel
- Estilizar botao de fechar com classes para area de toque maior: `[&_[data-close-button]]:!w-8 [&_[data-close-button]]:!h-8 [&_[data-close-button]]:!bg-muted [&_[data-close-button]]:!rounded-full`

**Arquivo: `src/components/ui/toaster.tsx`**
- O componente Toaster (radix) ja funciona bem, mas garantir que o viewport tenha padding adequado no mobile

---

## Tarefa 2: Pagina de Relatorios

**Arquivo: `src/pages/Relatorios.tsx`**

- **TabsList**: Envolver em `<div className="w-full overflow-x-auto scrollbar-hide">` para permitir scroll horizontal das abas no mobile
- **Stats Cards (linha 290)**: Ja usa `grid gap-4 md:grid-cols-4` -- alterar para `grid-cols-2 md:grid-cols-4` (ja esta assim, verificar)
- **OS Stats grid (linha 437)**: Alterar `grid gap-4 md:grid-cols-2 lg:grid-cols-4` para garantir `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- **Exports grid (linha 530)**: Alterar para `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Header actions**: Garantir `flex-wrap` nos botoes do header

---

## Tarefa 3: Varredura de Padroes Responsivos

### 3.1 DialogContent Global
**Arquivo: `src/components/ui/dialog.tsx`**
- Adicionar `max-h-[90vh] overflow-y-auto` ao `DialogContent` base para que **todos** os modais do sistema rolem corretamente no mobile
- Adicionar padding mobile: `p-4 md:p-6`

### 3.2 SheetContent (Booking Sheets)
**Arquivos: `src/components/bookings/TechnicianBookingSheet.tsx`, `BookingOrderSheet.tsx`, `BeautyBookingSheet.tsx`**
- Substituir larguras fixas `w-[400px] sm:w-[540px]` por `w-full sm:w-[540px]` para evitar overflow no mobile

### 3.3 Dashboard
**Arquivo: `src/pages/Dashboard.tsx`**
- Header: Alterar `flex items-center justify-between` para `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`
- Quick Actions grid: Alterar `grid gap-4 md:grid-cols-3` para `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
- Titulo: `text-2xl md:text-3xl`
- Botao primario: Texto reduzido no mobile

### 3.4 Dashboard Components
**Arquivo: `src/components/dashboard/DashboardBookings.tsx`**
- Cards de reserva: Reduzir `min-w-[250px]` para `min-w-[200px]` no mobile

### 3.5 Dashboard Service Orders
**Arquivo: `src/components/dashboard/DashboardServiceOrders.tsx`**
- Grid `lg:grid-cols-3` ja ok
- Header do card: Garantir `flex-wrap` nos filtros

### 3.6 Configuracoes
**Arquivo: `src/pages/Configuracoes.tsx`**
- TabsList: Envolver em container com overflow-x-auto para scroll horizontal no mobile
- Padding geral: Reduzir em telas menores

---

## Detalhes Tecnicos

Todas as alteracoes sao exclusivamente em `className` props. Nenhum hook, state, API call ou logica de negocio sera modificado. Todas as classes usam prefixos responsivos do Tailwind (`sm:`, `md:`, `lg:`) para preservar o layout desktop atual.

### Arquivos modificados:
1. `src/components/ui/sonner.tsx` -- duration, closeButton, estilo
2. `src/components/ui/dialog.tsx` -- max-h + overflow mobile
3. `src/pages/Relatorios.tsx` -- tabs scroll, grids responsivos
4. `src/pages/Dashboard.tsx` -- header e grid responsivos
5. `src/components/dashboard/DashboardBookings.tsx` -- card widths
6. `src/pages/Configuracoes.tsx` -- tabs scroll
7. `src/components/bookings/TechnicianBookingSheet.tsx` -- largura responsiva
8. `src/components/bookings/BookingOrderSheet.tsx` -- largura responsiva
9. `src/components/bookings/BeautyBookingSheet.tsx` -- largura responsiva
