

# Pacotes de Serviços / Planos + Grupo de Recorrência

## Fase 1: Migração de Base de Dados

### 1.1 Novas colunas em `bookings`
- `recurrence_group_id` (uuid, nullable)
- `package_id` (uuid, nullable, FK para `customer_packages`)

### 1.2 Nova tabela `customer_packages`
```text
customer_packages
├── id (uuid PK)
├── venue_id (uuid FK venues, NOT NULL)
├── customer_id (uuid FK customers, NOT NULL)
├── service_id (uuid FK services, NOT NULL)
├── total_sessions (integer NOT NULL)
├── used_sessions (integer DEFAULT 0)
├── status (text DEFAULT 'active') -- 'active', 'exhausted', 'cancelled'
├── expires_at (timestamptz, nullable)
└── created_at (timestamptz DEFAULT now())
```

RLS: `is_venue_member(auth.uid(), venue_id)` para SELECT e ALL (mesmo padrão do projeto).

### 1.3 Atualizar `create_recurring_bookings`
- Gerar `v_recurrence_group_id := gen_random_uuid()` no início
- Inserir em cada booking criado

### 1.4 Trigger `trg_booking_package_session`
- AFTER UPDATE em `bookings`
- Quando `NEW.status = 'FINALIZED'` AND `NEW.package_id IS NOT NULL` AND (`OLD.status != 'FINALIZED'`)
- Incrementa `used_sessions` no `customer_packages` correspondente
- Se `used_sessions >= total_sessions`, muda status para `'exhausted'`
- Usa validation trigger (não CHECK constraint) conforme guidelines

**Nota:** O enum existente usa `FINALIZED` (não `completed`). A trigger usará `FINALIZED`.

---

## Fase 2: Hook + UI na Ficha do Cliente

### 2.1 Hook `useCustomerPackages.ts`
- Query: pacotes de um customer_id (join com services para obter `title`)
- Mutations: criar pacote, cancelar pacote
- Filtro por `venue_id`

### 2.2 Tab "Pacotes" no `CustomerHistorySheet.tsx`
- Novo tab visível para segmentos `beauty` e `health`
- Tabs: Prontuário | Pacotes | Histórico (health) ou Pacotes | Histórico (beauty)
- Conteúdo:
  - Botão "Vender Novo Pacote" abre Dialog com: Serviço (select), Total de Sessões (input number), Data de Validade (date picker opcional)
  - Lista de pacotes com: nome do serviço, Progress bar (`used_sessions / total_sessions`), Badge de status (verde=ativo, cinza=esgotado, vermelho=cancelado), botão cancelar
- Responsivo: cards compactos no mobile

---

## Fase 3: Integração no Wizard de Agendamento

### 3.1 `ServiceBookingWizard.tsx`
- Após selecionar customer + serviço(s), consultar `customer_packages` via hook
- Se existir pacote ativo para algum dos serviços selecionados, mostrar Alert verde com:
  - "Cliente possui pacote ativo para [serviço]. Restam X de Y sessões."
  - Switch "Utilizar saldo do pacote?"
- Se switch ativo ao submeter:
  - `price` forçado a 0 para o serviço coberto
  - `package_id` incluído no payload
- Adaptar a RPC `create_service_booking` para aceitar `p_package_id` opcional e definir na booking

### 3.2 Atualizar RPC `create_service_booking`
- Novo parâmetro `p_package_id uuid DEFAULT NULL`
- Inserir `package_id` na booking criada

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Nova migração SQL | Colunas bookings, tabela customer_packages, trigger, update RPCs |
| `src/hooks/useCustomerPackages.ts` | Novo hook CRUD |
| `src/components/customers/CustomerHistorySheet.tsx` | Nova tab "Pacotes" |
| `src/components/customers/SellPackageDialog.tsx` | Novo dialog de venda |
| `src/components/agenda/ServiceBookingWizard.tsx` | Alert + Switch de pacote |

