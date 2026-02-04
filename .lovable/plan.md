

## Plano de Correção: Bugs nas Ordens de Serviço (OS)

### Resumo dos Problemas Encontrados

Foram identificados **3 bugs principais** no módulo de Ordens de Serviço:

1. **Bug de cálculo do ISS (imposto)**: ✅ CORRIGIDO - O valor do imposto está sendo **multiplicado ao invés de calculado como porcentagem**
   - Exemplo: Subtotal R$50 com ISS 5% mostra R$250 (50 × 5) ao invés de R$2,50 (50 × 0.05)
   
2. **Campo de imposto não editável**: ✅ CORRIGIDO - O campo de alíquota ISS não permite alteração adequada

3. **Vinculação OS-Reserva**: ✅ CORRIGIDO - Implementado fluxo especializado para segmento `custom`

---

## Fluxos de Comanda por Segmento

### Segmento Sports (padrão)
- **Componente**: `BookingOrderSheet`
- **Custo principal**: Espaço (hora)
- **Consumo extra**: Produtos (`order_items`)
- **Checkout**: Espaço + Produtos

### Segmento Beauty/Health ✅ IMPLEMENTADO
- **Componente**: `BeautyBookingSheet`
- **Custo principal**: Serviços agendados (`booking_services`)
- **Consumo extra**: Produtos (`order_items`)
- **Checkout**: Serviços + Produtos
- **Hook**: `useBookingServices` busca serviços vinculados à reserva

### Segmento Custom (Assistência Técnica) ✅ IMPLEMENTADO
- **Componente**: `TechnicianBookingSheet`
- **Custo principal**: Ordem de Serviço (OS) vinculada
- **Faturamento**: Via OS (não via comanda tradicional)
- **Hook**: `useLinkedServiceOrder` busca OS vinculada via `metadata.service_order_id`
- **Ações**: 
  - Criar OS (pré-preenchida com dados do cliente)
  - Abrir OS completa (navega para edição)
  - Finalizar atendimento

---

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useLinkedServiceOrder.ts` | Hook para buscar OS vinculada à reserva |
| `src/hooks/useBookingServices.ts` | Hook para buscar serviços da reserva |
| `src/components/bookings/TechnicianBookingSheet.tsx` | Sheet para segmento custom |
| `src/components/bookings/BeautyBookingSheet.tsx` | Sheet para segmento beauty/health |

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Agenda.tsx` | Renderização condicional dos 3 sheets por segmento |
| `src/pages/OrdemServicoForm.tsx` | Converter `tax_rate` para decimal ao salvar e vice-versa ao carregar |
| `src/hooks/useServiceOrderPdf.ts` | Exibir tax_rate como porcentagem no PDF |

---

## Fluxo de Dados

### Beauty/Health
```text
[Reserva]
     │
     ├── booking_services (serviços agendados)
     │     ├── service_id → services.title, services.price
     │     └── professional_id → venue_members.display_name
     │
     └── order_items (produtos consumidos)
           └── product_id → products.name, products.price

[Total] = Σ booking_services.price + Σ order_items.subtotal
```

### Custom (Assistência Técnica)
```text
[Booking]                    [Service Order]
metadata.service_order_id ──→ service_orders.id
                              └── items (service_order_items)
                              └── totals (subtotal, discount, tax, total)
```
