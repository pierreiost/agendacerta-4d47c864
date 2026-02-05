
# Plano: Corrigir Agenda para Segmentos de Serviço (Sem Espaços)

## Problema Identificado

Para segmentos **beauty**, **health** e **custom**, não existem espaços cadastrados. Isso causa:

| Componente | Comportamento Atual | Problema |
|------------|---------------------|----------|
| `DayView.tsx` | Verifica `spaces.length === 0` → Mostra "Nenhum espaço selecionado" | ❌ Bloqueia a visualização |
| `WeekViewNew.tsx` | Verifica `spaces.length === 0` → Mostra "Nenhum espaço selecionado" | ❌ Bloqueia a visualização |
| `MonthView.tsx` | Não tem verificação | ✅ Funciona |
| `Agenda.tsx` | Já trata `isServiceBasedSegment` para a mensagem principal | ✅ OK |

## Solução

Passar uma nova prop `isServiceBased` para as views, ou remover a verificação de espaços vazios e deixar renderizar normalmente (já que os bookings são filtrados por segmento no backend).

### Opção Escolhida: Passar prop de contexto

Passar `venueSegment` ou `isServiceBased` para `DayView` e `WeekViewNew` para que saibam que não precisam de espaços.

---

## Alterações

### 1. Agenda.tsx - Passar prop para as views

**Linhas 349-369:**

```typescript
{viewMode === 'day' && (
  <DayView
    date={currentDate}
    spaces={filteredSpaces}
    bookings={filteredBookings}
    allSpaces={activeSpaces}
    onSlotClick={handleSlotClick}
    onBookingClick={handleBookingClick}
    onBookingMove={handleBookingMove}
    onBookingResize={handleBookingResize}
    isServiceBased={isServiceBasedSegment}  // NOVO
  />
)}
{viewMode === 'week' && (
  <WeekViewNew
    date={currentDate}
    spaces={filteredSpaces}
    bookings={filteredBookings}
    allSpaces={activeSpaces}
    onSlotClick={handleSlotClick}
    onBookingClick={handleBookingClick}
    isServiceBased={isServiceBasedSegment}  // NOVO
  />
)}
```

---

### 2. DayView.tsx - Aceitar prop e remover bloqueio

**Interface (linha ~27-36):**

```typescript
interface DayViewProps {
  date: Date;
  spaces: Space[];
  bookings: Booking[];
  allSpaces: Space[];
  onSlotClick: (spaceId: string, date: Date, hour: number) => void;
  onBookingClick: (booking: Booking) => void;
  onBookingMove?: (bookingId: string, spaceId: string, newStart: Date, newEnd: Date) => void;
  onBookingResize?: (bookingId: string, newStart: Date, newEnd: Date) => void;
  isServiceBased?: boolean;  // NOVO
}
```

**Verificação de espaços vazios (linhas 367-376):**

```typescript
// Só mostrar erro de espaços vazios para segmentos que precisam de espaços (sports)
if (spaces.length === 0 && !isServiceBased) {
  return (
    <Card className="flex-1 flex items-center justify-center p-8">
      <div className="text-center text-muted-foreground">
        <p>Nenhum espaço selecionado</p>
        <p className="text-sm">Selecione espaços na barra lateral para visualizar a agenda</p>
      </div>
    </Card>
  );
}
```

---

### 3. WeekViewNew.tsx - Aceitar prop e remover bloqueio

**Interface (linha ~27-34):**

```typescript
interface WeekViewNewProps {
  date: Date;
  spaces: Space[];
  bookings: Booking[];
  allSpaces: Space[];
  onSlotClick: (spaceId: string, date: Date, hour: number) => void;
  onBookingClick: (booking: Booking) => void;
  isServiceBased?: boolean;  // NOVO
}
```

**Verificação de espaços vazios (linhas 197-205):**

```typescript
// Só mostrar erro de espaços vazios para segmentos que precisam de espaços (sports)
if (spaces.length === 0 && !isServiceBased) {
  return (
    <Card className="flex-1 flex items-center justify-center p-8">
      <div className="text-center text-muted-foreground">
        <p>Nenhum espaço selecionado</p>
      </div>
    </Card>
  );
}
```

---

## Comportamento Final

| Segmento | Espaços | DayView | WeekView | MonthView |
|----------|---------|---------|----------|-----------|
| **sports** | Tem | Renderiza grade + bookings | Renderiza grade + bookings | ✅ |
| **sports** | Nenhum selecionado | Mostra "Nenhum espaço selecionado" | Mostra mensagem | ✅ |
| **beauty** | Não tem | Renderiza grade + bookings (sem espaço) | ✅ | ✅ |
| **health** | Não tem | Renderiza grade + bookings | ✅ | ✅ |
| **custom** | Não tem | Renderiza grade + bookings | ✅ | ✅ |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Agenda.tsx` | Passar `isServiceBased={isServiceBasedSegment}` para DayView e WeekViewNew |
| `src/components/agenda/DayView.tsx` | Adicionar prop `isServiceBased` + condicional na verificação |
| `src/components/agenda/WeekViewNew.tsx` | Adicionar prop `isServiceBased` + condicional na verificação |
