
Objetivo: corrigir de forma definitiva os modais de reserva (sports + demais variações) para não cortar conteúdo e sempre permitir scroll em mobile/desktop, com validação de produção.

Escopo que vou atacar
- `BookingWizard` (sports)
- `ServiceBookingWizard` (beauty/health)
- `TechnicianBookingWizard` (custom)
- `CustomerFormDialog` (modal filho acionado no fluxo de reserva)
- Ajuste fino em `ScrollArea` compartilhado (se necessário para estabilidade do scroll em todos os modais)

Diagnóstico do problema atual
1. No `BookingWizard`, o `ScrollArea` está com `max-h` mas sem altura efetiva no fluxo do layout; com `Viewport` em `h-full`, isso pode impedir o overflow real.
2. Os `DialogContent` dos wizards usam `overflow-hidden`, removendo o scroll de fallback do próprio dialog.
3. `ServiceBookingWizard` e `TechnicianBookingWizard` não têm um “body scrollável” principal (logo, em telas menores o conteúdo pode cortar).
4. O ajuste global recente em `scroll-area.tsx` (`[&>div]:!block`) pode interferir no comportamento padrão do Radix em alguns cenários de medição/overflow.
5. Há warnings de acessibilidade em modal (Title/Description) que precisam ser saneados no fluxo de reserva para evitar erro de UX/produção.

Plano de correção (implementação)
1) Padronizar arquitetura dos 3 Booking Wizards
- Transformar `DialogContent` em layout de coluna com áreas fixas + área scrollável:
  - topo: progresso + título (fixos)
  - meio: conteúdo do step (scrollável)
  - rodapé: ações (fixo)
- Aplicar classes estruturais consistentes:
  - `DialogContent`: `max-h-[92dvh]`, `overflow-hidden`, `flex flex-col`, `gap-0`
  - área central: `flex-1 min-h-0`
  - `ScrollArea`: `h-full w-full overflow-hidden`
- Resultado: footer nunca corta, e o corpo sempre rola quando crescer (ex.: observações, recorrência, listas longas).

2) Corrigir especificamente o `BookingWizard` (sports)
- Reestruturar `<form>` para `flex flex-col min-h-0`.
- Colocar o bloco dos steps dentro da área scrollável principal.
- Garantir padding inferior no conteúdo do scroll para não “encostar” no footer.
- Manter comportamento de steps e validação sem alterar regras de negócio.

3) Levar a mesma correção para `ServiceBookingWizard` e `TechnicianBookingWizard`
- Criar body scrollável principal igual ao sports.
- Preservar os blocos internos já existentes (ex.: listas de horário/serviços), evitando regressão funcional.
- Se houver conflito de nested scroll em mobile, ajustar o bloco interno para `max-h` menor ou remover scroll interno no mobile e deixar o scroll principal dominar.

4) Revisão do `ScrollArea` compartilhado
- Validar se o override `[&>div]:!block` está causando regressão.
- Se confirmado, voltar para comportamento padrão do Radix/shadcn no viewport.
- Manter mudanças locais nos modais (com altura explícita + `min-h-0`) como base principal da correção.

5) Acessibilidade e “zero warning” no fluxo de reserva
- Garantir `DialogTitle` presente em todos os modais de reserva.
- Adicionar `DialogDescription` (ou `aria-describedby={undefined}` quando aplicável) para remover warnings no console.
- Aplicar nos 3 wizards e no `CustomerFormDialog`.

Arquivos previstos
- `src/components/agenda/BookingWizard.tsx`
- `src/components/agenda/ServiceBookingWizard.tsx`
- `src/components/agenda/TechnicianBookingWizard.tsx`
- `src/components/customers/CustomerFormDialog.tsx`
- `src/components/ui/scroll-area.tsx` (condicional, após validação de regressão)

Detalhes técnicos
```text
DialogContent (max-h: 92dvh, flex-col, overflow-hidden)
├─ Header/Progress (shrink-0)
├─ Body Wrapper (flex-1 min-h-0)
│  └─ ScrollArea (h-full w-full overflow-hidden)
│     └─ Step Content (px/py + padding bottom)
└─ Footer Actions (shrink-0, sempre visível)
```

Critérios de aceite (produção)
- Em 480x852 (viewport atual), 390x844 e desktop:
  - não há corte de conteúdo em nenhum step
  - scroll funciona por gesto/touch e mouse wheel
  - footer permanece visível e clicável
- Em “Observações” com conteúdo grande:
  - o modal continua navegável sem truncar campos/botões
- Sem warnings de `DialogTitle`/`Description` no fluxo de reserva.
- Sem regressão nos calendários e demais componentes que usam `ScrollArea`.
