

# Plano: Adaptação Completa do Segmento Health (Clínicas e Saúde)

## Resumo Executivo

Este plano visa adaptar completamente a experiência do usuário para o segmento **health** (Clínicas e Saúde), substituindo ícones de tesoura (Scissors) por coração (Heart) e ajustando a terminologia de "clientes" para "pacientes" quando apropriado.

---

## Escopo das Alterações

### 1. Ícones (Scissors → Heart)

Todos os locais que exibem o ícone `Scissors` precisam renderizar `Heart` quando o segmento for `health`.

### 2. Terminologia (Clientes → Pacientes)

Para o segmento health, ajustar:
- "Clientes" → "Pacientes"
- "Próximos Clientes" → "Próximos Pacientes"
- "Atende Clientes" → "Atende Pacientes"

---

## Estratégia de Implementação

### Criar Utilitário Centralizado

Novo arquivo com funções helper para padronizar a lógica:

```text
src/lib/segment-utils.ts
├── getServiceIcon(segment) → Heart ou Scissors
├── getClientLabel(segment) → "Paciente" ou "Cliente"
├── getClientsLabel(segment) → "Pacientes" ou "Clientes"
```

---

## Arquivos a Modificar

### Grupo 1: Ícones (7 arquivos)

| Arquivo | Local do Scissors | Alteração |
|---------|-------------------|-----------|
| `src/components/dashboard/DashboardAppointments.tsx` | MetricCard "Atendimentos Hoje" (linha 174) | Usar `getServiceIcon()` |
| `src/pages/Servicos.tsx` | Empty states (linhas 108, 152) | Usar `getServiceIcon()` |
| `src/components/bookings/BeautyBookingSheet.tsx` | Ícone na lista de serviços (linha 233) | Usar `getServiceIcon()` |
| `src/components/agenda/ServiceBookingWizard.tsx` | Label "Serviços" no step 2 (linha 450) | Usar `getServiceIcon()` |
| `src/components/team/ProfessionalFormDialog.tsx` | Empty state "Nenhum serviço" (linha 191) | Usar `getServiceIcon()` |
| `src/pages/Configuracoes.tsx` | Seção Profissionais (linhas 362, 379, 435) | Usar `getServiceIcon()` |
| `src/components/help/HelpSidebar.tsx` | iconMap para artigos | Adicionar Heart ao mapa |

### Grupo 2: Terminologia (3 arquivos)

| Arquivo | Termo Atual | Novo Termo (health) |
|---------|-------------|---------------------|
| `src/components/dashboard/DashboardAppointments.tsx` | "Próximos Clientes" (linha 230) | "Próximos Pacientes" |
| `src/pages/Configuracoes.tsx` | "Atende Clientes" (linha 391) | "Atende Pacientes" |
| `src/components/team/ProfessionalFormDialog.tsx` | "clientes possam agendar" (linha 126) | "pacientes possam agendar" |

---

## Detalhamento Técnico

### Arquivo Novo: `src/lib/segment-utils.ts`

```typescript
import { Heart, Scissors, type LucideIcon } from 'lucide-react';

export function getServiceIcon(segment?: string): LucideIcon {
  return segment === 'health' ? Heart : Scissors;
}

export function getClientLabel(segment?: string, capitalize = false): string {
  const label = segment === 'health' ? 'paciente' : 'cliente';
  return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

export function getClientsLabel(segment?: string, capitalize = false): string {
  const label = segment === 'health' ? 'pacientes' : 'clientes';
  return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}
```

### Arquivo: `src/components/dashboard/DashboardAppointments.tsx`

Alterações:
1. Importar `useVenue` e `getServiceIcon`, `getClientsLabel`
2. Obter `venueSegment` do contexto
3. Substituir `Scissors` por `getServiceIcon(venueSegment)`
4. Substituir "Próximos Clientes" por `Próximos ${getClientsLabel(venueSegment, true)}`

Locais específicos:
- Linha 9: Adicionar import de `Heart`
- Linha 174: `icon={getServiceIcon(venueSegment)}`
- Linha 230: Título dinâmico

### Arquivo: `src/pages/Servicos.tsx`

Alterações:
1. Importar `getServiceIcon` de `@/lib/segment-utils`
2. Importar `Heart` de lucide-react
3. Já tem acesso a `venueSegment` via useVenue
4. Criar variável: `const ServiceIcon = getServiceIcon(venueSegment)`
5. Substituir `<Scissors .../>` por `<ServiceIcon .../>`

Locais:
- Linha 108: Empty state principal
- Linha 152: Empty state tabela

### Arquivo: `src/components/bookings/BeautyBookingSheet.tsx`

Alterações:
1. Importar `useVenue` de `@/contexts/VenueContext`
2. Importar `getServiceIcon` de `@/lib/segment-utils`
3. Importar `Heart` de lucide-react
4. Obter segmento e criar ícone dinâmico
5. Substituir na linha 233

### Arquivo: `src/components/agenda/ServiceBookingWizard.tsx`

Alterações:
1. Importar `getServiceIcon` de `@/lib/segment-utils`
2. Importar `Heart` de lucide-react
3. Já tem acesso a `currentVenue`
4. Obter segmento e criar ícone dinâmico
5. Substituir na linha 450

### Arquivo: `src/components/team/ProfessionalFormDialog.tsx`

Alterações:
1. Importar `useVenue` de `@/contexts/VenueContext`
2. Importar `getServiceIcon`, `getClientsLabel` de `@/lib/segment-utils`
3. Importar `Heart` de lucide-react
4. Obter segmento
5. Substituir ícone na linha 191
6. Ajustar texto na linha 126: `${getClientsLabel(venueSegment)} possam agendar`

### Arquivo: `src/pages/Configuracoes.tsx`

Alterações:
1. Importar `getServiceIcon`, `getClientsLabel` de `@/lib/segment-utils`
2. Importar `Heart` de lucide-react
3. Já tem acesso a `venueSegment`
4. Criar ícone dinâmico
5. Substituir nas linhas 362, 379, 435
6. Ajustar texto na linha 391: `Atende ${getClientsLabel(venueSegment, true)}`

### Arquivo: `src/components/help/HelpSidebar.tsx`

Alterações:
1. Adicionar `Heart` ao import de lucide-react
2. Adicionar `Heart` ao objeto `iconMap`

---

## Resumo de Alterações

| Ação | Qtd Arquivos |
|------|--------------|
| Criar novo arquivo | 1 |
| Modificar arquivos | 7 |
| **Total** | **8** |

---

## Impacto Visual

### Antes (Segmento Health)
- Ícones de tesoura em todo o sistema
- Textos referenciando "clientes"

### Depois (Segmento Health)
- Ícones de coração em contextos de serviço
- Textos referenciando "pacientes"
- Experiência mais alinhada ao contexto médico/clínico

---

## Validação

Após implementação, verificar com conta `testemedico@gmail.com`:
1. Dashboard mostra ícone de coração em "Atendimentos Hoje"
2. Dashboard mostra "Próximos Pacientes" em vez de "Próximos Clientes"
3. Página de Serviços mostra ícone de coração nos empty states
4. BeautyBookingSheet mostra coração na lista de serviços
5. ServiceBookingWizard mostra coração no label de serviços
6. ProfessionalFormDialog mostra coração e texto "pacientes"
7. Configurações > Profissionais mostra coração e "Atende Pacientes"
8. Venues do segmento `beauty` continuam com tesoura e "clientes"

