
# Plano: Separacao de Segmentos Beleza/Saude e Dashboard Automatico

## Resumo Executivo

Este plano aborda duas necessidades identificadas:
1. **Diferenciar visualmente os segmentos Beleza e Saude** - Atualmente ambos sao tratados como "Saloes e Clinicas" mas precisam de icones, cores e terminologia distintas
2. **Remover a selecao manual de dashboard_mode** - O modo deve ser definido automaticamente pelo segmento escolhido no onboarding, sem necessidade de configuracao adicional pelo cliente

---

## Situacao Atual

### Segmentos no Banco de Dados
- O tipo `VenueSegment` ja suporta: `'sports' | 'beauty' | 'health' | 'custom'`
- O trigger `set_default_dashboard_mode` ja mapeia corretamente:
  - `beauty` -> `appointments`
  - `health` -> `appointments`

### Problemas Identificados
1. **Onboarding nao oferece opcao separada para Saude/Clinica** - Apenas mostra "Saloes e Clinicas" com icone de tesoura (Scissors)
2. **Landing page agrupa Beleza e Saude** - Mesmo card para ambos os segmentos
3. **Configuracoes exibe seletor de dashboard_mode** - Permite alteracao manual, criando confusao
4. **Icones inconsistentes** - SuperAdmin usa `Heart` para saude, mas onboarding usa `Scissors` para ambos

---

## Arquitetura da Solucao

### 1. Adicionar Segmento Saude no Onboarding

Modificar `src/pages/Onboarding.tsx`:

```text
Antes:
- Quadras e Espacos (sports)
- Saloes e Clinicas (beauty) <- agrupa tudo
- Assistencia Tecnica (custom)

Depois:
- Quadras e Espacos (sports) - Icone: Calendar, Cor: Azul
- Saloes e Barbearias (beauty) - Icone: Scissors, Cor: Rosa
- Clinicas e Saude (health) - Icone: Heart, Cor: Teal/Verde-agua
- Assistencia Tecnica (custom) - Icone: Wrench, Cor: Laranja
```

### 2. Atualizar Landing Page

Modificar `src/components/landing/LandingSegments.tsx`:

```text
Antes: 4 cards (Quadras, Saloes e Clinicas, Assistencia, Espacos Gerais)
Depois: 4 cards (Quadras, Saloes/Barbearias, Clinicas/Saude, Assistencia Tecnica)
```

### 3. Remover Seletor de Dashboard Mode das Configuracoes

Modificar `src/components/settings/VenueSettingsTab.tsx`:
- Remover o card "Modo de Visualizacao"
- O dashboard_mode sera definido apenas pelo trigger do banco no momento da criacao da venue

### 4. Atualizar Icones e Cores Consistentes

Padronizar em todos os arquivos:
| Segmento | Icone | Cor Principal | Cor Light |
|----------|-------|---------------|-----------|
| sports | Calendar | blue-500 | blue-50 |
| beauty | Scissors | pink-500 | pink-50 |
| health | Heart | teal-500 | teal-50 |
| custom | Wrench | orange-500 | orange-50 |

---

## Detalhamento Tecnico

### Arquivo 1: `src/pages/Onboarding.tsx`

Alteracoes:
1. Atualizar tipo `VenueSegment` para incluir `'health'`
2. Adicionar novo objeto no array `segments` para Clinicas/Saude
3. Diferenciar descricoes e features entre beleza e saude

```text
Segmento Beleza:
- Titulo: "Saloes e Barbearias"
- Descricao curta: "Servicos por profissional"
- Features: Agenda por profissional, Catalogo de servicos, Multiplos servicos por agendamento, Historico do cliente, Dashboard focado em ticket medio

Segmento Saude:
- Titulo: "Clinicas e Saude"
- Descricao curta: "Consultas e procedimentos"
- Features: Agenda por profissional, Prontuario simplificado, Controle de retornos, Historico do paciente, Dashboard focado em atendimentos
```

### Arquivo 2: `src/components/landing/LandingSegments.tsx`

Alteracoes:
1. Substituir card "Saloes e Clinicas" por dois cards separados
2. Remover card "Espacos em Geral" (redundante com sports)
3. Atualizar icones e cores

### Arquivo 3: `src/components/settings/VenueSettingsTab.tsx`

Alteracoes:
1. Remover o card inteiro de "Modo de Visualizacao" (linhas 610-665)
2. Remover `dashboard_mode` do schema de validacao (linha 69)
3. Remover `dashboard_mode` dos defaultValues e reset
4. Remover do objeto de update na funcao de submit

### Arquivo 4: `src/types/services.ts`

O tipo ja esta correto:
```typescript
export type VenueSegment = 'sports' | 'beauty' | 'health' | 'custom';
```

### Arquivo 5: `src/components/layout/AppSidebar.tsx`

Atualizar condicao de menu para reconhecer `health`:
```typescript
const isServiceVenue = venueSegment && (venueSegment === 'beauty' || venueSegment === 'health');
```

### Arquivo 6: `src/components/help/HelpArticle.tsx`

Ja trata `health` separadamente - nenhuma alteracao necessaria.

---

## Impacto no Dashboard

### Mapeamento Automatico (Trigger SQL)
O trigger `set_default_dashboard_mode` ja esta configurado corretamente:
- `sports` -> `bookings` -> DashboardBookings
- `beauty` -> `appointments` -> DashboardAppointments
- `health` -> `appointments` -> DashboardAppointments
- `custom` -> `service_orders` -> DashboardServiceOrders

### DashboardAppointments
O componente `DashboardAppointments` sera usado tanto para Beauty quanto Health.
Futuras melhorias podem adicionar logica condicional baseada no segmento para:
- Terminologia diferente ("Clientes" vs "Pacientes")
- Metricas especificas (ex: taxa de retorno para clinicas)

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/pages/Onboarding.tsx` | Adicionar segmento health, atualizar icones/cores |
| `src/components/landing/LandingSegments.tsx` | Separar cards beleza/saude |
| `src/components/settings/VenueSettingsTab.tsx` | Remover seletor dashboard_mode |
| `src/components/layout/AppSidebar.tsx` | Ajustar condicao isServiceVenue |

---

## Beneficios

1. **Experiencia mais focada** - Usuarios de clinicas verao terminologia e features relevantes para seu negocio
2. **Menos confusao** - Dashboard automatico elimina decisao desnecessaria do cliente
3. **Consistencia visual** - Icones padronizados em todo o sistema
4. **Preparacao para futuro** - Estrutura pronta para personalizacoes especificas por segmento

---

## Validacao

Apos implementacao, verificar:
1. Onboarding exibe 4 opcoes distintas de segmento
2. Landing page mostra cards separados para Beleza e Saude
3. Configuracoes NAO exibe opcao de alterar dashboard mode
4. Novos cadastros de venue com segment='health' recebem dashboard_mode='appointments' automaticamente
5. Sidebar mostra menu correto (Servicos) para venues beauty e health
