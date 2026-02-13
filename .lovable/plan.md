

## Implementacao: Menu Visual de Servicos + Combo + Profissional Inteligente (Beauty)

Este plano implementa 3 funcionalidades integradas para a pagina publica do segmento Beauty:
1. Grid visual "Insta-Style" de servicos com imagem de capa
2. Multi-selecao de servicos (combos) com soma automatica de duracao/preco
3. Selecao inteligente de profissional baseada na quantidade de bookable members

---

### Etapa 1 - Migration SQL (Banco de Dados)

**1.1 Adicionar `cover_image_url` na tabela `services`**

Nova coluna `text` nullable para armazenar a URL da imagem de capa.

**1.2 Atualizar RPC `get_public_venue_by_slug`**

Incluir `v.segment` no retorno da funcao para que o frontend saiba qual widget renderizar.

**1.3 Criar RPC `get_public_services_by_venue`**

Funcao SECURITY DEFINER com acesso anonimo que retorna servicos ativos de uma venue (apenas id, title, description, price, duration_minutes, cover_image_url). Filtra `is_active = true`, ordena por `display_order`.

**1.4 Criar RPC `get_public_venue_professionals`**

Funcao SECURITY DEFINER com acesso anonimo que:
- Recebe `p_venue_id` e `p_service_ids[]`
- Retorna profissionais bookable que atendem TODOS os servicos (member_id, display_name, avatar_url, bio)
- NUNCA retorna email, phone, user_id ou dados sensíveis
- Se nenhum profissional bookable existir, busca o admin da venue e o torna bookable automaticamente usando `INSERT ... ON CONFLICT DO NOTHING` na `professional_services` e um UPDATE idempotente em `venue_members`

**1.5 Criar RPC `get_professional_availability_public`**

Funcao SECURITY DEFINER com acesso anonimo que:
- Recebe `p_venue_id`, `p_date`, `p_total_duration_minutes`, `p_professional_id` (opcional)
- Gera slots baseado no `slot_interval_minutes` da venue (8h-20h)
- Usa logica de `OVERLAPS` (tsrange) para verificar conflitos no intervalo `[slot_start, slot_start + total_duration]` contra bookings existentes do profissional
- Se `p_professional_id` for NULL, agrega slots de todos os profissionais bookable
- Retorna `(slot_start timestamptz, professional_id uuid, professional_name text)`
- Timezone: todas as comparacoes em `America/Sao_Paulo`

---

### Etapa 2 - Tipos e Hook de Servicos

**Arquivo: `src/types/services.ts`**
- Adicionar `cover_image_url: string | null` em `Service`, `ServiceInsert` e `ServiceUpdate`

**Arquivo: `src/hooks/useServices.ts`**
- Incluir `cover_image_url` na mutation de create/update

---

### Etapa 3 - Upload de Imagem no Formulario de Servico

**Arquivo: `src/components/services/ServiceFormDialog.tsx`**

Adicionar:
- Campo de upload de imagem de capa (usando `useFileUpload`)
- Preview da imagem com botao de remover
- Upload para bucket `public-page-assets` na pasta `services/{venue_id}/`
- Campo opcional, schema zod atualizado com `cover_image_url`
- Envio do `cover_image_url` nas mutations de create e update

---

### Etapa 4 - Novo Componente ServiceBookingWidget

**Arquivo novo: `src/components/public-page/ServiceBookingWidget.tsx`**

Widget dedicado para o fluxo beauty/health na pagina publica. Fluxo adaptativo em 4 passos:

**Passo 1 - Selecao de Servicos (Grid Visual)**
- Grid responsivo: 1 coluna mobile, 2 colunas tablet, 3 desktop
- Cards com imagem de capa (aspect-ratio 4:3), fallback com cor/icone
- Nome, preco e duracao abaixo da imagem
- Checkbox de selecao no card
- Barra de resumo sticky no rodape: "2 servicos - R$ 120 - 1h30" + botao "Continuar"
- Limite de 5 servicos por agendamento

**Passo 2 - Selecao de Data**
- Seletor de semana (7 dias) reutilizando padrao existente
- Navegacao semanal (anterior/proxima)
- Dias passados desabilitados

**Passo 3 - Profissional + Horario (Adaptativo)**

Logica baseada na quantidade de profissionais bookable que atendem os servicos selecionados:

| Cenario | Fluxo |
|---|---|
| 0 bookable (auto-criou admin) ou 1 bookable | Pula selecao, mostra direto horarios do unico profissional |
| 2+ bookable | Cards dos profissionais (foto, nome, bio) -> ao selecionar, mostra horarios dele |

- Grid de horarios: cada slot mostra apenas horario de inicio
- Slots calculados com base na duracao total do combo
- Se o usuario alterar servicos no passo 1, profissional e horario sao resetados (state cleanup)

**Passo 4 - Dados do Cliente + Confirmacao**
- Formulario: nome, email, telefone
- Resumo: servicos, profissional, data/hora, valor total
- Botao "Confirmar Agendamento"
- Chama RPC `create_service_booking` existente (ja suporta multi-servicos)

---

### Etapa 5 - Integracao na Pagina Publica

**Arquivo: `src/pages/public/PublicPageVenue.tsx`**
- Atualizar interface `PublicVenue` para incluir `segment`
- Condicionar renderizacao: `segment === 'beauty' || segment === 'health'` -> `ServiceBookingWidget`; caso contrario -> `BookingWidget`

**Arquivo: `src/components/public-page/MobileBookingButton.tsx`**
- Atualizar interface para incluir `segment`
- Renderizar `ServiceBookingWidget` dentro do drawer quando beauty/health

**Arquivo: `src/components/public-page/index.ts`**
- Exportar `ServiceBookingWidget`

---

### Resumo dos Arquivos

| Arquivo | Acao |
|---|---|
| Migration SQL | `cover_image_url` em services, RPCs publicas (4 funcoes), grants anon |
| `src/types/services.ts` | Adicionar `cover_image_url` nas interfaces |
| `src/hooks/useServices.ts` | Incluir `cover_image_url` nas mutations |
| `src/components/services/ServiceFormDialog.tsx` | Upload de imagem de capa |
| `src/components/public-page/ServiceBookingWidget.tsx` | Criar (novo widget com fluxo adaptativo) |
| `src/components/public-page/MobileBookingButton.tsx` | Condicionar por segmento |
| `src/components/public-page/index.ts` | Exportar novo componente |
| `src/pages/public/PublicPageVenue.tsx` | Condicionar widget por segmento |

### Garantias de Seguranca

- RPCs publicas nunca retornam email, phone, user_id ou dados de auth
- Auto-criacao do admin como profissional usa `ON CONFLICT DO NOTHING` (idempotente)
- Disponibilidade usa logica de `OVERLAPS` com `tsrange` para duracao total do combo
- Todas as comparacoes de tempo em timezone `America/Sao_Paulo`
- Bucket `public-page-assets` ja possui politicas corretas (SELECT public, INSERT/UPDATE/DELETE autenticado)
- Reset de estado no frontend ao alterar servicos selecionados

