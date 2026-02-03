
# Plano: Convite de Membros + Google Calendar por Membro + Melhorias OS

## Resumo das 3 Solicitações

Você levantou 3 pontos importantes que precisam ser implementados:

1. **Criação de membros**: Não existe botão "Convidar" ou "Adicionar" membro na tela de equipe
2. **Google Calendar por membro**: Atualmente a integração está vinculada ao **venue** (unidade), não por **membro individual**
3. **Ordem de Serviço**: Imposto padrão deve ser 0% e deve permitir puxar serviços além de produtos

---

## 1. Funcionalidade de Convite de Membro

### Situação Atual
- A lista de membros (`TeamMembersList.tsx`) mostra apenas os membros existentes
- **Não há** botão "Convidar" ou fluxo para adicionar novos membros
- Membros só entram na equipe via código ou manualmente no banco

### Solução Proposta

Criar um `InviteMemberDialog` que permite:
- Buscar usuário existente por email (se já tem conta no sistema)
- Selecionar a função inicial (Gerente, Funcionário, etc.)
- Adicionar o usuário como membro da venue

**Fluxo de UI:**

```text
┌─────────────────────────────────────────────────────────────────┐
│ MEMBROS E PERMISSÕES                          [+ Convidar]      │
├─────────────────────────────────────────────────────────────────┤
│ ...lista de membros...                                          │
└─────────────────────────────────────────────────────────────────┘

Dialog de Convite:
┌─────────────────────────────────────────────────────────────────┐
│ Adicionar Membro                                           [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Buscar por email *                                              │
│ [________________________]  [Buscar]                            │
│                                                                 │
│ (Resultado da busca - mostra se usuário existe)                 │
│                                                                 │
│ Função                                                          │
│ [Funcionário ▼]                                                 │
│                                                                 │
│ [       Adicionar à Equipe       ]                              │
└─────────────────────────────────────────────────────────────────┘
```

### Arquivos a Criar/Modificar
- `src/components/team/InviteMemberDialog.tsx` (criar)
- `src/hooks/useTeamMembers.ts` (adicionar mutation `inviteMember`)
- `src/pages/Configuracoes.tsx` (adicionar botão no header do card)

---

## 2. Google Calendar por Membro

### Situação Atual
- A tabela `google_calendar_tokens` possui:
  - `venue_id` (obrigatório)
  - **NÃO TEM** `user_id`
- Cada **venue** tem UMA conexão com Google Calendar
- Todos os membros compartilham o mesmo calendário

### O Que Você Precisa
- Cada membro conecta **seu próprio** Google Calendar
- Cada membro vê apenas **suas próprias** reservas sincronizadas
- Admin vê **todas** as agendas (ou pode ter acesso a todas)
- Booking sincroniza no calendário do **profissional designado**

### Solução Proposta

#### 2.1 Alteração de Banco de Dados

Adicionar coluna `user_id` na tabela `google_calendar_tokens`:

```sql
-- Adicionar coluna user_id
ALTER TABLE google_calendar_tokens 
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Permitir conexões por membro (venue_id + user_id único)
-- Se user_id for NULL = conexão antiga do venue (fallback)
CREATE UNIQUE INDEX google_calendar_tokens_venue_user_idx 
ON google_calendar_tokens(venue_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

-- Atualizar RLS para permitir membro ver/editar sua própria conexão
```

#### 2.2 Alteração de Lógica

**Hook `useGoogleCalendar`:**
- Passa a buscar token onde `user_id = auth.uid()` (ou fallback venue-wide se não tiver)
- Cada membro conecta sua própria conta Google

**Edge Function `google-calendar-auth`:**
- Recebe `user_id` além de `venue_id`
- Salva conexão vinculada ao membro

**Edge Function `google-calendar-sync`:**
- Ao sincronizar booking, busca o calendário do `professional_id` do booking
- Se o profissional não tem calendário conectado, não sincroniza (ou usa fallback do venue)

**Tela de Configurações:**
- Cada membro vê SUA própria conexão na aba Integrações
- Admin pode ver todas as conexões dos membros

