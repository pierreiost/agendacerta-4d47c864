

## Diagnóstico

Analisei o `BookingWizard.tsx`, `dialog.tsx` e o `tailwind.config.ts`. Dois problemas distintos:

### 1. Auto-submit no Step 3
O `<form onSubmit={handleSubmit(onSubmit)}>` envolve todo o wizard. Quando o usuário clica "Continuar" no step 2, o `setStep(3)` roda, mas não há nenhuma guard no `onSubmit` que impeça submissão se `step !== 3`. Se por algum motivo o form disparar submit (ex: enter implícito, double-click rápido que pega o botão "Confirmar" que aparece no lugar do "Continuar"), a reserva é criada imediatamente.

**Correção**: Adicionar guard `if (step !== 3) return;` no início do `onSubmit`. Isso garante que, mesmo que o form submeta acidentalmente, nada acontece se não estiver na tela 3.

### 2. Scroll não funciona com mouse wheel
O `DialogContent` usa `overflow-hidden` que bloqueia propagação de scroll para filhos. O `overflow-y-auto` na div interna deveria funcionar, mas o Radix Dialog pode estar interceptando o evento de scroll. O `overflow-hidden` no container pai impede o scroll nativo de borbulhar.

**Correção**: Trocar a estrutura: remover `overflow-hidden` do `DialogContent` e usar `max-h-[92dvh] overflow-y-auto` diretamente. O header e footer ficam dentro do fluxo normal do scroll (não fixos via flex), usando `sticky` para o footer ficar sempre visível.

Alternativa mais limpa: manter `overflow-hidden` no `DialogContent` mas garantir que a div scrollável tenha altura explícita calculada (não depender de `flex-1 min-h-0` que pode falhar em certos browsers). Usar `overflow-y-auto` com `-webkit-overflow-scrolling: touch`.

### 3. Cores "estouradas"
As classes `bg-primary-500`, `bg-success-600`, `bg-accent-100` resolvem para cores com saturação 84%, que são muito vibrantes. Trocar para classes padrão do shadcn/tailwind: `bg-primary`, `text-primary-foreground`, `bg-green-50`, etc.

## Plano de implementação

### Arquivo: `src/components/agenda/BookingWizard.tsx`

1. **Guard no onSubmit**: Adicionar `if (step !== 3) return;` como primeira linha
2. **Reestruturar layout do modal**:
   - `DialogContent`: `max-h-[92dvh] flex flex-col p-0 gap-0` (sem `overflow-hidden`)
   - Header (progress + title): `shrink-0`
   - Body: `flex-1 min-h-0 overflow-y-auto overscroll-contain` (scroll nativo, sem ScrollArea)
   - Footer: `shrink-0 sticky bottom-0`
3. **Corrigir cores**: Substituir todas as classes de cor com número (`primary-500`, `success-50`, `accent-100` etc.) por equivalentes neutros/padrão:
   - `bg-primary-500` → `bg-primary`
   - `bg-primary-600` → `bg-primary/90`
   - `bg-primary-100` → `bg-primary/10`
   - `text-primary-600` → `text-primary`
   - `bg-success-50` → `bg-green-50`
   - `bg-success-600` → `bg-green-600`
   - `bg-accent-100` → `bg-muted`
   - `text-accent-600` → `text-muted-foreground`
   - `border-primary-500` → `border-primary`

### Arquivos: `ServiceBookingWizard.tsx`, `TechnicianBookingWizard.tsx`
- Mesma correção de estrutura de scroll (se aplicável)
- Mesma correção de cores estouradas

### Resultado esperado
- Step 3 sempre para e mostra resumo + toggle recorrência
- Scroll funciona via mouse wheel e touch
- Cores neutras e profissionais, sem saturação excessiva

