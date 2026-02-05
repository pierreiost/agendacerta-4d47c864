
# Plano: Bloquear Cliques em Horários/Dias Retroativos na Agenda

## Problema Identificado

Os componentes de visualização da agenda permitem cliques em:
1. **DayView**: Slots de hora passados (mesmo no dia atual)
2. **WeekViewNew**: Qualquer dia/hora já passados
3. **MonthView**: Qualquer dia passado

Os wizards de agendamento já têm validação no calendário (`disabled={(date) => isBefore(date, startOfDay(new Date()))}`), mas o usuário consegue iniciar o fluxo clicando em horários passados na agenda.

## Solução

Adicionar validação nos handlers de clique de cada view para bloquear interações com horários retroativos.

---

## Alterações por Componente

### 1. DayView.tsx (Visualização Diária)

**Arquivo:** `src/components/agenda/DayView.tsx`

**Alteração na função `handleSlotClick` (linha ~328-346):**

```typescript
const handleSlotClick = (hour: number, event?: React.MouseEvent) => {
  // Calcular minutos do clique
  let minutes = 0;
  if (event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const rawMinutes = (clickY / HOUR_HEIGHT) * 60;
    minutes = snapMinutesToSlot(rawMinutes);
  }

  const finalHour = hour + Math.floor(minutes / 60);
  const finalMinutes = minutes % 60;
  const slotDate = setMinutes(setHours(date, finalHour), finalMinutes);
  
  // NOVO: Bloquear horários passados
  const now = new Date();
  if (isBefore(slotDate, now)) {
    return; // Não fazer nada para horários passados
  }
  
  const primarySpaceId = spaces.length > 0 ? spaces[0].id : '';
  if (primarySpaceId) {
    onSlotClick(primarySpaceId, slotDate, finalHour);
  }
};
```

**Alteração visual nos slots (linha ~420-429):**
- Adicionar estilo visual para indicar slots passados (opacidade reduzida, cursor not-allowed)
- Remover `hover:bg-primary/10` para slots passados

---

### 2. WeekViewNew.tsx (Visualização Semanal)

**Arquivo:** `src/components/agenda/WeekViewNew.tsx`

**Adicionar imports necessários:**
```typescript
import { isBefore, setHours, setMinutes } from 'date-fns';
```

**Alteração nos slots de hora (linha ~266-272):**

```typescript
{HOURS.map((hour) => {
  const slotDateTime = setMinutes(setHours(day, hour), 0);
  const isPast = isBefore(slotDateTime, now);
  
  return (
    <div
      key={hour}
      className={cn(
        'border-b border-border transition-colors',
        isPast 
          ? 'bg-muted/30 cursor-not-allowed' 
          : 'hover:bg-muted/50 cursor-pointer'
      )}
      style={{ height: HOUR_HEIGHT }}
      onClick={() => {
        if (!isPast && primarySpaceId) {
          onSlotClick(primarySpaceId, day, hour);
        }
      }}
    />
  );
})}
```

---

### 3. MonthView.tsx (Visualização Mensal)

**Arquivo:** `src/components/agenda/MonthView.tsx`

**Adicionar import necessário:**
```typescript
import { isBefore, startOfDay } from 'date-fns';
```

**Alteração no clique de dia (linha ~106-116):**

```typescript
{week.map((day) => {
  const dayBookings = getBookingsForDay(day);
  const spaceDots = getSpaceDotsForDay(day);
  const isCurrentMonth = isSameMonth(day, date);
  const today = isToday(day);
  const isPastDay = isBefore(day, startOfDay(new Date())); // NOVO

  return (
    <div
      key={day.toISOString()}
      className={cn(
        'min-h-[50px] md:min-h-[70px] p-1 md:p-1.5 border-r border-border last:border-r-0',
        'transition-colors duration-200',
        !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
        today && 'bg-primary/5',
        isPastDay 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-muted/50 cursor-pointer'
      )}
      onClick={() => {
        if (!isPastDay) { // NOVO: só permite clique se não for dia passado
          onDayClick(day);
        }
      }}
    >
```

---

### 4. Agenda.tsx (Handler Principal)

**Arquivo:** `src/pages/Agenda.tsx`

**Alteração no `handleSlotClick` (linha ~171-176):**

Adicionar validação extra como fallback de segurança:

```typescript
const handleSlotClick = useCallback((spaceId: string, date: Date, hour: number) => {
  // Validação de segurança: não permitir horários passados
  const slotTime = setMinutes(setHours(date, hour), 0);
  if (isBefore(slotTime, new Date())) {
    return;
  }
  
  const targetSpaceId = primarySpaceId || spaceId;
  setDefaultSlot({ spaceId: targetSpaceId, date, hour });
  setWizardOpen(true);
}, [primarySpaceId]);
```

---

## Feedback Visual

Para melhorar a UX, os slots/dias passados terão:

| Estado | Estilo |
|--------|--------|
| Passado | `opacity-50`, `cursor-not-allowed`, sem hover effect |
| Disponível | `cursor-pointer`, `hover:bg-muted/50` ou `hover:bg-primary/10` |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/agenda/DayView.tsx` | Bloquear slots passados + estilo visual |
| `src/components/agenda/WeekViewNew.tsx` | Bloquear slots passados + estilo visual |
| `src/components/agenda/MonthView.tsx` | Bloquear dias passados + estilo visual |
| `src/pages/Agenda.tsx` | Validação de fallback no handler |

---

## Validação

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Clicar em horário passado no dia atual | Nada acontece, cursor indica bloqueio |
| Clicar em dia passado na visualização mensal | Nada acontece |
| Clicar em horário futuro | Abre wizard normalmente |
| Arrastar reserva para horário passado | Já é bloqueado pelo handler existente |

---

## Impacto em Segmentos

Esta correção afeta **todos os segmentos** uniformemente:
- **Sports**: DayView, WeekViewNew, MonthView
- **Beauty/Health**: Mesmo comportamento
- **Custom (Técnico)**: Mesmo comportamento

Não há lógica específica por segmento necessária - o bloqueio de horários retroativos é universal.
