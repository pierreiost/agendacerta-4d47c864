

## Plano: Múltiplos Telefones para a Empresa (até 5)

### Objetivo

Permitir que a empresa cadastre até **5 números de telefone** nas configurações da unidade, e exibir todos eles no cabeçalho da Ordem de Serviço (OS) gerada em PDF.

---

### Resumo das Alterações

| Área | O que muda |
|------|------------|
| **Banco de Dados** | Nova coluna `phones TEXT[]` na tabela `venues` |
| **Configurações** | Campo dinâmico para adicionar/remover telefones |
| **PDF da OS** | Exibir todos os telefones no cabeçalho |

---

### Experiência do Usuário

**Tela de Configurações > Comunicação:**

```text
Telefones da Empresa (máx. 5)
┌─────────────────────────────────┐
│ (11) 3333-4444             [X]  │  ← Remover
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ (11) 99999-8888            [X]  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ (11) 2222-1111             [X]  │
└─────────────────────────────────┘
        [+ Adicionar telefone]        ← Aparece se < 5
```

**PDF da OS (cabeçalho):**

```text
┌─────────────────────────────────────────────┐
│  [LOGO]  NOME DA EMPRESA                    │
│          CNPJ: 00.000.000/0001-00           │
│          Rua Exemplo, 123 - Centro          │
│          (11) 3333-4444 | (11) 99999-8888   │  ← Todos os telefones
│          contato@empresa.com                │
└─────────────────────────────────────────────┘
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| **Migração SQL** | Adicionar coluna `phones TEXT[]` em `venues` |
| `src/components/settings/VenueSettingsTab.tsx` | Substituir campo único por lista dinâmica |
| `src/hooks/useServiceOrderPdf.ts` | Usar array de telefones no cabeçalho |

---

### Detalhes Técnicos

#### 1. Migração do Banco de Dados

```sql
-- Adicionar coluna phones como array de texto
ALTER TABLE venues 
ADD COLUMN phones TEXT[] DEFAULT '{}';

-- Migrar dados existentes do campo phone para o array
UPDATE venues 
SET phones = ARRAY[phone] 
WHERE phone IS NOT NULL AND phone != '';
```

#### 2. Formulário de Configurações

Modificar `VenueSettingsTab.tsx`:

- Adicionar campo `phones` ao schema Zod:
```typescript
phones: z.array(z.string().max(20)).max(5).default([]),
```

- Criar componente para gerenciar lista de telefones:
  - Lista de inputs com máscara de telefone
  - Botão "Adicionar" (visível quando < 5 telefones)
  - Botão "Remover" em cada linha (visível quando > 1 telefone)

- Atualizar `onSubmit` para salvar o array:
```typescript
phones: data.phones.map(p => unmask(p)).filter(Boolean),
```

#### 3. Geração do PDF

Modificar `useServiceOrderPdf.ts`:

- Buscar telefones do array `phones` (com fallback para `phone`):
```typescript
const phones = currentVenue?.phones?.length 
  ? currentVenue.phones.map(p => maskPhone(p)).join(' | ')
  : currentVenue?.phone 
    ? maskPhone(currentVenue.phone)
    : null;
```

- Exibir na linha de contato:
```typescript
const contactParts = [phones, currentVenue?.email].filter(Boolean);
```

---

### Compatibilidade

- O campo `phone` (singular) será mantido para retrocompatibilidade
- Ao salvar, o primeiro telefone do array também será salvo em `phone`
- Sistemas legados que usam `venue.phone` continuarão funcionando

