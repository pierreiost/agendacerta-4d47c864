# Módulo de Orçamentos (Pré-OS)

## Resumo

Criar um módulo completo de Orçamentos com design industrial (sem border-radius, sem Shadcn), numeração própria (ORC-XXX), geração de PDF, e conversão automática para OS Completa ao aprovar. Inquiries existentes serão migradas para a nova tabela.

## 1. Banco de Dados

### Nova tabela `quotes`

```sql
CREATE TYPE quote_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id),
  quote_number integer NOT NULL,
  status quote_status NOT NULL DEFAULT 'pending',
  customer_id uuid REFERENCES customers(id),
  customer_name text NOT NULL,
  customer_document text,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_city text,
  customer_state text DEFAULT 'RS',
  customer_zip_code text,
  description text NOT NULL DEFAULT '',
  notes text,
  device_model text,           -- herdar do inquiry
  photo_urls text[] DEFAULT '{}',
  inquiry_id uuid,             -- referência ao inquiry original
  service_order_id uuid,       -- referência à OS gerada (após aprovação)
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0.05,
  tax_amount numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Nova tabela `quote_items`

```sql
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  service_code text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Sequência própria

Adicionar coluna `current_quote_number` à tabela `venue_sequences` e criar trigger `generate_quote_number` similar ao existente para OS.

### Trigger de recálculo

Trigger `calculate_quote_totals` em `quote_items` (INSERT/UPDATE/DELETE) para atualizar subtotal/tax/total na `quotes`, espelhando `calculate_service_order_totals`.

### RLS

- SELECT/INSERT/UPDATE/DELETE: `is_venue_member(auth.uid(), venue_id)` para quotes e quote_items (via join).

### Migração de inquiries

Script SQL para converter registros existentes de `service_inquiries` em `quotes` com status `pending`.

## 2. Hook `useQuotes.ts`

CRUD completo espelhando `useServiceOrders.ts`:

- `quotesQuery` — lista orçamentos da venue (com items via join)
- `createQuote`, `updateQuote`, `deleteQuote`
- `addQuoteItem`, `updateQuoteItem`, `removeQuoteItem`
- `approveQuote` — muda status para `approved`, cria OS Completa via `createOrder` do `useServiceOrders`, copia todos os items, e salva `service_order_id` no orçamento

## 3. Hook `useQuotePdf.ts`

Gerar PDF do orçamento usando jsPDF + jspdf-autotable (mesma stack da OS), com layout adaptado: título "ORÇAMENTO", número ORC-XXX, dados do cliente, tabela de itens, totais.

## 4. Páginas

### `src/pages/Orcamentos.tsx` — Listagem

Design industrial sem Shadcn, sem border-radius, flutuar entre minalismo/glassmorphim e enterprise flat

- Grid/tabela com `border-radius: 0` em tudo
- Colunas: Nº, Cliente, Descrição, Status, Total, Data, Ações
- Status badges com cores flat (amarelo/pendente, verde/aprovado, cinza/rejeitado)
- Filtro toggle "Mostrar Rejeitados" (ocultos por padrão)
- Botão "Novo Orçamento"
- Ações: Aprovar (gera OS), Rejeitar, Editar, PDF, Excluir

### `src/pages/OrcamentoForm.tsx` — Formulário

Design industrial, campos com bordas retas:

- Seção Cliente (busca existente ou manual, mesmos campos da OS)
- Seção Descrição + Notas + Device Model
- Seção Items (tabs: Catálogo, Mão de Obra, Manual — espelhando OS)
- Resumo financeiro: Subtotal, Desconto, Impostos, Total
- Botões: Salvar, Gerar PDF, Aprovar (converte em OS)

## 5. Sidebar + Rotas

### `AppSidebar.tsx`

Adicionar item "Orçamentos" no grupo "OPERACIONAL", abaixo de "Ordens de Serviço", com ícone `FileText` (ou `ClipboardCheck`), módulo `orcamentos`.

### `App.tsx`

Novas rotas:

- `/orcamentos` → `Orcamentos`
- `/orcamentos/novo` → `OrcamentoForm`
- `/orcamentos/:id` → `OrcamentoForm`

## 6. Automação de Entrada (Inquiry → Orçamento)

Modificar a RPC `create_service_inquiry` (ou criar trigger em `service_inquiries`) para automaticamente criar um registro em `quotes` com status `pending` quando uma inquiry é inserida para venues do segmento `custom`.

## 7. Permissões

Adicionar módulo `orcamentos` ao sistema de permissões existente, seguindo o mesmo padrão de `ordens_servico`.

## Arquivos novos


| Arquivo                       | Descrição                      |
| ----------------------------- | ------------------------------ |
| `src/pages/Orcamentos.tsx`    | Listagem com design industrial |
| `src/pages/OrcamentoForm.tsx` | Formulário de edição/criação   |
| `src/hooks/useQuotes.ts`      | CRUD + aprovação               |
| `src/hooks/useQuotePdf.ts`    | Geração de PDF                 |


## Arquivos modificados


| Arquivo                                | Mudança                                       |
| -------------------------------------- | --------------------------------------------- |
| `src/components/layout/AppSidebar.tsx` | Novo item no menu                             |
| `src/App.tsx`                          | Novas rotas                                   |
| Migration SQL                          | Tabelas, triggers, RLS, migração de inquiries |
