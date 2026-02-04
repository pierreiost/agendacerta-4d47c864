-- Adicionar coluna phones como array de texto
ALTER TABLE venues 
ADD COLUMN phones TEXT[] DEFAULT '{}';

-- Migrar dados existentes do campo phone para o array
UPDATE venues 
SET phones = ARRAY[phone] 
WHERE phone IS NOT NULL AND phone != '';