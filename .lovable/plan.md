## Contexto

Já existe um Gerador de Termo de Garantia (dialog + template livre + PDF A4/80mm) acionado no menu de ações das OS finalizadas em `src/pages/OrdensServico.tsx`. O que existe hoje é um **texto livre com variáveis** (`{cliente_nome}`, `{valor_total}`, etc.), mas a nova especificação pede um termo **estruturado por seções** com campos editáveis, itens de serviço com garantia individual e uma opção de **Imprimir** (além do PDF já existente).

Não vou recriar do zero — vou evoluir o `WarrantyTermDialog` para o novo formato, mantendo o botão que já existe na tabela de OS e o template configurável em Configurações (que agora vai guardar as cláusulas de garantia, e não o documento inteiro).

## Escopo do que muda

### 1. `src/components/service-orders/WarrantyTermDialog.tsx` (reformulado)

Substituir o layout atual (esquerda: ajustes / direita: preview de texto puro) por um **preview estruturado** que espelha o documento final impresso, com edição inline dos campos:

- **Cabeçalho fixo:** logo + dados da empresa (do `currentVenue`) + título **"TERMO DE ENTREGA DE GARANTIA E SERVIÇO"** + linha de agradecimento.
- **Seção "Informações do Atendimento"** (campos editáveis):
  - Equipamento (texto)
  - Cliente (pré-preenchido com `order.customer_name`, editável)
  - Data de Entrega (date input, padrão = hoje ou `order.finished_at`)
  - Técnico Responsável (texto, mantido)
- **Seção "Cláusulas de Garantia"**: renderiza o texto do `warranty_templates` (o template salvo em Configurações passa a ser apenas o bloco de cláusulas, não o documento inteiro). Mantém edição via aba de Configurações.
- **Seção "Resumo do Serviço Realizado & Valor"**:
  - Tabela editável de itens carregados via `getOrderItems(order.id)` (já disponível em `useServiceOrders`). Colunas: Descrição, Qtd, Valor, **Garantia (dias)** — nova coluna, default 90, editável por linha.
  - Permitir adicionar/remover linhas manuais no termo (não altera a OS no banco — só afeta o documento gerado).
  - Linha **Valor TOTAL R$** com fallback obrigatório para `R$ 0,00` se `order.total` for nulo/zero (regra de segurança já pedida na spec original).
- **Rodapé:** aviso "Lembre-se de fazer backup dos seus dados" + duas linhas de assinatura (Empresa | Cliente).
- **Barra de ações do modal** (fora da área imprimível):
  - Botão **Imprimir** → `window.print()`.
  - Botão **Baixar PDF** → chama `useWarrantyPdf` (formato A4 ou 80mm via select).
  - Fechar.

### 2. CSS de impressão (`src/index.css`)

Adicionar bloco `@media print`:
- Ocultar `body > *` que não seja o container do termo (usar `.print-warranty-root` como marcador e `.no-print` para botões/header do dialog).
- Remover cores de fundo do Dialog, forçar `background: white`, tipografia serif, margens de página.
- Garantir que o `DialogContent` ocupe a página inteira ao imprimir (sem `max-height`/`overflow`).

### 3. `src/hooks/useWarrantyPdf.ts` (ajuste)

Nova assinatura para receber o objeto estruturado (equipamento, cliente, dataEntrega, técnico, cláusulas, itens[], total, observações) em vez de um texto único. Renderiza no PDF as mesmas seções do preview, mantendo A4 e 80mm.

### 4. `src/hooks/useWarrantyTemplate.ts` (ajuste leve)

- `DEFAULT_TEMPLATE` passa a conter **apenas o bloco de cláusulas** (itens 1 a 5 já existentes hoje), sem cabeçalho nem linha de assinatura — o resto vira estrutura fixa do componente.
- `replaceVariables` continua servindo para tokens dentro das cláusulas (se o usuário quiser), mas as informações do atendimento não dependem mais de tokens.

### 5. `src/pages/OrdensServico.tsx`

Sem mudanças — o botão "Gerar Termo de Garantia" no dropdown de OS finalizadas já existe e continua abrindo o dialog.

### 6. `src/components/settings/WarrantyTemplateTab.tsx`

Atualizar o texto de ajuda: explicar que o campo agora edita **apenas as cláusulas** (as informações do cliente/equipamento/itens vêm da OS automaticamente). Manter o editor de texto e a lista de variáveis suportadas.

## Regras de segurança / dados

- **Fallback de valores:** total e subtotais de itens sempre renderizam `R$ 0,00` quando nulos.
- **Sem alteração no banco:** o termo é gerado on-the-fly. Edições feitas no dialog (adicionar item manual, mudar cliente/equipamento no cabeçalho) **não** persistem na OS nem no `service_order_items` — são apenas para o documento.
- **RLS:** nada muda — leitura de `service_order_items` e `warranty_templates` já é protegida por venue.

## Telas impactadas

- `src/pages/OrdensServico.tsx` (consumidora — sem alteração de código)
- `src/components/service-orders/WarrantyTermDialog.tsx` (reformulada)
- `src/components/settings/WarrantyTemplateTab.tsx` (texto de ajuda)
- `src/hooks/useWarrantyPdf.ts` (nova assinatura estruturada)
- `src/hooks/useWarrantyTemplate.ts` (default template = só cláusulas)
- `src/index.css` (regras `@media print`)

## Fora do escopo

- Persistir "garantia por item" no banco (`service_order_items` não tem essa coluna; se quiser salvar, é outra migração).
- Mudar o gatilho / permissão de acesso ao termo.
- Alterar cálculo de total na OS.
