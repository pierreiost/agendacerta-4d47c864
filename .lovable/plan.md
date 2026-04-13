

## Plano: Gerador Dinâmico de Termo de Garantia e Entrega

### Visão Geral
Criar um sistema completo de geração de Termos de Garantia, com template editável nas configurações e geração contextual a partir de OS finalizadas.

### Componentes do plano

**1. Banco de Dados — Nova tabela `warranty_templates`**
- Migração SQL para criar tabela com: `id`, `venue_id`, `content` (text, template padrão), `created_at`, `updated_at`
- RLS: leitura e escrita para `venue_member` / `venue_admin`
- Texto padrão pré-populado via INSERT com as cláusulas de garantia 90 dias, exclusões, backup etc.
- Variáveis suportadas: `{cliente_nome}`, `{equipamento_modelo}`, `{detalhamento_servico}`, `{valor_total}`, `{data_entrega}`, `{tecnico_responsavel}`

**2. Configurações — Aba "Termo de Garantia"**
- Nova aba `warranty` em `Configuracoes.tsx` com ícone `Shield`
- Componente `WarrantyTemplateTab.tsx`:
  - Textarea com o template atual (carregado da tabela)
  - Indicador de variáveis disponíveis (chips clicáveis que inserem a tag no cursor)
  - Botão Salvar
  - Preview ao vivo do template com dados fictícios

**3. Hook `useWarrantyTemplate.ts`**
- Query para buscar/criar o template da venue atual
- Mutation para atualizar o template
- Função `replaceVariables(template, order)` que substitui as tags pelos dados reais da OS

**4. Modal de Geração do Termo — `WarrantyTermDialog.tsx`**
- Gatilho: botão "Gerar Termo de Garantia" no dropdown de ações da OS na listagem (`OrdensServico.tsx`), visível apenas quando `isFinalized(order) === true`
- Layout side-by-side (desktop) / stacked (mobile):
  - **Esquerda**: Campo de observações extras (textarea), formato de saída (A4 / 80mm)
  - **Direita**: Preview ao vivo do documento com dados reais da OS
- Botão "Gerar PDF" que cria o documento via jsPDF

**5. Hook `useWarrantyPdf.ts`**
- Gera o PDF do termo com:
  - Cabeçalho da empresa (logo, nome, CNPJ, endereço — reutiliza lógica do `useServiceOrderPdf`)
  - Corpo do texto (template com variáveis substituídas + observações extras)
  - Campos de assinatura (empresa + cliente) com linhas
  - Formato A4 ou 80mm (largura 80mm, sem altura fixa)
- Valores numéricos: se `order.total` for null/undefined, forçar `0.00`

**6. Alterações na Listagem de OS (`OrdensServico.tsx`)**
- Adicionar DropdownMenu com MoreVertical no lugar/ao lado dos botões de ação
- Item "Gerar Termo de Garantia" visível apenas para OS finalizadas
- Ao clicar, abre o `WarrantyTermDialog` com os dados da OS

### Arquivos criados
- `src/hooks/useWarrantyTemplate.ts`
- `src/hooks/useWarrantyPdf.ts`
- `src/components/service-orders/WarrantyTermDialog.tsx`
- `src/components/settings/WarrantyTemplateTab.tsx`
- Migração SQL (tabela + RLS + template padrão)

### Arquivos modificados
- `src/pages/Configuracoes.tsx` — nova aba "Termo de Garantia"
- `src/pages/OrdensServico.tsx` — botão "Gerar Termo" no menu de ações de OS finalizada

### Telas impactadas
- **Ordens de Serviço (listagem)** — novo menu de ação contextual
- **Configurações** — nova aba para editar o template
- Nenhuma outra tela é afetada

### Segurança
- RLS na tabela `warranty_templates`: leitura por `venue_member`, escrita por `venue_admin`
- Valores numéricos sanitizados (fallback para 0.00)
- Template é por venue (multi-tenant isolado)

