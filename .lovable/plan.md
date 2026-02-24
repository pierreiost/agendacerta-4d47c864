
# Plano: Correcao dos 4 Bugs Diagnosticados

## Resumo
Corrigir 4 problemas identificados: perda de dados ao mudar de aba, botao "Salvar" inacessivel no mobile (Clientes), erro ao excluir servicos com historico, e duplo-clique nos horarios da pagina publica mobile.

---

## Bug 1: Perda de Dados ao Mudar de Aba (refetchOnWindowFocus)

**Causa**: O `QueryClient` em `src/App.tsx` e criado sem configuracao, herdando `refetchOnWindowFocus: true` como padrao do React Query.

**Solucao**: Configurar o `QueryClient` global com `refetchOnWindowFocus: false` nas `defaultOptions`.

**Arquivo**: `src/App.tsx` (linha 38)
- Alterar `new QueryClient()` para incluir:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});
```

Isso resolve o problema globalmente sem precisar alterar hooks individuais.

---

## Bug 2: Botao "Salvar" Inacessivel no Mobile (CustomerFormDialog)

**Causa**: O `DialogContent` do `CustomerFormDialog` ja possui `max-h-[90vh] overflow-y-auto`, mas o formulario longo com campos de endereco pode ainda ser problematico em telas muito pequenas. O grid de campos de endereco usa `grid-cols-3` e `grid-cols-4` sem breakpoints responsivos, espremendo os inputs no mobile.

**Solucao**: Ajustar os grids do formulario para serem responsivos:

**Arquivo**: `src/components/customers/CustomerFormDialog.tsx`
- Linha 309: `grid-cols-2` -> `grid-cols-1 sm:grid-cols-2` (email/telefone)
- Linha 365: `grid-cols-3` -> `grid-cols-1 sm:grid-cols-3` (CEP/logradouro)
- Linha 406: `grid-cols-4` -> `grid-cols-2 sm:grid-cols-4` (numero/complemento/bairro)
- Linha 452: `grid-cols-4` -> `grid-cols-2 sm:grid-cols-4` (cidade/UF)
- Ajustar `col-span` correspondentes para mobile

O `DialogContent` base ja tem `max-h-[90vh] overflow-y-auto` aplicado globalmente, garantindo que o scroll funcione.

---

## Bug 3: Erro ao Excluir Servicos (Foreign Key Constraint)

**Causa**: A tabela `services` possui referencias em `booking_services` e `professional_services`. Excluir um servico com historico viola a constraint de chave estrangeira.

**Decisao**: Implementar Soft Delete (inativacao) em vez de exclusao fisica.

**Alteracoes**:

1. **`src/pages/Servicos.tsx`**:
   - Substituir o botao "Excluir" no dropdown por "Inativar" (quando o servico esta ativo)
   - Remover o `AlertDialog` de exclusao fisica e substituir por uma acao de toggle que usa o `toggleActive` ja existente
   - Manter a opcao "Excluir" apenas para servicos que nunca foram usados (verificacao client-side opcional) OU remover completamente e usar apenas inativacao
   - Simplificacao: remover `deleteService` do uso e usar apenas `toggleActive`

2. **`src/hooks/useServices.ts`**:
   - Alterar `deleteService` para fazer soft delete (`update is_active = false`) em vez de `delete`
   - Renomear toast para "Servico inativado!"
   - Adicionar tratamento de erro amigavel para FK constraint como fallback

3. **`src/pages/Servicos.tsx`** (UI):
   - No dropdown de acoes, trocar "Excluir" por "Desativar" com icone adequado
   - O dialog de confirmacao muda o texto para "Desativar servico" em vez de "Excluir"
   - Servicos inativos ja aparecem na lista com switch desligado (funcionalidade existente)

---

## Bug 4: Duplo-Clique nos Horarios da Pagina Publica (Mobile)

**Causa**: Os botoes de horario no `ServiceBookingWidget.tsx` (linha 392-409) usam classes `hover:border-primary/50` que em dispositivos touch interceptam o primeiro toque como hover.

**Solucao**: 

**Arquivo**: `src/components/public-page/ServiceBookingWidget.tsx`
- Nos botoes de horario (linha 400-405): Adicionar `touch-action: manipulation` via classe Tailwind e usar `onTouchEnd` alem de `onClick` para garantir resposta imediata
- Simplificar: Remover o estado hover problematico no mobile usando media query ou substituir por `active:` states
- Alterar a classe do botao nao-selecionado de `hover:border-primary/50` para `active:border-primary/50 md:hover:border-primary/50`
- Adicionar a classe `touch-manipulation` (Tailwind) para eliminar o delay de 300ms em touch devices

---

## Detalhes Tecnicos

### Arquivos Modificados:
1. `src/App.tsx` -- QueryClient defaultOptions
2. `src/components/customers/CustomerFormDialog.tsx` -- grids responsivos
3. `src/hooks/useServices.ts` -- soft delete em vez de hard delete
4. `src/pages/Servicos.tsx` -- UI de inativacao em vez de exclusao
5. `src/components/public-page/ServiceBookingWidget.tsx` -- fix touch/hover

### Principios:
- Zero alteracao em schema de banco (o campo `is_active` ja existe na tabela `services`)
- Zero alteracao em RLS policies
- Todas as mudanças de CSS usam prefixos responsivos para preservar o desktop
- A logica de negocio existente (toggleActive, useServices) e reutilizada
