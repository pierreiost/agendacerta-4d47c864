
# Revisao Completa do Sistema AgendaCerta

## Resumo Executivo

Apos analise detalhada do codigo, banco de dados e configuracoes de seguranca, identifiquei **47 itens** divididos em 6 categorias: Seguranca (criticos), Bugs, Performance, Usabilidade, Testes e Documentacao.

---

## 1. SEGURANCA (CRITICO)

### 1.1 RLS - Problemas Identificados pelo Scanner

| Tabela | Problema | Severidade | Acao |
|--------|----------|------------|------|
| `professionals` | PII exposto (email, phone) sem bloqueio anonimo | ERRO | Adicionar policy `auth.uid() IS NOT NULL` |
| `customers` | Base completa pode ser acessada anonimamente | ERRO | Adicionar policy explicita para authenticated |
| `service_orders` | Dados financeiros e fiscais expostos | ERRO | Restringir SELECT a authenticated + venue_member |
| `google_calendar_tokens` | OAuth tokens em texto claro para admins | AVISO | Documentar como risco aceito ou implementar rotacao |
| `login_attempts` | Emails podem ser colhidos | ERRO | Verificar policy superadmin-only |
| `profiles` | Telefones e nomes expostos | ERRO | Adicionar bloqueio anonimo |
| `venues` | CNPJ/CPF e IDs de pagamento expostos | ERRO | Restringir SELECT |

### 1.2 Autenticacao

| Item | Status | Acao |
|------|--------|------|
| Leaked Password Protection | DESABILITADO | Habilitar no dashboard Supabase Auth |
| Rate limiting de login | OK | Implementado via edge function |
| Validacao de senha forte | OK | 8+ chars, maiuscula, numero, especial |
| Confirmacao de senha | OK | Campo implementado com validacao |

### 1.3 Codigo - Vulnerabilidades

| Arquivo | Problema | Acao |
|---------|----------|------|
| `src/components/ui/chart.tsx` | `dangerouslySetInnerHTML` | SEGURO - apenas CSS de config controlada |
| `PublicPageVenue.tsx` | URL validation | OK - `isSafeUrl()` implementado |
| `BookingWidget.tsx` | File upload | OK - validacao MIME + tamanho implementada |

---

## 2. BUGS IDENTIFICADOS

### 2.1 Modulo Financeiro

| Bug | Arquivo | Correcao |
|-----|---------|----------|
| Performance: 18 queries sequenciais para monthlyData | `useFinancialMetrics.ts` | Criar RPC `get_financial_metrics` no servidor |
| Filtro de periodo nao afeta RevenueList | `Financeiro.tsx` / `RevenueList.tsx` | Passar `period` como prop e aplicar filtro |
| RevenueList sempre mostra "este mes" fixo | `RevenueList.tsx` | Receber startDate/endDate via props |

### 2.2 Pagina Publica

| Bug | Arquivo | Correcao |
|-----|---------|----------|
| Link "Visualizar" usa `/p/slug` mas rota e `/v/slug` | `PublicPageConfig.tsx` L254 | Trocar `/p/` por `/v/` |
| Logo URL nao salva no banco | `PublicPageConfig.tsx` | Adicionar `logo_url` ao update |

### 2.3 Tipagem

| Bug | Arquivo | Correcao |
|-----|---------|----------|
| TRANSFER em PaymentMethod | `useExpenses.ts` | O enum ja inclui TRANSFER no DB - remover cast desnecessario |

### 2.4 Ajuda

| Bug | Arquivo | Correcao |
|-----|---------|----------|
| Falta icone Heart no iconMap | `HelpArticle.tsx` | Adicionar Heart ao mapeamento |

---

## 3. PERFORMANCE

### 3.1 Queries N+1

| Local | Problema | Solucao |
|-------|----------|---------|
| `useFinancialMetrics.ts` | Loop de 6 meses com 3 queries cada = 18 queries | Criar RPC unica com CTE para agregar dados |
| `RevenueList.tsx` | 2 queries separadas para bookings e service_orders | Unificar com UNION no servidor |

### 3.2 Recomendacoes

| Item | Acao |
|------|------|
| Supabase Query Limit | Queries retornam max 1000 rows - adicionar paginacao onde necessario |
| React Query staleTime | Aumentar para dados que mudam pouco (ex: venues, services) |

---

## 4. USABILIDADE (UX)

### 4.1 Segmento Health - Terminologia

