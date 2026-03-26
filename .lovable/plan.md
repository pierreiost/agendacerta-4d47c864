

## Plano: Preço editável nos Wizards de Reserva

### Contexto
Três wizards criam reservas com fluxos de preço distintos:
- **BookingWizard** (sports): `hours × price_per_hour`, enviado via RPC `create_booking_atomic`
- **ServiceBookingWizard** (beauty/health): soma dos `service.price`, via RPC `create_service_booking` 
- **TechnicianBookingWizard** (custom): sem preço exibido atualmente

### Abordagem
Adicionar um `<Input type="number">` editável na tela de confirmação de cada wizard. O valor inicia com o preço calculado e pode ser alterado para qualquer valor (incluindo R$ 0). Após a criação da reserva, se o valor customizado diferir do calculado, fazemos um `UPDATE` no `grand_total` do booking criado.

### Alterações por arquivo

**1. `BookingWizard.tsx` (Step 3)**
- Novo estado `customPrice: number | null`
- Ao entrar no Step 3, inicializar `customPrice` com `pricePreview`
- Substituir o Card de preço estático por Input editável com label "Valor a cobrar"
- No `doSubmit`, após `createBookingAtomic` ou `createRecurringBookings` retornar o booking_id, se `customPrice !== pricePreview`, executar `supabase.from('bookings').update({ grand_total: customPrice })`
- Para recorrentes: aplicar o valor por reserva (customPrice / recurrenceCount) ou o valor total — usar o campo como "valor por reserva" com indicação clara

**2. `ServiceBookingWizard.tsx` (Step 4)**
- Novo estado `customPrice: number | null`
- Ao entrar no Step 4 (confirmação), inicializar com `totalPrice` (ou R$ 0 se `usePackage`)
- Substituir exibição estática do total por Input editável
- No `onSubmit`, após o RPC `create_service_booking` retornar o booking_id, executar `supabase.from('bookings').update({ grand_total: customPrice })` se diferir

**3. `TechnicianBookingWizard.tsx` (Step 3)**
- Novo estado `customPrice: number` (default 0)
- Adicionar Input de preço no card de resumo
- No `doSubmit`, após o insert, executar update no `grand_total` com o valor informado

### UI do Input (igual nos 3 wizards)
```
<div>
  <Label>Valor a cobrar nesta reserva</Label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
    <Input 
      type="number" 
      min="0" 
      step="0.01"
      value={customPrice}
      onChange={e => setCustomPrice(Number(e.target.value))}
      className="pl-10 text-lg font-bold"
    />
  </div>
</div>
```

### Fluxo de dados
- O preço do catálogo **não** é alterado — apenas o `grand_total` da reserva individual
- A trigger `calculate_booking_totals` pode recalcular o total; precisamos verificar se ela sobrescreve updates manuais. Se sim, o update deve ser feito com `space_total` (sports) ou via `booking_services.price` (service)
- Para sports: enviar `customPrice / hours` como `space_price_per_hour` no RPC (mais limpo que update pós-criação)
- Para service: update pós-criação no `grand_total` é necessário pois o RPC lê preços do catálogo

### Segurança
- Validação client-side: `min=0`, `step=0.01`, sanitização via `Number()`
- O update usa o booking_id retornado e RLS já protege por `venue_member`
- Nenhuma alteração no schema do banco

### Telas impactadas
- Agenda (modal de nova reserva — todos os 3 segmentos)
- Nenhuma outra tela é afetada (o valor salvo já é lido de `grand_total` em todo o sistema)

