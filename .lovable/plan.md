
# Otimizacao de Performance: AuthContext e Carregamento Silencioso

## Problema

Dois problemas relacionados causam flashes visuais indesejados:

1. **AuthContext**: A cada TOKEN_REFRESH do Supabase, `setUser(session?.user)` cria uma nova referencia de objeto mesmo quando o user ID nao mudou. Isso causa re-render em cascata em toda a arvore de componentes (VenueContext, queries, etc.), potencialmente desmontando e remontando componentes.

2. **Dashboard Spinners**: Alguns componentes do Dashboard usam `isLoading` para exibir spinners de tela cheia. Embora `isLoading` do React Query v5 ja seja "primeiro carregamento apenas", o re-render do AuthContext pode forcar um ciclo de remontagem que reseta o cache, causando o flash.

## Mudancas Planejadas

### Tarefa 1: Blindar AuthContext contra re-renders (1 ficheiro)

**Ficheiro**: `src/contexts/AuthContext.tsx`

Substituir as chamadas cegas de `setUser` e `setSession` por funcoes de atualizacao condicional que preservam a referencia anterior quando o ID nao mudou:

```typescript
// ANTES (linhas 22-24)
setSession(session);
setUser(session?.user ?? null);

// DEPOIS
setSession(prev => prev?.access_token === session?.access_token ? prev : session);
setUser(prev => prev?.id === session?.user?.id ? prev : (session?.user ?? null));
```

Aplicar em dois locais:
- `onAuthStateChange` callback (linha 22-24)
- `getSession().then()` callback (linha 31-33)

Tambem adicionar `useCallback` ao `signOut` para estabilizar a referencia e `useMemo` no value do Provider para evitar re-renders quando nenhum valor mudou.

### Tarefa 2: Carregamento Silencioso nos Dashboards (3 ficheiros)

Estes componentes exibem spinners de tela cheia. Vamos garantir que so mostrem loading na primeira visita (cache vazio):

**2a. `src/components/dashboard/DashboardBookings.tsx`** (linha 136)
```typescript
// ANTES
if (bookingsLoading || metricsLoading) {
  return (<div>...spinner...</div>);
}

// DEPOIS - so mostra spinner se nao tem dados em cache
const hasData = bookings?.length > 0 || serverMetrics;
if ((bookingsLoading || metricsLoading) && !hasData) {
  return (<div>...spinner...</div>);
}
```

**2b. `src/components/dashboard/DashboardAppointments.tsx`** (linha 164)
```typescript
// ANTES
if (isLoading) {
  return (<div>...spinner...</div>);
}

// DEPOIS
if (isLoading && (!bookings || bookings.length === 0)) {
  return (<div>...spinner...</div>);
}
```

**2c. `src/components/dashboard/DashboardServiceOrders.tsx`** (linha 237)
- Ja esta parcialmente correto (`metricsLoading && !serverMetrics`), mas falta proteger o `ordersLoading`. Adicionar verificacao similar para orders.

### Resumo de ficheiros

| Ficheiro | Tipo de mudanca |
|---|---|
| `src/contexts/AuthContext.tsx` | Comparacao condicional em setUser/setSession + useMemo no value |
| `src/components/dashboard/DashboardBookings.tsx` | Spinner condicional com fallback para dados em cache |
| `src/components/dashboard/DashboardAppointments.tsx` | Spinner condicional com fallback para dados em cache |
| `src/components/dashboard/DashboardServiceOrders.tsx` | Proteger loading de orders (metricas ja estao protegidas) |

### O que NAO sera tocado

| Item | Motivo |
|---|---|
| `src/pages/Agenda.tsx` | Ja usa `isLoading` do React Query v5 que e "primeiro load apenas". Os skeletons so aparecem quando o cache esta vazio. |
| Hooks de mutacao | Fora do escopo - nao afetam rendering |
| `App.tsx` | Config global preservada |
| `useBookingQueries.ts` | Return ja expoe `isLoading` (correto) |

### Resultado esperado

- TOKEN_REFRESH do Supabase nao causa mais re-render em cascata
- Ao voltar para a aba, os dados atualizam silenciosamente no background
- Spinners/Skeletons so aparecem na primeira visita (cache vazio)
- Dados existentes permanecem visiveis durante o refetch
