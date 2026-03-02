
# Reativar refetchOnWindowFocus nos Hooks de Listagem e Metricas

## Contexto

O `QueryClient` global tem `refetchOnWindowFocus: false` para proteger formularios. Vamos adicionar excecoes locais (`refetchOnWindowFocus: true`) apenas nos hooks que alimentam telas de visualizacao (listas e metricas).

## 5 Ficheiros Alterados (1 linha cada)

| Hook | Tipo | staleTime atual | Mudanca |
|---|---|---|---|
| `useBookingQueries.ts` → `useBookingQueries()` | Lista (array) | nenhum | + `refetchOnWindowFocus: true` + `staleTime: 10000` |
| `useDashboardMetrics.ts` | Metricas | 30000 (OK) | + `refetchOnWindowFocus: true` |
| `useServiceOrderMetrics.ts` | Metricas | 30000 (OK) | + `refetchOnWindowFocus: true` |
| `useServiceOrders.ts` → `ordersQuery` | Lista (array) | 30000 (OK) | + `refetchOnWindowFocus: true` |
| `useTechnicianAvailability.ts` | Lista de slots | nenhum | + `refetchOnWindowFocus: true` + `staleTime: 10000` |

## O que NAO sera tocado (protecao de formularios)

| Hook | Motivo |
|---|---|
| `useBookingById` (mesmo ficheiro) | Singular - alimenta formulario de edicao |
| `useServiceOrder(id)` (mesmo ficheiro) | Singular - alimenta formulario de edicao |
| `App.tsx` | Config global preservada como `false` |

## Detalhe tecnico por ficheiro

### 1. `src/hooks/useBookingQueries.ts` (linha 47)
Adicionar ao `useQuery` de `useBookingQueries` (lista):
```typescript
refetchOnWindowFocus: true,
staleTime: 10000,
```
`useBookingById` na linha 67 permanece intocado.

### 2. `src/hooks/useDashboardMetrics.ts` (linha 61)
Adicionar antes do `staleTime` existente:
```typescript
refetchOnWindowFocus: true,
```

### 3. `src/hooks/useServiceOrderMetrics.ts` (linha 76)
Adicionar antes do `staleTime` existente:
```typescript
refetchOnWindowFocus: true,
```

### 4. `src/hooks/useServiceOrders.ts` (linha 110)
Adicionar ao `ordersQuery` antes do `staleTime` existente:
```typescript
refetchOnWindowFocus: true,
```
`useServiceOrder(id)` na linha 280 permanece intocado.

### 5. `src/hooks/useTechnicianAvailability.ts` (linha 138)
Adicionar ao `useQuery`:
```typescript
refetchOnWindowFocus: true,
staleTime: 10000,
```

## Resultado

- Agenda, Dashboard, lista de OS e pagina publica de agendamento atualizam automaticamente ao voltar para a aba
- Formularios de edicao (booking por ID, OS por ID) continuam protegidos
- `staleTime` de no minimo 10s em todos evita spam de requisicoes
