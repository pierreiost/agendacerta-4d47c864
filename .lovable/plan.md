
# Reservas em tempo real no Dashboard

## Problema
Quando uma nova reserva chega do site publico, o botao "Mostrar Pendentes" do Dashboard nao a exibe porque os dados so sao recarregados quando o usuario troca de aba (refetchOnWindowFocus). Nao existe nenhuma assinatura Realtime para a tabela `bookings`.

## Solucao

Adicionar uma assinatura Supabase Realtime na tabela `bookings` dentro do hook `useBookingQueries`, seguindo o mesmo padrao ja usado em `useNotifications.ts`. Quando um INSERT ou UPDATE ocorrer na tabela bookings para a venue atual, o cache do React Query sera invalidado automaticamente, trazendo os dados novos sem necessidade de recarregar a pagina.

## Mudancas

### 1. Habilitar Realtime na tabela `bookings` (migracao SQL)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
```

### 2. Adicionar subscription Realtime em `src/hooks/useBookingQueries.ts`

Adicionar um `useEffect` no hook `useBookingQueries` que:
- Cria um canal Supabase Realtime filtrado por `venue_id`
- Escuta eventos `INSERT` e `UPDATE` na tabela `bookings`
- Ao receber um evento, invalida a query key `['bookings', venueId, ...]`
- Tambem invalida `['dashboard-metrics', venueId]` para atualizar as metricas
- Faz cleanup do canal no return do useEffect

```typescript
// Realtime: atualiza automaticamente quando novas reservas chegam
useEffect(() => {
  if (!currentVenue?.id || !user) return;

  const channel = supabase
    .channel(`bookings-realtime-${currentVenue.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `venue_id=eq.${currentVenue.id}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [currentVenue?.id, user, queryClient]);
```

### Resumo

| Acao | Ficheiro |
|---|---|
| Habilitar Realtime na tabela bookings | Migracao SQL |
| Adicionar subscription + invalidacao de cache | `src/hooks/useBookingQueries.ts` |

### Resultado

- Novas reservas do site publico aparecem automaticamente no Dashboard em 1-2 segundos
- O botao "Mostrar Pendentes" reflete imediatamente reservas novas com status PENDING
- As metricas do dashboard (contadores) tambem se atualizam
- Nenhum polling manual ou intervalo necessario
