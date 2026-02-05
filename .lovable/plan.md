

# Plano: Correção de Layouts e Denominações por Segmento

## Problema Identificado

A lógica de `isServiceVenue` está **inconsistente** entre os arquivos:

| Arquivo | Definição Atual | Problema |
|---------|-----------------|----------|
| `AppSidebar.tsx` (L111) | `beauty \|\| health` | Segmento `custom` cai no else → mostra **Espaços** ❌ |
| `Servicos.tsx` (L102) | `!= sports` | Segmento `custom` passa → mostra página de Serviços ❌ |
| `Configuracoes.tsx` (L98) | `!= sports` | Segmento `custom` mostra seção de Profissionais ❌ |

## Comportamento Esperado por Segmento

```text
┌─────────────┬────────────────┬─────────────┬────────────────┬──────────────────┐
│ Segmento    │ Menu Principal │ Dashboard   │ Profissionais  │ Página Serviços  │
├─────────────┼────────────────┼─────────────┼────────────────┼──────────────────┤
│ sports      │ Espaços        │ bookings    │ Oculto         │ Bloqueada        │
│ beauty      │ Serviços       │ appointments│ Visível        │ Acessível        │
│ health      │ Serviços       │ appointments│ Visível        │ Acessível        │
│ custom      │ NENHUM*        │ service_ord │ Oculto         │ Bloqueada        │
└─────────────┴────────────────┴─────────────┴────────────────┴──────────────────┘

* custom: Foco em Ordens de Serviço, não gerencia Espaços nem Serviços manualmente
```
SÓ LEMBRE DE QUE A AGENDA TEM QUE FUNCIONAR EM TODOS, SPORTS TEM QUE TER ESPAÇO CADASTRADO.
SERVIÇOS TEM QUE MOSTRAR NORMALMENTE, E FUNCIONAR COM SERVIÇOS VINCULADO
CUSTOM TEM QUE FUNCIONAR PARA MARCAR HORÁRIO NORMAL (SEM EPAÇO CADASTRADO)
---

## Correções Necessárias

### 1. AppSidebar.tsx - Menu de Navegação

**Problema:** Segmento `custom` mostra "Espaços" quando deveria ocultar ambos (Espaços e Serviços).

**Solução:** Criar lógica separada para cada tipo:

```typescript
// Linha 109-111 - substituir:
const venueSegment = (currentVenue as { segment?: string })?.segment;
const isServiceVenue = venueSegment && (venueSegment === 'beauty' || venueSegment === 'health');

// Por:
const venueSegment = (currentVenue as { segment?: string })?.segment;
const isServiceVenue = venueSegment === 'beauty' || venueSegment === 'health';
const isSportsVenue = venueSegment === 'sports';
const isCustomVenue = venueSegment === 'custom';
```

**Menu CADASTROS (linhas 181-189) - substituir:**

```typescript
items: [
  { title: "Clientes", href: "/clientes", icon: Users, module: "clientes" as Module },
  // Espaços apenas para sports
  ...(isSportsVenue 
    ? [{ title: "Espaços", href: "/espacos", icon: MapPin, module: "espacos" as Module }]
    : []
  ),
  // Serviços apenas para beauty/health
  ...(isServiceVenue 
    ? [{ title: "Serviços", href: "/servicos", icon: venueSegment === 'health' ? Heart : Scissors, module: "servicos" as Module }]
    : []
  ),
  { title: "Produtos", href: "/produtos", icon: Package, module: "produtos" as Module },
],
```

---

### 2. Servicos.tsx - Página de Serviços

**Problema:** Segmento `custom` consegue acessar página de Serviços porque `venueSegment !== 'sports'` inclui custom.

**Solução:** Alterar verificação para ser explícita:

```typescript
// Linha 101-102 - substituir:
const venueSegment = (currentVenue as { segment?: string })?.segment;
const isServiceVenue = venueSegment && venueSegment !== 'sports';

// Por:
const venueSegment = (currentVenue as { segment?: string })?.segment;
const isServiceVenue = venueSegment === 'beauty' || venueSegment === 'health';
```

**Atualizar mensagem de bloqueio (linhas 112-117):**

```typescript
<p className="text-muted-foreground max-w-md">
  A gestão de serviços está disponível apenas para estabelecimentos do tipo
  Salão de Beleza ou Clínica de Saúde.
  {venueSegment === 'sports' && ' Seu estabelecimento está configurado como Espaço Esportivo.'}
  {venueSegment === 'custom' && ' Para Assistência Técnica, utilize as Ordens de Serviço.'}
</p>
```

---

### 3. Configuracoes.tsx - Seção Profissionais

**Problema:** Seção "Profissionais que Atendem" aparece para `custom` quando não deveria.

**Solução:** Alterar verificação para ser explícita:

```typescript
// Linha 97-98 - substituir:
const venueSegment = (currentVenue as { segment?: string })?.segment;
const isServiceVenue = venueSegment && venueSegment !== 'sports';

// Por:
const venueSegment = (currentVenue as { segment?: string })?.segment;
const isServiceVenue = venueSegment === 'beauty' || venueSegment === 'health';
```

---

### 4. Espacos.tsx - Proteção de Acesso

**Problema:** Página de Espaços não tem proteção - qualquer segmento pode acessar via URL direta.

**Solução:** Adicionar verificação no início do componente:

```typescript
// Após linha 41, adicionar:
const venueSegment = (currentVenue as { segment?: string })?.segment;

// Se não for sports, bloquear acesso
if (venueSegment && venueSegment !== 'sports') {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <MapPin className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Funcionalidade não disponível</h2>
        <p className="text-muted-foreground max-w-md">
          A gestão de espaços está disponível apenas para Espaços Esportivos.
          {venueSegment === 'beauty' || venueSegment === 'health' 
            ? ' Para seu tipo de negócio, utilize a página de Serviços.' 
            : ' Para Assistência Técnica, utilize as Ordens de Serviço.'}
        </p>
      </div>
    </AppLayout>
  );
}
```

---

### 5. Utilitário Centralizado (Opcional mas Recomendado)

Adicionar funções helper em `src/lib/segment-utils.ts`:

```typescript
/**
 * Returns true if the venue segment is service-based (beauty or health)
 */
export function isServiceSegment(segment?: string | null): boolean {
  return segment === 'beauty' || segment === 'health';
}

/**
 * Returns true if the venue segment is space-based (sports)
 */
export function isSportsSegment(segment?: string | null): boolean {
  return segment === 'sports';
}

/**
 * Returns true if the venue segment is custom (assistência técnica)
 */
export function isCustomSegment(segment?: string | null): boolean {
  return segment === 'custom';
}
```

---

## Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/segment-utils.ts` | Adicionar 3 funções helper |
| `src/components/layout/AppSidebar.tsx` | Refatorar lógica de menu CADASTROS |
| `src/pages/Servicos.tsx` | Corrigir verificação isServiceVenue + mensagem |
| `src/pages/Configuracoes.tsx` | Corrigir verificação isServiceVenue |
| `src/pages/Espacos.tsx` | Adicionar proteção de acesso por segmento |

---

## Validação Pós-Implementação

| Segmento | Verificar |
|----------|-----------|
| **sports** | Menu mostra "Espaços", página Serviços bloqueada, sem Profissionais em Config |
| **beauty** | Menu mostra "Serviços", página Espaços bloqueada, Profissionais visível |
| **health** | Igual beauty + ícone Heart e "Pacientes" |
| **custom** | Menu NÃO mostra Espaços NEM Serviços, ambas páginas bloqueadas, sem Profissionais |

