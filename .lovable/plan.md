

# Controle de Estoque integrado aos Produtos

## Resumo

Adicionar controle de estoque diretamente na pagina de Produtos existente, sem criar uma pagina separada. Cada produto tera campos de estoque (quantidade atual, estoque minimo, custo) e toda movimentacao sera registrada em um ledger imutavel (Kardex).

## Banco de Dados

### 1. Alterar tabela `products`

Adicionar as colunas:

- `cost_price` (numeric, default 0) - Custo do produto
- `stock_quantity` (integer, default 0) - Saldo atual em cache
- `min_stock` (integer, nullable) - Estoque minimo para alerta
- `track_stock` (boolean, default false) - Se controla estoque
- `sku` (text, nullable) - Codigo do produto
- `unit` (text, default 'un') - Unidade (un, kg, L)

### 2. Criar tabela `stock_movements` (Kardex)

Registros imutaveis de toda movimentacao:

- `id` (uuid, PK)
- `venue_id` (uuid, FK)
- `product_id` (uuid, FK products)
- `type` (text: IN, OUT, ADJUSTMENT)
- `reason` (text: purchase, sale, loss, return, adjustment, initial)
- `quantity` (integer, sempre positivo)
- `unit_cost` (numeric, nullable)
- `reference_id` (uuid, nullable) - Referencia ao booking
- `reference_type` (text, nullable) - Tipo da referencia
- `notes` (text, nullable)
- `balance_after` (integer) - Snapshot do saldo apos movimentacao
- `created_by` (uuid)
- `created_at` (timestamptz)

### 3. Funcao atomica `create_stock_movement`

Funcao PostgreSQL que:
1. Faz lock na linha do produto (`SELECT FOR UPDATE`)
2. Calcula novo saldo baseado no tipo (IN soma, OUT/ADJUSTMENT subtrai)
3. Valida estoque negativo (impede se `track_stock = true`)
4. Insere registro imutavel em `stock_movements`
5. Atualiza `stock_quantity` no produto
6. Retorna o movimento criado

### 4. RLS Policies

- `stock_movements`: SELECT para venue members, INSERT via funcao RPC
- Sem UPDATE ou DELETE (imutavel)

### 5. Indice para performance

```text
CREATE INDEX idx_stock_movements_product ON stock_movements(venue_id, product_id, created_at DESC);
```

## Frontend - Alteracoes

### 1. Formulario de Produto (`ProductFormDialog.tsx`)

Adicionar secao "Controle de Estoque" com toggle `track_stock`:
- Quando ativo, mostrar campos: SKU, Unidade, Custo (R$), Estoque Minimo
- Quando criando produto novo com estoque, pedir "Estoque Inicial"

### 2. Tabela de Produtos (`Produtos.tsx`)

Adicionar coluna "Estoque" na tabela com:
- Quantidade atual (ex: "42 un")
- Badge colorido: vermelho se abaixo do minimo, verde se ok, cinza se nao rastreia
- Texto "-" quando `track_stock = false`

### 3. Dialog de Movimentacao Manual

Novo componente `StockMovementDialog.tsx`:
- Acessado pelo menu de acoes (3 pontos) de cada produto
- Opcao "Movimentar Estoque" no dropdown
- Campos: Tipo (Entrada/Saida/Ajuste), Motivo (dropdown), Quantidade, Custo unitario (se entrada), Observacoes
- Mostra saldo atual e saldo apos movimentacao em tempo real

### 4. Dialog de Historico de Movimentacoes

Novo componente `StockHistoryDialog.tsx`:
- Acessado pelo menu de acoes do produto
- Opcao "Historico de Estoque" no dropdown
- Lista cronologica de movimentacoes com: Data, Tipo (badge colorido), Motivo, Quantidade, Saldo Apos, Usuario

### 5. Integracao com Vendas (Saida Automatica)

Quando um booking com `order_items` contendo produtos com `track_stock = true` e confirmado/finalizado:
- Criar movimentacoes de saida automaticas para cada produto vendido
- Reason: "sale", reference_id: booking_id

### 6. Cards de resumo no topo da pagina

Adicionar cards opcionais acima da tabela (quando houver produtos com estoque):
- Total de produtos rastreados
- Produtos com estoque baixo (abaixo do minimo)
- Valor total do estoque (quantidade x custo)

## Hook `useStockMovements`

Novo hook com:
- `createMovement(data)` - Chama RPC `create_stock_movement`
- `useMovementHistory(productId)` - Query para historico de um produto
- Invalidacao automatica de `products` ao criar movimento

## Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| Nova migracao SQL | Alterar `products`, criar `stock_movements`, criar funcao, RLS, indice |
| `src/hooks/useProducts.ts` | Atualizar tipo `Product` (novos campos automaticos via types) |
| `src/hooks/useStockMovements.ts` | Novo hook para movimentacoes |
| `src/components/products/ProductFormDialog.tsx` | Adicionar campos de estoque |
| `src/components/products/StockMovementDialog.tsx` | Novo - dialog de movimentacao manual |
| `src/components/products/StockHistoryDialog.tsx` | Novo - dialog de historico |
| `src/pages/Produtos.tsx` | Coluna estoque, badges, cards resumo, acoes extras no dropdown |
| `src/hooks/useOrderItems.ts` | Integrar saida automatica ao confirmar venda |

## Sequencia de Implementacao

1. Migracao do banco (tabela, funcao, RLS, indice)
2. Hook `useStockMovements`
3. Atualizar formulario de produto com campos de estoque
4. Atualizar tabela de produtos com coluna de estoque e badges
5. Dialog de movimentacao manual
6. Dialog de historico
7. Cards de resumo
8. Integracao automatica com vendas

