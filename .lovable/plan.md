

# Plano de Melhorias e Correções

## Resumo

4 itens a implementar: calendário mensal na página pública, títulos editáveis nas seções, correção do crash na agenda interna e persistência do toggle ativo/inativo.

---

## 1. Calendário Mensal na Página Pública (ServiceBookingWidget)

**Problema:** O Step 2 do `ServiceBookingWidget` exibe um seletor semanal (7 dias por vez com navegação por setas). O cliente quer uma visão mensal.

**Solução:** Substituir o seletor semanal customizado pelo componente `Calendar` (react-day-picker) já existente em `src/components/ui/calendar.tsx`.

**Arquivo:** `src/components/public-page/ServiceBookingWidget.tsx`
- Remover os estados `weekStart` e `weekDays`
- Importar `Calendar` de `@/components/ui/calendar`
- No Step 2, substituir o grid de 7 dias por `<Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={{ before: new Date() }} />`
- Manter o botão "Continuar" abaixo

Também aplicar ao `BookingWidget.tsx` (esportes) para consistência, caso o step de data use o mesmo padrão semanal.

---

## 2. Títulos Editáveis nas Seções da Página Pública

**Problema:** Os títulos das seções (ex: "Conheça nosso espaço", "O que dizem sobre nós", "Perguntas Frequentes", etc.) são fixos no código.

**Solução:**

**a) Atualizar o tipo `PublicPageSections`** em `src/types/public-page.ts`:
- Adicionar campo `title?: string` em cada interface de seção: `GallerySection`, `TestimonialsSection`, `FaqSection`, `StatsSection`, `LocationSection`, `HoursSection`
- Adicionar valores padrão em `DEFAULT_SECTIONS`

**b) Adicionar campo de edição** em `src/pages/PublicPageConfig.tsx`:
- Em cada aba de seção, adicionar um `<Input>` para "Título da Seção" logo abaixo do toggle de "Seção ativa"

**c) Usar o título customizado** nos componentes de renderização:
- `GallerySection.tsx`: `section.title || 'Conheça nosso espaço'`
- `TestimonialsSection.tsx`: `section.title || 'O que dizem sobre nós'`
- `FaqSection.tsx`: `section.title || 'Perguntas Frequentes'`
- `StatsSection.tsx`: (adicionar título, não tem atualmente)
- `LocationSection.tsx`: `section.title || 'Nossa Localização'`
- `HoursSection.tsx`: `section.title || 'Horários de Funcionamento'`

---

## 3. Correção da Instabilidade na Agenda Interna

**Problema:** Ao clicar em um serviço/reserva na agenda, o `BeautyBookingSheet` abre e dispara queries (`useBookingById`, `useBookingServices`, `useOrderItems`). Se alguma dessas queries falhar ou o componente montar/desmontar rapidamente, o `AppErrorBoundary` captura o erro e solicita limpeza de cache.

**Diagnóstico provável:** O `BeautyBookingSheet` renderiza com `booking` ainda `null` (antes do fetch completar), e hooks internos como `useBookingServices` e `useOrderItems` são chamados com `booking?.id ?? null`. O problema pode ocorrer quando `initialBooking` muda para `null` ao fechar o sheet, mas os hooks ainda estão ativos.

**Solução em `src/components/bookings/BeautyBookingSheet.tsx`:**
- Adicionar invalidação de queries no `onSuccess` das mutações de status (confirm/cancel) para garantir que o cache atualize imediatamente
- Proteger a renderização: só renderizar o conteúdo completo quando `open && booking` (evitando renders com dados parciais)
- Invalidar `['booking', id]` e `['bookings']` após mutations

**Solução similar em `src/hooks/useBookingMutations.ts`:**
- Após `updateBooking.onSuccess`, invalidar também `['booking', data.id]` para que o sheet individual atualize

---

## 4. Persistência do Toggle Ativo/Inativo

**Problema:** O toggle `publicPageEnabled` é um estado local inicializado como `false`. Ao trocar de aba ou atualizar o navegador, o estado retorna para `false` porque:
1. O `hasLoadedFromDbRef.current` já é `true` (pois já carregou uma vez), impedindo re-leitura do DB
2. Se o componente remonta (troca de rota e volta), o ref reseta mas pode haver uma race condition com o draft do `useStatePersist`

**Solução em `src/pages/PublicPageConfig.tsx`:**
- Resetar `hasLoadedFromDbRef.current = false` quando `currentVenue?.id` mudar (para suportar troca de venue)
- Persistir `publicPageEnabled` no `localStorage` junto com o mecanismo existente de `useStatePersist`, ou simplesmente sempre re-ler do banco ao montar
- Solução mais simples: remover o `hasLoadedFromDbRef` e usar uma query React Query para buscar os dados da venue, garantindo cache e refetch automático
- Alternativa direta: ao salvar com sucesso (`handleSave`), chamar `queryClient.invalidateQueries({ queryKey: ['venues'] })` para que o `VenueContext` também atualize com o novo estado

---

## Detalhes Técnicos

### Arquivos a modificar:
1. `src/types/public-page.ts` - Adicionar `title?: string` nas interfaces
2. `src/components/public-page/ServiceBookingWidget.tsx` - Trocar seletor semanal por Calendar mensal
3. `src/components/public-page/GallerySection.tsx` - Usar título dinâmico
4. `src/components/public-page/TestimonialsSection.tsx` - Usar título dinâmico
5. `src/components/public-page/FaqSection.tsx` - Usar título dinâmico
6. `src/components/public-page/StatsSection.tsx` - Usar título dinâmico
7. `src/components/public-page/LocationSection.tsx` - Usar título dinâmico
8. `src/components/public-page/HoursSection.tsx` - Usar título dinâmico
9. `src/pages/PublicPageConfig.tsx` - Campos de edição de título + correção da persistência do toggle
10. `src/components/bookings/BeautyBookingSheet.tsx` - Proteção contra renders parciais
11. `src/hooks/useBookingMutations.ts` - Invalidação de query individual do booking

### Nenhuma migration SQL necessária
Todos os títulos customizados ficam dentro do campo JSONB `public_page_sections`, que já existe.

