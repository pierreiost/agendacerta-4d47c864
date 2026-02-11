

## Controle de Quantidade e Preco nos Itens da OS

### O que muda

A tabela de itens no formulario de OS (tela de criar/editar) ganha controles interativos:

- **Quantidade**: botoes +/- ao lado do numero, com edicao inline
- **Preco unitario**: clicar no valor abre input editavel
- **Remover item**: confirmacao via AlertDialog antes de excluir
- **Recalculo automatico**: subtotal e totais recalculam em tempo real

### Detalhes Tecnicos

**Novo componente: `src/components/service-orders/OSItemRow.tsx`**

Componente que renderiza uma linha da tabela de itens com:

- Controle de quantidade com botoes `-` e `+` (min 1)
  - Botao `-` quando qtd=1: abre AlertDialog de confirmacao de remocao
  - Input numerico editavel no centro (clique transforma em input, Enter/blur salva, ESC cancela)
  - Mobile: botoes com 44px de altura para facilitar toque
- Preco unitario editavel inline
  - Clique no valor abre input editavel com formato monetario
  - Validacao: valor > 0, max 2 decimais
  - Enter/blur salva, ESC cancela
  - Badge discreto quando preco foi alterado do valor original do catalogo
- Botao lixeira com AlertDialog de confirmacao
  - Titulo: "Remover Item"
  - Texto: "Tem certeza que deseja remover [Nome] da ordem de serviço?"
  - Botoes: Cancelar / Sim, Remover
- Recalculo de subtotal (quantidade x preco_unitario) automatico

**Arquivo editado: `src/pages/OrdemServicoForm.tsx`**

- Substituir as linhas da tabela de itens (linhas 728-748) pelo novo componente `OSItemRow`
- Adicionar funcoes `handleQuantityChange(index, qty)` e `handlePriceChange(index, price)` que atualizam o array de items no form via `setValue`
- Manter `handleRemoveItem(index)` existente mas agora chamado pelo componente filho apos confirmacao
- Layout mobile: em telas pequenas, renderizar como cards verticais em vez de tabela

**Estrutura do layout**

Desktop (tabela):
```text
| Descricao    | Codigo | - [2] + | R$ 150,00 | R$ 300,00 | [lixeira] |
```

Mobile (card):
```text
+------------------------------------------+
| Instalacao Split               [lixeira] |
| - [2] +    R$ 150,00    Sub: R$ 300,00   |
+------------------------------------------+
```

### Componentes reutilizados

- `AlertDialog` do shadcn/ui para confirmacao de remocao
- `Button` com variant outline e size icon para +/-
- `Input` para edicao inline de quantidade e preco
- Icons: `Plus`, `Minus`, `Trash2` do lucide-react

### Observacoes

- O componente respeita o estado `isFinalized()` - quando a OS esta finalizada, nenhum controle de edicao aparece
- Nao sera instalada nenhuma dependencia nova (sem react-number-format, formatacao manual com Intl)
- Preparacao para estoque futuro: prop `maxQuantity` opcional no componente (nao utilizada agora)

