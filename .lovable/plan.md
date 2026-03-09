

# Plano de Implementação — Paridade Orçamento/OS + Páginas Públicas

## 1. Módulo de Orçamentos — Paridade com OS

### 1A. Inserção de Itens com Abas (Catálogo / Mão de Obra / Manual)

**Problema**: O formulário de Orçamento (`OrcamentoForm.tsx`) usa um formulário inline simples para adicionar itens (apenas descrição, código, qtd, valor). A OS já usa o componente `ServiceOrderItemForm` com 3 abas completas.

**Solução**: Reutilizar o componente `ServiceOrderItemForm` no `OrcamentoForm.tsx`:
- Adicionar estado `showAddItemForm` (igual à OS)
- Substituir o bloco inline de "Add item row" (linhas 535-560) pelo `ServiceOrderItemForm`
- Ao receber item do componente, converter para o formato `FormItem` do orçamento
- Remover os estados `newDesc`, `newCode`, `newQty`, `newPrice` que ficam obsoletos

### 1B. ISS padrão = 0

**Problema**: O `OrcamentoForm` inicializa `taxRate` com `5` (linha 65).

**Solução**: Mudar para `0`. A OS já usa `0` como padrão (linha 99 do `OrdemServicoForm`).

### 1C. Bloqueio de Campos Numéricos (nunca vazio)

**Problema**: Campos de desconto e ISS aceitam ficar vazios ao apagar.

**Solução**: Nos inputs de `discount` e `taxRate` (Orçamento) e nos equivalentes da OS, usar `onBlur` para forçar o valor de volta a `0` quando vazio. Aplicar em:
- `OrcamentoForm.tsx`: campos discount e taxRate (linhas 571, 575)
- `OrdemServicoForm.tsx`: campos equivalentes
- `ServiceOrderItemForm.tsx`: campo unit_price e value de mão de obra

Implementação: handler `onBlur={(e) => { if (!e.target.value) setX(0) }}` nos inputs nativos, e `onBlur` nos campos controlados por react-hook-form.

---

## 2. Páginas Públicas — Remoção de E-mail + Máscara Dinâmica

### 2A. Remoção do campo E-mail

Remover o campo de e-mail dos 3 widgets públicos:
- `BookingWidget.tsx` — linhas 642-652 (calendar step 3) e 705-715 (inquiry mode)
- `InquiryWidget.tsx` — linhas 338-347
- `ServiceBookingWidget.tsx` — linhas 607-616

No backend (RPCs), o campo `customer_email` já aceita placeholder `'sem-email@agendamento.local'`, então bastará sempre enviar esse placeholder.

### 2B. Máscara Dinâmica de Telefone/WhatsApp

**Regra nova**: máximo 13 dígitos, formatação progressiva:
- Até 9 dígitos: sem DDD → `98125-9200`
- 10-11 dígitos: com DDD → `(53) 98125-9200`
- 12-13 dígitos: com DDI → `+55 (53) 98125-9200`

**Arquivo**: Criar nova função `maskPhonePublic` em `src/lib/masks.ts` (a `maskPhone` existente fica inalterada para uso interno).

Aplicar nos 3 widgets nos inputs de telefone/WhatsApp.

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `src/lib/masks.ts` | Nova função `maskPhonePublic` |
| `src/pages/OrcamentoForm.tsx` | Abas de item (ServiceOrderItemForm), ISS=0, onBlur nos numéricos |
| `src/pages/OrdemServicoForm.tsx` | onBlur nos campos numéricos |
| `src/components/service-orders/ServiceOrderItemForm.tsx` | onBlur nos campos numéricos |
| `src/components/public-page/BookingWidget.tsx` | Remover email, aplicar maskPhonePublic |
| `src/components/public-page/InquiryWidget.tsx` | Remover email, aplicar maskPhonePublic |
| `src/components/public-page/ServiceBookingWidget.tsx` | Remover email, aplicar maskPhonePublic |

