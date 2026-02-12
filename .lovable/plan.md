
## Correcao: Dashboard por Segmento + Ativacao da Pagina Publica

### Problema 1 - Dashboard nao respeita o segmento

**Causa raiz:** O onboarding cria a venue via RPC `create_venue_with_admin` SEM o campo `segment`. A venue e criada com o valor padrao `segment = 'sports'` e o trigger `set_dashboard_mode_trigger` (que so dispara no INSERT) define `dashboard_mode = 'bookings'`. Em seguida, o `Onboarding.tsx` faz um UPDATE separado para setar o `segment`, mas o trigger NAO dispara no UPDATE -- apenas no INSERT.

**Solucao:** Duas acoes complementares:

1. **Alterar o trigger** para disparar tambem em UPDATE (quando o segment muda):
```text
DROP TRIGGER set_dashboard_mode_trigger ON venues;
CREATE TRIGGER set_dashboard_mode_trigger
  BEFORE INSERT OR UPDATE OF segment ON venues
  FOR EACH ROW
  EXECUTE FUNCTION set_default_dashboard_mode();
```

2. **Incluir o segment no RPC** `create_venue_with_admin` para que o INSERT ja tenha o segmento correto e o trigger funcione desde o primeiro momento. Alternativamente, passar o segment junto no UPDATE do onboarding e confiar no trigger corrigido.

A abordagem mais segura e a combinacao: corrigir o trigger para INSERT OR UPDATE e tambem passar o segment junto no UPDATE (que ja faz). Assim, ao atualizar o segment, o trigger automaticamente ajusta o dashboard_mode.

3. **Corrigir os venues existentes** que ja foram criados com dashboard errado via query de atualizacao.

---

### Problema 2 - Pagina publica nao ativa

**Causa raiz:** A coluna `public_page_enabled` na tabela `venues` tem default `false`. A RPC `get_public_venue_by_slug` verifica `WHERE v.public_page_enabled = TRUE` antes de retornar dados. Nenhum codigo no frontend (nem na configuracao da pagina publica, nem nas configuracoes da venue) seta esse campo para `true`.

**Solucao:**

1. **Ativacao automatica no `PublicPageConfig.tsx`:** Quando o usuario salva as configuracoes da pagina publica, incluir `public_page_enabled: true` no UPDATE, desde que a venue tenha `plan_type = 'max'` e um `slug` definido.

2. **Toggle visivel na UI:** Adicionar um Switch "Pagina ativa" no topo da pagina de configuracoes publicas, para que o usuario possa desativar/reativar manualmente.

---

### Resumo dos Arquivos

| Arquivo | Acao |
|---|---|
| Migration SQL | Alterar trigger para INSERT OR UPDATE OF segment + corrigir venues existentes |
| `src/pages/PublicPageConfig.tsx` | Incluir `public_page_enabled: true` no handleSave + adicionar toggle de ativacao |

### Observacoes

- A correcao do trigger e retrocompativel: venues que ja tem `dashboard_mode` definido manualmente nao serao afetados (a funcao so altera quando o segment muda E o dashboard_mode nao foi alterado manualmente)
- A ativacao da pagina publica respeita o plano: so permite ativar se `plan_type = 'max'`
- Venues existentes com segmento errado serao corrigidos pela migration
