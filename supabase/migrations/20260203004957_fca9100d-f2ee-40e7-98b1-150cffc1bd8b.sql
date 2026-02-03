-- Adicionar coluna user_id para permitir conexões por membro
ALTER TABLE google_calendar_tokens 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Criar índice único para venue_id + user_id (permitindo NULL para conexões de venue-wide legadas)
DROP INDEX IF EXISTS google_calendar_tokens_venue_user_idx;
CREATE UNIQUE INDEX google_calendar_tokens_venue_user_idx 
ON google_calendar_tokens(venue_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Atualizar RLS para permitir membros verem/editarem suas próprias conexões
DROP POLICY IF EXISTS "Venue admins can view tokens" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Venue admins can insert tokens" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Venue admins can update tokens" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Venue admins can delete tokens" ON google_calendar_tokens;

-- Nova política: membros podem ver suas próprias conexões OU admins veem todas
CREATE POLICY "Members can view own tokens or admins view all"
ON google_calendar_tokens
FOR SELECT
USING (
  (user_id = auth.uid()) OR
  is_venue_admin(auth.uid(), venue_id)
);

-- Membros podem inserir suas próprias conexões
CREATE POLICY "Members can insert own tokens"
ON google_calendar_tokens
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  is_venue_member(auth.uid(), venue_id)
);

-- Membros podem atualizar suas próprias conexões
CREATE POLICY "Members can update own tokens"
ON google_calendar_tokens
FOR UPDATE
USING (
  user_id = auth.uid() AND
  is_venue_member(auth.uid(), venue_id)
);

-- Membros podem deletar suas próprias conexões OU admins deletam qualquer
CREATE POLICY "Members can delete own tokens or admins delete all"
ON google_calendar_tokens
FOR DELETE
USING (
  (user_id = auth.uid()) OR
  is_venue_admin(auth.uid(), venue_id)
);