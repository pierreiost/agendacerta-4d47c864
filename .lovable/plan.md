

## Plano: Campos Personalizados OS + Correção do Bug de Item Manual

### Parte 1 - Correção do Bug (Prioridade)

**Problema identificado:** O componente `ServiceOrderItemForm` renderiza tags `<form>` internas (para item manual e mão de obra) dentro do `<form>` principal do `OrdemServicoForm.tsx`. Quando o usuario clica "Adicionar Item Manual", o submit do formulario interno borbulha para o formulario pai, causando o reload da pagina.

**Solucao:** No `ServiceOrderItemForm.tsx`, trocar as tags `<form>` internas por `<div>` e chamar `handleSubmit` manualmente via `onClick` nos botoes, ou adicionar `e.stopPropagation()` no submit. A abordagem mais limpa e trocar `<form onSubmit={...}>` por `<div>` e usar `onClick` nos botoes com validacao manual via `handleSubmit`.

**Arquivo:** `src/components/service-orders/ServiceOrderItemForm.tsx`
- Linha 263: `<form onSubmit={laborForm.handleSubmit(handleAddLabor)}>` -- trocar por `<div>` e mover o submit para o `onClick` do botao
- Linha 326: `<form onSubmit={manualForm.handleSubmit(handleAddManualItem)}>` -- mesma abordagem
- Garantir que os botoes tenham `type="button"` explicito

---

### Parte 2 - Campos Personalizados OS

#### Banco de Dados

Criar tabela `os_custom_fields` com a seguinte estrutura:

```text
os_custom_fields
  id           uuid PK default gen_random_uuid()
  venue_id     uuid FK -> venues(id) ON DELETE CASCADE
  display_order integer (1 a 5)
  content      text NOT NULL
  is_active    boolean default true
  is_bold      boolean default false
  created_at   timestamptz default now()
  updated_at   timestamptz default now()

  UNIQUE(venue_id, display_order)
```

- RLS: Apenas membros autenticados da venue podem ler/editar
- Maximo 5 registros por venue (constraint via trigger ou validacao no app)
- Limite de 2000 caracteres por campo

#### Interface de Configuracao

**Arquivo novo:** `src/components/settings/OSCustomFieldsTab.tsx`

Nova aba nas Configuracoes chamada "Campos OS" com icone `FileText`:
- Lista de ate 5 campos com:
  - Toggle ativo/inativo (Switch)
  - Textarea para conteudo (max 2000 chars, contador de caracteres)
  - Checkbox "Negrito" para formatacao
  - Ordem fixa de 1 a 5 (sem drag-and-drop, simplicidade)
- Botao "Adicionar Campo" (visivel ate ter 5 campos)
- Botao "Salvar" com dirty state (desabilitado se nao houver mudancas)
- Preview em tempo real de como ficara no PDF

**Arquivo editado:** `src/pages/Configuracoes.tsx`
- Adicionar nova aba "Campos OS" no TabsList
- Adicionar TabsContent correspondente

#### Hook de Dados

**Arquivo novo:** `src/hooks/useOSCustomFields.ts`
- Query para buscar campos da venue atual
- Mutations para criar, atualizar e deletar campos
- Funcao para buscar apenas campos ativos (para uso no PDF)

#### Integracao com PDF

**Arquivo editado:** `src/hooks/useServiceOrderPdf.ts`

Adicionar secao "TERMOS E CONDICOES" apos o bloco de TOTAL:
- Buscar campos ativos ordenados por `display_order`
- Para cada campo ativo:
  - Renderizar com `doc.setFont('helvetica', campo.is_bold ? 'bold' : 'normal')`
  - Usar `doc.splitTextToSize()` para quebra de linha automatica
- Gerenciamento de pagina:
  - Antes de renderizar cada campo, verificar se `yPos + alturaNecessaria > pageHeight - 20`
  - Se necessario, chamar `doc.addPage()` e resetar `yPos`
- Mover o footer (data de geracao) para apos os campos personalizados

**Arquivo editado:** `src/pages/OrdemServicoForm.tsx`
- Passar os campos personalizados para o `generatePdf` (ou buscar dentro do hook)

#### Resumo dos Arquivos

| Arquivo | Acao |
|---|---|
| `src/components/service-orders/ServiceOrderItemForm.tsx` | Corrigir bug de forms aninhados |
| `src/components/settings/OSCustomFieldsTab.tsx` | Criar (nova aba de config) |
| `src/hooks/useOSCustomFields.ts` | Criar (hook de dados) |
| `src/pages/Configuracoes.tsx` | Editar (adicionar aba) |
| `src/hooks/useServiceOrderPdf.ts` | Editar (renderizar campos no PDF) |
| Migration SQL | Criar tabela `os_custom_fields` + RLS |