### Arquivos a Modificar
- Migração SQL (adicionar `user_id` à tabela)
- `src/hooks/useGoogleCalendar.ts` (buscar por user)
- `supabase/functions/google-calendar-auth/index.ts` (salvar user_id)
- `supabase/functions/google-calendar-callback/index.ts` (salvar user_id)
- `supabase/functions/google-calendar-sync/index.ts` (buscar calendário do profissional)
- `src/pages/Configuracoes.tsx` (UI de conexão individual)

---

## 3. Ordem de Serviço - Imposto 0% e Serviços

### 3.1 Imposto Padrão 0%

**Situação Atual:**
- `tax_rate` default é `0.05` (5%) no `ServiceOrderFormDialog.tsx` linha 86

**Alteração:**
- Mudar default de `0.05` para `0` 
- Arquivo: `src/components/service-orders/ServiceOrderFormDialog.tsx`

### 3.2 Adicionar Serviços na OS

**Situação Atual:**
- Aba "Peças" (linha 119-122) puxa apenas da tabela `products`
- Não puxa da tabela `services`

**Solução Proposta:**

Renomear aba "Peças" para "Catálogo" e adicionar filtro de tipo:

```text
┌───────────────────────────────────────────────────────────────┐
│ [Catálogo] [Mão de Obra] [Manual]                             │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ Exibir: (•) Produtos  ( ) Serviços  ( ) Todos                │
│                                                               │
│ [Buscar...]                                                   │
│                                                               │
│ - Capacitor 25uF (Produto)            R$ 35,00               │
│ - Instalação Split (Serviço)          R$ 200,00              │
└───────────────────────────────────────────────────────────────┘
```

**Lógica:**
- Usar hook `useServices` além de `useProducts`
- Combinar os dois catálogos com um campo `type: 'product' | 'service'`
- Filtrar pela seleção do usuário

### Arquivos a Modificar
- `src/components/service-orders/ServiceOrderFormDialog.tsx` (tax_rate: 0)
- `src/components/service-orders/ServiceOrderItemForm.tsx` (adicionar serviços + filtro)

---

## 4. Detalhes Técnicos

### 4.1 InviteMemberDialog

```typescript
// Buscar usuário por email
const { data: profile } = await supabase
  .from('profiles')
  .select('user_id, full_name')
  .eq('email', searchEmail) // precisa adicionar email ao profiles ou usar auth.users
  .maybeSingle();

// Adicionar como membro
await supabase.from('venue_members').insert({
  venue_id,
  user_id: profile.user_id,
  role: selectedRole,
});
```

**Nota:** Precisamos verificar se `profiles` tem campo `email` ou se buscamos via `auth.users` (requer service role).

### 4.2 ServiceOrderItemForm - Catálogo Unificado

```typescript
const { products } = useProducts();
const { services } = useServices();
const [catalogFilter, setCatalogFilter] = useState<'products' | 'services' | 'all'>('products');

const catalogItems = useMemo(() => {
  const prods = catalogFilter !== 'services' 
    ? products.filter(p => p.is_active).map(p => ({ 
        id: p.id, 
        name: p.name, 
        price: p.price, 
        type: 'product' as const,
        category: p.category?.name 
      })) 
    : [];
  
  const servs = catalogFilter !== 'products' 
    ? services.filter(s => s.is_active).map(s => ({ 
        id: s.id, 
        name: s.title, 
        price: s.price, 
        type: 'service' as const,
        category: null 
      })) 
    : [];
  
  return [...prods, ...servs];
}, [products, services, catalogFilter]);
```

---

## 5. Ordem de Implementação

1. **Imposto 0% padrão** (mudança simples - 2 linhas)
2. **Serviços na OS** (aba de catálogo unificado)
3. **Botão de Convidar Membro** (InviteMemberDialog)
4. **Google Calendar por Membro** (requer migração + refatoração)

---

## 6. Considerações

### Sobre o Convite de Membros
- O usuário precisa já ter uma conta no sistema para ser adicionado
- Alternativa mais complexa: sistema de convite por email com link de cadastro (futura implementação)

### Sobre o Google Calendar
- Conexões antigas (sem user_id) continuam funcionando como fallback
- Novas conexões são por membro individual
- Booking sincroniza no calendário do profissional designado
- Se profissional não tem calendário, não sincroniza ou usa fallback do venue

### Sobre a OS
- O filtro de tipo (produtos/serviços) é local, não persiste no banco
- Serviços têm estrutura diferente: `title` em vez de `name`, mas normalizamos na UI
