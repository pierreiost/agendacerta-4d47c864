

# Execucao: 4 Ajustes no Super Admin

## Passo 1 - Sidebar: apenas "Super Admin" para superadmins

**Arquivo**: `src/components/layout/AppSidebar.tsx` (linhas 150-167)

Substituir os 2 grupos (PRINCIPAL + ADMINISTRACAO) por um unico grupo:

```typescript
const allMenuGroups: MenuGroup[] = isSuperAdmin
  ? [
      {
        label: "ADMINISTRACAO",
        items: [
          { title: "Super Admin", href: "/superadmin", icon: Shield },
        ],
      },
    ]
  : [ /* ... menu regular inalterado ... */ ];
```

Remove Dashboard, Clientes e Relatorios do menu do superadmin.

---

## Passo 2 - Persistencia com useFormPersist (react-hook-form)

Os dois formularios (AddLeadDialog e LeadDetailSheet) precisam ser convertidos de `useState` para `react-hook-form` + `useFormPersist`, seguindo o padrao arquitetural do projeto.

### AddLeadDialog.tsx

- Importar `useForm` do react-hook-form e `useFormPersist` do projeto
- Criar schema de form com `useForm({ defaultValues: { person_name: '', company_name: '', ... } })`
- Conectar `useFormPersist({ form, key: 'crm_add_lead' })`
- Substituir inputs `value={form.x} onChange={...}` por `{...form.register('field')}` e controlled components para Selects
- No submit: chamar `clearDraft()` antes de fechar
- No cancelar: chamar `clearDraft()` e resetar o form

### LeadDetailSheet.tsx

- Mesma conversao para react-hook-form
- Key de persistencia dinamica por lead: `crm_edit_lead_${lead?.id}`
- Usar `form.reset(...)` no useEffect quando o lead muda (com guard para nao sobrescrever draft)
- `clearDraft()` no salvar e no excluir

---

## Passo 3 - Unificar WhatsApp e Contato

O campo `whatsapp` separado e redundante. Unificar em um unico campo "Telefone (WhatsApp)" que serve tanto como contato quanto como link do WhatsApp.

### AddLeadDialog.tsx e LeadDetailSheet.tsx
- Remover o campo "WhatsApp" separado
- Renomear label do campo `whatsapp` para **"Telefone (WhatsApp)"**
- O campo `person_name` continua como "Contato" (nome da pessoa)
- O valor do campo telefone e usado diretamente para gerar o link `wa.me/`

### CrmLeadCard.tsx
- Exibir o telefone formatado abaixo do nome do contato (se existir)
- Manter o icone do WhatsApp usando `unmask(lead.whatsapp)` para o link

---

## Passo 4 - Mascara de telefone

### AddLeadDialog.tsx e LeadDetailSheet.tsx
- Importar `maskPhone` e `unmask` de `@/lib/masks`
- Aplicar `maskPhone` no onChange do campo de telefone: `(00) 00000-0000`
- No submit, salvar com `unmask()` para o banco (apenas digitos)
- No CrmLeadCard, usar `unmask()` para o link wa.me e `maskPhone()` para exibicao visual

---

## Arquivos modificados (4 arquivos, 0 novos)

| Arquivo | Mudanca |
|---|---|
| `src/components/layout/AppSidebar.tsx` | Sidebar superadmin so com "Super Admin" |
| `src/components/superadmin/AddLeadDialog.tsx` | react-hook-form + useFormPersist + unificar campo + mascara |
| `src/components/superadmin/LeadDetailSheet.tsx` | react-hook-form + useFormPersist + unificar campo + mascara |
| `src/components/superadmin/CrmLeadCard.tsx` | Exibir telefone formatado, manter link WhatsApp |

Nenhuma migracao de banco necessaria. O campo `whatsapp` na tabela continua sendo reutilizado, apenas a UI muda.

