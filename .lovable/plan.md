

# Melhorias no Módulo de Orçamentos

## 1. Listagem (Orcamentos.tsx) — Mobile scroll horizontal nas ações

**Problema**: No mobile, os ícones de ação na coluna direita ficam cortados.

**Fix**: Envolver a linha de ações num container com `overflow-x-auto` e `min-width` para garantir scroll horizontal. Também usar `whitespace-nowrap` na row de ações para que não quebrem linha.

## 2. Formulário (OrcamentoForm.tsx) — Centralizar e preencher tela

**Problema**: `max-w-4xl` sem `mx-auto` faz o conteúdo colar à esquerda.

**Fix**: Trocar `max-w-4xl` por `max-w-5xl mx-auto` no container principal. Isso centraliza e dá mais largura.

## 3. Galeria de Fotos (photo_urls)

**Problema**: O campo `photo_urls` existe na tabela `quotes` mas não é renderizado no formulário.

### Mobile
- Botão "Ver Anexos (N)" que abre um modal/overlay fullscreen com as fotos em grid.

### Desktop
- Nova seção "Anexos" após "Detalhes", com mini galeria adaptativa (grid de thumbnails clicáveis que abrem em lightbox/overlay).
- As fotos são read-only (vêm da página pública via inquiry). Não precisam de upload aqui.
- Persistem no orçamento independente do status (aprovado/rejeitado).

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/Orcamentos.tsx` | Mobile: ações com scroll horizontal |
| `src/pages/OrcamentoForm.tsx` | Centralizar layout (`mx-auto`), adicionar seção de fotos com galeria desktop / botão mobile |

