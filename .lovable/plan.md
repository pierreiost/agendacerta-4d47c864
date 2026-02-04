

## Plano de Correção: Bugs nas Ordens de Serviço (OS)

### Resumo dos Problemas Encontrados

Foram identificados **3 bugs principais** no módulo de Ordens de Serviço:

1. **Bug de cálculo do ISS (imposto)**: O valor do imposto está sendo **multiplicado ao invés de calculado como porcentagem**
   - Exemplo: Subtotal R$50 com ISS 5% mostra R$250 (50 × 5) ao invés de R$2,50 (50 × 0.05)
   
2. **Campo de imposto não editável**: O campo de alíquota ISS não permite alteração adequada

3. **Vinculação OS-Reserva**: Ao vincular uma OS a uma reserva, os valores e itens não são refletidos na comanda

---

### Causa Raiz do Bug #1 (Cálculo do ISS)

**Inconsistência de formato entre frontend e backend:**

| Local | Formato esperado | Formato atual |
|-------|------------------|---------------|
| Frontend (`OrdemServicoForm.tsx`) | `5` (5%) | `5` |
| Banco de dados (`tax_rate`) | `0.05` (decimal) | `5` |
| Trigger SQL | `subtotal * tax_rate` | `50 * 5 = 250` |

O formulário principal (`OrdemServicoForm.tsx`) envia `taxRate: 5` diretamente ao banco, mas o trigger espera `0.05`. Já o `ServiceOrderFormDialog.tsx` converte corretamente para decimal.

---

### Correções Planejadas

#### 1. Corrigir conversão do `tax_rate` no formulário principal

**Arquivo**: `src/pages/OrdemServicoForm.tsx`

Ajustes necessários:
- Na linha 269 (`onSubmit`): Converter `data.taxRate` para decimal dividindo por 100 antes de enviar ao banco
- Na linha 164 (ao carregar dados existentes): O banco armazena decimal, mas o formulário espera inteiro - converter multiplicando por 100

```text
Antes:  tax_rate: data.orderType === "complete" ? data.taxRate : null
Depois: tax_rate: data.orderType === "complete" ? data.taxRate / 100 : null
```

#### 2. Corrigir dados existentes no banco de dados

Será necessário executar uma migração para corrigir os registros que já foram salvos com o formato incorreto:

```sql
-- Corrigir tax_rate de valores inteiros (>1) para decimais
UPDATE service_orders 
SET 
  tax_rate = tax_rate / 100,
  tax_amount = (subtotal - COALESCE(discount, 0)) * (tax_rate / 100),
  total = subtotal - COALESCE(discount, 0) + ((subtotal - COALESCE(discount, 0)) * (tax_rate / 100))
WHERE tax_rate > 1;
```

#### 3. Garantir consistência no campo de ISS

**Arquivo**: `src/pages/OrdemServicoForm.tsx`

O campo de input do ISS deve exibir corretamente e permitir edição:
- Verificar se o binding está correto
- Garantir que mudanças no campo disparem recálculo dos totais

---

### Sobre o Bug #3 (Vinculação OS-Reserva)

Este é um **design de funcionalidade pendente**, não um bug. Atualmente:
- A reserva pode vincular a uma OS via `metadata.service_order_id`
- Mas não há lógica para "puxar" os itens/valores da OS para a comanda da reserva

**Sugestão**: Para o segmento `custom`, o fluxo mais adequado seria:
- A reserva atua apenas como "agendamento" (horário do técnico)
- A OS é o documento principal de faturamento
- A "comanda" poderia ser substituída por uma visualização resumida da OS vinculada

Isso requer uma discussão de produto para definir o comportamento desejado.

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/OrdemServicoForm.tsx` | Converter `tax_rate` para decimal ao salvar e vice-versa ao carregar |
| Migração SQL | Corrigir registros existentes com `tax_rate > 1` |

---

### Seção Técnica

**Fluxo de dados atual (com bug):**
```text
[Formulário]         [Banco]           [Trigger]          [Resultado]
taxRate: 5    -->    tax_rate: 5  -->  50 * 5     -->     tax_amount: 250
```

**Fluxo de dados corrigido:**
```text
[Formulário]         [Banco]             [Trigger]            [Resultado]
taxRate: 5    -->    tax_rate: 0.05  -->  50 * 0.05   -->     tax_amount: 2.50
```

**Código do trigger atual (correto, espera decimal):**
```sql
tax_amount = CASE 
  WHEN order_record.order_type = 'complete' 
  THEN (items_sum - COALESCE(order_record.discount, 0)) * COALESCE(order_record.tax_rate, 0.05)
  ELSE 0 
END
```

