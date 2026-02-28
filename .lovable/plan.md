

# Melhorias no Super Admin - CRM como Painel Principal

## Resumo das mudancas

4 problemas identificados para resolver:

1. **Remover tabs "Dashboard" e "Clientes"** - O Super Admin sera apenas o CRM (painel unico)
2. **Adicionar campo OBS (observacoes) nos leads** - Migracao no banco + campo no form
3. **Criar visualizacao/edicao de lead ao clicar** - Sheet lateral com todos os dados editaveis
4. **Corrigir responsividade** - Colunas devem expandir para ocupar a tela toda, sem barra de rolagem desnecessaria

---

## 1. Simplificar SuperAdmin.tsx

Remover o sistema de tabs e os imports de `SuperAdminDashboard` e `VenueClientsTab`. O conteudo principal sera diretamente o `CrmBoard`, mantendo o header glass com titulo "Centro de Comando" mas sem botoes de tabs.

**Arquivo**: `src/pages/SuperAdmin.tsx`

---

## 2. Adicionar campo `notes` na tabela `saas_crm_leads`

**Migracao SQL**:
```sql
ALTER TABLE public.saas_crm_leads ADD COLUMN notes text;
```

Atualizar a interface `CrmLead` no hook `useCrmBoard.ts` para incluir `notes: string | null`.

Adicionar campo "Observacoes" (Textarea) no `AddLeadDialog.tsx`.

---

## 3. Sheet de visualizacao/edicao do lead

Criar componente `src/components/superadmin/LeadDetailSheet.tsx`:
- Abre ao clicar no card do lead (nao no drag)
- Sheet lateral (lado direito) com estilo glass (bg-slate-900, border-white/10)
- Campos editaveis: empresa, contato, whatsapp, plano, segmento, coluna, observacoes
- Botao "Salvar" que chama um novo mutation `updateLead` no hook
- Botao "Excluir" com confirmacao

**Mudancas no hook** `useCrmBoard.ts`:
- Adicionar `updateLeadMutation` para atualizar todos os campos de um lead
- Expor `updateLead` no return

**Mudancas no** `CrmLeadCard.tsx`:
- Adicionar prop `onClick` para abrir o sheet
- O click no card (exceto drag e botoes) abre o detail sheet

**Mudancas no** `CrmBoard.tsx`:
- Estado para lead selecionado (`selectedLead`)
- Renderizar `LeadDetailSheet` passando o lead selecionado

---

## 4. Corrigir responsividade do board

**Mudancas no** `CrmColumn.tsx`:
- Remover `w-72 flex-shrink-0` fixo
- Usar `flex-1 min-w-[220px]` para que as colunas expandam igualmente e ocupem todo o espaco disponivel
- Em telas menores onde nao cabe tudo, manter scroll horizontal

**Mudancas no** `CrmBoard.tsx`:
- No container flex do board, usar `min-w-0` e garantir que em telas grandes as colunas preencham 100% da largura
- Remover `overflow-x-auto` em telas grandes (so manter em mobile)

**Mudancas no** `SuperAdmin.tsx`:
- Trocar `container` por `px-4 lg:px-8` no content area para nao limitar a largura maxima do board em telas grandes

---

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/SuperAdmin.tsx` | Remover tabs, renderizar CrmBoard direto, ajustar padding |
| `src/hooks/useCrmBoard.ts` | Adicionar `notes` na interface, adicionar `updateLead` mutation |
| `src/components/superadmin/CrmBoard.tsx` | Estado de lead selecionado, renderizar LeadDetailSheet |
| `src/components/superadmin/CrmColumn.tsx` | Responsividade flex-1 |
| `src/components/superadmin/CrmLeadCard.tsx` | onClick para abrir detail, mostrar preview de notes |
| `src/components/superadmin/AddLeadDialog.tsx` | Adicionar campo Observacoes |
| `src/components/superadmin/LeadDetailSheet.tsx` | **NOVO** - Sheet de visualizacao/edicao |
| Migracao SQL | Adicionar coluna `notes` |

