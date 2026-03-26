

## Plano: Auto-vincular serviços novos a todos os profissionais da venue

### O que será feito

1. **Trigger no banco** — Ao inserir um serviço na tabela `services`, uma function dispara automaticamente e insere uma linha em `professional_services` para cada `venue_member` com `is_bookable = true` daquela venue.

2. **Checkbox no formulário** — No `ServiceFormDialog`, adicionar um campo "Disponibilizar para todos os profissionais" (marcado por padrão). Se desmarcado, a criação do serviço inclui um flag no metadata ou uma coluna auxiliar que a trigger verifica antes de criar os vínculos.

3. **UX do ProfessionalFormDialog** — Já possui lista de serviços com checkboxes. Como agora todos virão marcados por padrão, o profissional só precisa desmarcar o que não faz.

### Implementação

**Migração SQL**
```sql
CREATE OR REPLACE FUNCTION public.auto_assign_service_to_professionals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO professional_services (member_id, service_id)
  SELECT vm.id, NEW.id
  FROM venue_members vm
  WHERE vm.venue_id = NEW.venue_id
    AND vm.is_bookable = true
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_service
AFTER INSERT ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_service_to_professionals();
```
- `ON CONFLICT DO NOTHING` previne duplicatas (a tabela `professional_services` não tem unique constraint em `(member_id, service_id)`, mas a trigger é idempotente).
- `SECURITY DEFINER` + `SET search_path = public` segue o padrão de segurança do projeto.

**Arquivo: `src/components/services/ServiceFormDialog.tsx`**
- Adicionar campo `assign_all_professionals` (boolean, default `true`) ao schema zod.
- Renderizar um checkbox com label "Disponibilizar para todos os profissionais" antes do switch de "Ativo".
- Quando `assign_all_professionals` é `false`, após criar o serviço, deletar os registros auto-criados pela trigger: `supabase.from('professional_services').delete().eq('service_id', newService.id)`.
- Abordagem alternativa (mais limpa): a trigger sempre roda, e se o checkbox está desmarcado, o front faz cleanup pós-insert. Isso evita adicionar colunas no schema.

**Arquivo: `src/hooks/useServices.ts`**
- A mutation `createService` retorna o `data` (com `id`). O cleanup pós-insert será feito no `ServiceFormDialog` usando o id retornado.

**Arquivo: `src/components/team/ProfessionalFormDialog.tsx`**
- Nenhuma alteração necessária — já tem a lista de serviços com checkboxes. Como a trigger preenche automaticamente, ao abrir o dialog o profissional já terá todos os serviços marcados.

### Arquivos alterados
- Nova migração SQL (trigger + function)
- `src/components/services/ServiceFormDialog.tsx` — checkbox + cleanup condicional
- `src/hooks/useServices.ts` — invalidar query `professionals` após criar serviço

### Resultado esperado
- Criar serviço → todos os profissionais bookable já recebem vínculo automático
- Checkbox desmarcado → serviço criado sem vínculos (cleanup pós-trigger)
- Tela de profissional mostra todos os serviços já ligados, bastando desligar o que não se aplica

