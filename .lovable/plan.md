
Objetivo: parar o auto-fechamento/auto-finalização no wizard de reserva (sports) de forma robusta, mantendo Step 3 visível para revisão/recorrência e garantindo scroll com wheel.

Diagnóstico (com base no replay + código atual)
- O submit está acontecendo imediatamente após entrar no Step 3.
- No `BookingWizard`, o CTA muda no mesmo lugar de “Continuar” para “Confirmar Reserva”; em clique rápido/duplo ocorre “click-through” (o segundo clique pega o botão de confirmar).
- O wizard sports ainda usa `<form onSubmit=...>`, então existem caminhos implícitos de submit (Enter/comportamento nativo), mesmo com guard `step !== 3`.

Plano de implementação (definitivo)

1) Blindar submit no `BookingWizard` (principal)
- Arquivo: `src/components/agenda/BookingWizard.tsx`
- Remover submit implícito:
  - Trocar `<form>` por container `<div>` (como já foi feito no service wizard).
  - Botão final vira `type="button"` com `onClick={handleFinalConfirm}`.
- Criar trava anti-click-through:
  - Estado `confirmArmed` (false ao entrar no step 3).
  - Ao avançar de step 2 -> 3: desarmar confirmação e armar após pequeno delay (ex.: 450–700ms).
  - Enquanto desarmado, botão final fica desabilitado e com texto “Revise os dados”.
- Criar trava anti-duplo submit:
  - `submitLockRef` + validação `if (submitLockRef.current || isPending) return;`
  - Liberar lock apenas no `onSettled`.
- Manter guard de segurança no `onSubmit`: `if (step !== 3) return`.

2) Navegação entre etapas sem evento residual
- Centralizar avanço em função única `goToNextStep()`:
  - valida pré-condições;
  - usa `setStep((s) => s + 1)` funcional;
  - ativa `confirmArmed` somente quando realmente entrar no step 3.
- Não reutilizar o mesmo fluxo de click para confirmar no mesmo frame (sem submit nativo).

3) Scroll com wheel estável no wizard sports
- Manter um único container de scroll do body:
  - `flex-1 min-h-0 overflow-y-auto overscroll-contain`.
- Garantir que header/footer permaneçam fixos (`shrink-0`) e conteúdo role no meio.
- Evitar scroll concorrente no mesmo step (sem nested scroll desnecessário na tela de confirmação).

4) Ajuste visual (cores menos “estouradas”)
- Arquivo: `src/components/agenda/BookingWizard.tsx`
- Substituir cores saturadas por tokens semânticos:
  - botão final: `bg-primary hover:bg-primary/90` (remover verde forte);
  - card de total: `bg-muted/40` + borda padrão;
  - manter contraste acessível (`text-primary-foreground`, `text-muted-foreground`).

5) Padronização preventiva nos outros wizards
- Arquivos:
  - `src/components/agenda/ServiceBookingWizard.tsx`
  - `src/components/agenda/TechnicianBookingWizard.tsx`
- Aplicar a mesma estratégia de confirmação explícita (sem submit implícito onde ainda houver `<form>`), para evitar regressão semelhante.

6) Estabilização adicional (warning de console que pode afetar UX/foco de modal)
- Arquivo: `src/components/bookings/DuplicateCustomerDialog.tsx` (+ usos)
- Corrigir warning de ref em `AlertDialog`/componentes filhos para eliminar ruído e possíveis efeitos colaterais de foco em dialogs aninhados.

Plano de testes “ao máximo” (antes de considerar concluído)
- Cenários de clique:
  - clique único em “Continuar” no step 2;
  - clique duplo rápido em “Continuar”;
  - spam de clique no canto do botão ao trocar de step.
- Cenários de teclado:
  - Enter nos campos do step 2 e step 3 (não pode finalizar sem clique explícito no botão final armado).
- Cenários de recorrência:
  - step 3 abre e permanece;
  - toggle recorrência on/off;
  - confirmar somente após escolha/revisão.
- Scroll:
  - wheel do mouse no step 2 e 3;
  - viewport atual (1176x852), 390x844 e 480x852.
- Resultado esperado:
  - nunca cria reserva sem ação explícita de confirmação no step 3;
  - step 3 sempre permanece visível para revisão;
  - scroll funcional por wheel/touch;
  - cores equilibradas e legíveis.
