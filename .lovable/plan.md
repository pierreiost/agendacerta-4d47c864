

# Plano: Habilitar Serviços para Segmento Custom + Desfazer Bloqueio de Agenda

## Parte 1: Habilitar Módulo de Serviços para Custom

### Problema
O segmento `custom` (Assistência Técnica) precisa cadastrar serviços para serem usados nas Ordens de Serviço, mas atualmente o módulo está bloqueado.

### Alterações

#### 1.1 `src/lib/segment-utils.ts` - Incluir custom como serviço
```typescript
// Linha 6-8: Alterar função para incluir custom
export function isServiceSegment(segment?: string | null): boolean {
  return segment === 'beauty' || segment === 'health' || segment === 'custom';
}
```

#### 1.2 `src/components/layout/AppSidebar.tsx` - Mostrar menu Serviços para custom
```typescript
// Linha 111: Alterar isServiceVenue para incluir custom
const isServiceVenue = venueSegment === 'beauty' || venueSegment === 'health' || venueSegment === 'custom';
```

#### 1.3 `src/pages/Servicos.tsx` - Permitir acesso para custom
```typescript
// Linha 102: Alterar isServiceVenue para incluir custom
const isServiceVenue = venueSegment === 'beauty' || venueSegment === 'health' || venueSegment === 'custom';
```

---

## Parte 2: Desfazer Bloqueio de Horários Retroativos

### Alterações a Reverter

#### 2.1 `src/components/agenda/DayView.tsx`

**handleSlotClick (linhas 345-348)** - Remover bloqueio:
```typescript
// REMOVER estas linhas:
// Bloquear horários passados
if (isBefore(slotDate, new Date())) {
  return;
}
```

**Grid de horários (linhas 417-440)** - Remover lógica de isPastSlot:
```typescript
// Voltar para:
{HOURS.map((hour) => {
  const slotDateTime = setMinutes(setHours(date, hour), 0);
  
  return (
    <div key={hour} className="flex" style={{ height: HOUR_HEIGHT }}>
      {/* Label da hora */}
      <div className="w-14 md:w-16 ...">
        ...
      </div>

      {/* Área clicável única */}
      <div
        className="flex-1 border-b border-border relative transition-colors duration-150 cursor-pointer hover:bg-primary/5"
        onClick={(e) => handleSlotClick(hour, e)}
      >
```

#### 2.2 `src/components/agenda/WeekViewNew.tsx`

**Slots de hora (linhas 272-292)** - Remover lógica de isPast:
```typescript
// Voltar para:
{HOURS.map((hour) => (
  <div
    key={hour}
    className="border-b border-border transition-colors hover:bg-muted/50 cursor-pointer"
    style={{ height: HOUR_HEIGHT }}
    onClick={() => {
      if (primarySpaceId) {
        onSlotClick(primarySpaceId, day, hour);
      }
    }}
  />
))}
```

#### 2.3 `src/components/agenda/MonthView.tsx`

**Clique no dia (linhas 107-125)** - Remover lógica de isPastDay:
```typescript
// Remover isPastDay e voltar ao comportamento original:
{week.map((day) => {
  const dayBookings = getBookingsForDay(day);
  const spaceDots = getSpaceDotsForDay(day);
  const isCurrentMonth = isSameMonth(day, date);
  const today = isToday(day);

  return (
    <div
      key={day.toISOString()}
      className={cn(
        'min-h-[50px] md:min-h-[70px] p-1 md:p-1.5 border-r border-border last:border-r-0',
        'transition-colors duration-200 hover:bg-muted/50 cursor-pointer',
        !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
        today && 'bg-primary/5'
      )}
      onClick={() => onDayClick(day)}
    >
```

#### 2.4 `src/pages/Agenda.tsx`

**handleSlotClick (linhas 177-181)** - Remover validação de segurança:
```typescript
// REMOVER:
// Validação de segurança: não permitir horários passados
const slotTime = setMinutes(setHours(date, hour), 0);
if (isBefore(slotTime, new Date())) {
  return;
}

// Manter apenas:
const handleSlotClick = useCallback((spaceId: string, date: Date, hour: number) => {
  const targetSpaceId = primarySpaceId || spaceId;
  setDefaultSlot({ spaceId: targetSpaceId, date, hour });
  setWizardOpen(true);
}, [primarySpaceId]);
```

---

## Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/segment-utils.ts` | Incluir `custom` em `isServiceSegment()` |
| `src/components/layout/AppSidebar.tsx` | Incluir `custom` em `isServiceVenue` |
| `src/pages/Servicos.tsx` | Incluir `custom` em `isServiceVenue` |
| `src/components/agenda/DayView.tsx` | Remover bloqueio de horários passados |
| `src/components/agenda/WeekViewNew.tsx` | Remover bloqueio de horários passados |
| `src/components/agenda/MonthView.tsx` | Remover bloqueio de dias passados |
| `src/pages/Agenda.tsx` | Remover validação de segurança no handler |

---

## Comportamento Final

| Segmento | Menu Serviços | Página Serviços | Uso na OS |
|----------|---------------|-----------------|-----------|
| sports | ❌ Oculto (pois usa espaços) | ❌ Bloqueada | N/A |
| beauty | ✅ Visível | ✅ Acessível | ✅ |
| health | ✅ Visível | ✅ Acessível | ✅ |
| **custom** | ✅ Visível | ✅ Acessível | ✅ |

| Agenda | Comportamento |
|--------|---------------|
| Clique em horário passado | Permitido (abre wizard normalmente) |
| Visual de slots passados | Normal (sem opacidade/bloqueio) |