| Componente | Status |
|------------|--------|
| Dashboard "Proximos Pacientes" | IMPLEMENTADO |
| Sidebar icone Heart | IMPLEMENTADO |
| ProfessionalFormDialog | IMPLEMENTADO |
| Configuracoes "Atende Pacientes" | IMPLEMENTADO |

### 4.2 Melhorias Sugeridas

| Item | Descricao |
|------|-----------|
| Financeiro - Exportacao | Adicionar botao "Exportar Excel" na tab de despesas |
| RevenueList - Filtro por tipo | Permitir filtrar "Apenas Reservas" ou "Apenas OS" |
| Ajuda - Busca mobile | Melhorar visibilidade da busca em telas pequenas |
| Pagina Publica - Preview | Adicionar preview em tempo real no editor |

---

## 5. TESTES

### 5.1 Status Atual

- **Nenhum teste automatizado encontrado**
- Diretorio `src/test` existe mas esta vazio
- Dependencias de teste NAO instaladas (`vitest`, `@testing-library/react`)

### 5.2 Plano de Implementacao

1. Instalar dependencias de teste
2. Configurar `vitest.config.ts`
3. Criar `src/test/setup.ts`
4. Adicionar testes prioritarios:

| Prioridade | Componente | Tipo de Teste |
|------------|------------|---------------|
| ALTA | `usePayments` | Unit test - finalizeBooking |
| ALTA | `CheckoutDialog` | Integration - split payment |
| ALTA | `useFinancialMetrics` | Unit test - calculos |
| MEDIA | `BookingWidget` | E2E - fluxo completo |
| MEDIA | Auth login/signup | E2E - rate limiting |

---

## 6. DOCUMENTACAO E AJUDA

### 6.1 Conteudo Existente

| Secao | Status |
|-------|--------|
| Primeiros Passos | OK - 3 artigos |
| Modulos do Sistema | OK - 10 artigos |
| Integracoes | OK - 2 artigos |
| FAQ | OK - 1 artigo generico |

### 6.2 Melhorias

| Item | Acao |
|------|------|
| Artigo Financeiro | Expandir com exemplos de relatorios |
| Artigo Pagina Publica | Adicionar prints/GIFs do editor |
| FAQ Segmento Health | Criar FAQ especifico para clinicas |
| Artigo Equipe | Documentar fluxo de permissoes |

---

## PRIORIDADE DE IMPLEMENTACAO

### Fase 1 - Seguranca (URGENTE)

1. Habilitar Leaked Password Protection
2. Adicionar policies RLS para bloqueio anonimo em tabelas criticas
3. Revisar policy de `login_attempts`

### Fase 2 - Bugs Criticos

1. Corrigir link `/p/` para `/v/` na pagina publica
2. Salvar `logo_url` no update da pagina publica
3. Adicionar Heart ao iconMap do HelpArticle

### Fase 3 - Performance

1. Criar RPC `get_financial_metrics` para consolidar queries
2. Otimizar RevenueList com query unificada

### Fase 4 - Testes

1. Setup do ambiente de testes
2. Testes unitarios para hooks financeiros
3. Testes E2E para fluxos criticos

### Fase 5 - UX e Documentacao

1. Exportacao Excel no financeiro
2. Filtros adicionais no RevenueList
3. Expandir artigos de ajuda

---

## ARQUIVOS A MODIFICAR

| Arquivo | Alteracoes |
|---------|------------|
| Migrations SQL | Adicionar policies RLS (6+ tabelas) |
| `src/pages/PublicPageConfig.tsx` | Corrigir link + salvar logo_url |
| `src/components/financeiro/RevenueList.tsx` | Receber period via props |
| `src/hooks/useFinancialMetrics.ts` | Refatorar para usar RPC |
| `src/components/help/HelpArticle.tsx` | Adicionar Heart ao iconMap |
| `vitest.config.ts` | Criar configuracao de testes |
| `package.json` | Adicionar devDependencies de teste |

---

## RESUMO QUANTITATIVO

| Categoria | Qtd Itens | Criticidade |
|-----------|-----------|-------------|
| Seguranca RLS | 7 tabelas | CRITICO |
| Seguranca Auth | 1 config | ALTO |
| Bugs | 5 | MEDIO |
| Performance | 2 | MEDIO |
| Testes | 0 existentes | ALTO |
| Documentacao | 4 melhorias | BAIXO |

