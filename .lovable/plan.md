# Horario de Funcionamento Dinamico

## Visao Geral

Criar uma tabela `venue_operating_hours` no banco de dados para armazenar os horarios de funcionamento de cada venue, com defaults inteligentes por segmento. Esses horarios serao usados na agenda interna, na pagina publica e na disponibilidade de profissionais.

---

## 1. Banco de Dados (Migration)

### Tabela `venue_operating_hours`

```text
+-------------------+----------+------------+------------+---------+
| venue_id (uuid)   | day_of_week (int 0-6) | open_time  | close_time | is_open |
+-------------------+----------+------------+------------+---------+
```

- `id` uuid PK
- `venue_id` uuid FK -> venues
- `day_of_week` integer (0=Domingo, 1=Segunda ... 6=Sabado)
- `open_time` time (ex: '08:00')
- `close_time` time (ex: '18:00')
- `is_open` boolean default true
- UNIQUE(venue_id, day_of_week)
- RLS: venue members podem ler; admins/managers podem editar

### Trigger `after insert` na tabela `venues`

- Insere 7 linhas automaticamente ao criar uma venue
- Se `segment = 'sports'`: open_time='14:00', close_time='23:00', domingo is_open=true
- Outros segmentos: open_time='07:00', close_time='19:00', domingo is_open=false

### Seed para venues existentes

- INSERT ... ON CONFLICT DO NOTHING para todas as venues que ainda nao tem registros na tabela

---

## 2. RPC `get_professional_availability_public`

Atualmente a funcao usa valores fixos `v_start_hour := 8` e `v_end_hour := 20`.

Mudanca: fazer um SELECT na `venue_operating_hours` filtrando pelo `day_of_week` da data solicitada.

- Se `is_open = false`, retorna 0 slots (RETURN vazio)
- Se `is_open = true`, usa `open_time` e `close_time` como limites de geracao de slots

---

## 3. Frontend - Configuracoes (VenueSettingsTab.tsx)

Adicionar uma nova secao **"Horario de Funcionamento"** no card da aba Unidade, abaixo dos dados de contato.

Interface:

- Lista de Domingo a Sabado
- Cada dia: Switch (Aberto/Fechado) + dois inputs tipo `time` (Abertura e Fechamento)
- Botao "Copiar Segunda para todos os dias uteis" (convenience)
- Botao "Salvar Horarios"
- Dados carregados via query na `venue_operating_hours`
- Salvamento via upsert (ON CONFLICT venue_id, day_of_week DO UPDATE)

---

## 4. Frontend - Pagina Publica (HoursSection.tsx)

Atualmente le dados estaticos do JSON `public_page_sections.hours.schedule`.

Mudanca: o componente passa a buscar dados reais de `venue_operating_hours` via query publica (RPC ou query com RLS permissiva para anon no contexto publico).

Alternativa mais simples: manter o HoursSection lendo do JSON, mas ao salvar os horarios em VenueSettingsTab, tambem atualizar o campo `public_page_sections.hours.schedule` na tabela venues. Isso evita criar RLS especial para acesso anonimo e mantem o fluxo atual da pagina publica intacto.

**Decisao**: Usar a alternativa simples (sync para JSON) pois a pagina publica ja depende desse JSON e nao requer acesso anonimo a nova tabela.  
  
garantir que essa operação seja **Atômica** (ou seja, se falhar um, não salva nenhum) ou que o `useMutation` trate os dois updates juntos.

---

## 5. Frontend - Agenda (DayView e WeekViewNew)

Atualmente ambos usam `HOURS = Array.from({ length: 15 }, (_, i) => i + 8)` (fixo 08:00-22:00).

Mudanca:

- Criar um hook `useOperatingHours(venueId)` que retorna os horarios da venue
- Calcular `minHour` (menor open_time de todos os dias) e `maxHour` (maior close_time)
- Passar esses valores para DayView e WeekViewNew para gerar a grade dinamicamente
- Dias marcados como fechados podem mostrar um overlay "Fechado" na agenda

---

## Resumo de Arquivos


| Arquivo                                        | Acao                                       |
| ---------------------------------------------- | ------------------------------------------ |
| Migration SQL                                  | Criar tabela, trigger, seed, atualizar RPC |
| `src/hooks/useOperatingHours.ts`               | Criar (hook de leitura/escrita)            |
| `src/components/settings/VenueSettingsTab.tsx` | Editar (adicionar secao de horarios)       |
| `src/components/agenda/DayView.tsx`            | Editar (HOURS dinamico)                    |
| `src/components/agenda/WeekViewNew.tsx`        | Editar (HOURS dinamico)                    |
| `src/components/public-page/HoursSection.tsx`  | Sem mudanca (continua lendo do JSON)       |


---

## Detalhes Tecnicos

### Hook `useOperatingHours`

- `useQuery` para buscar os 7 registros da venue
- `useMutation` para upsert (salvar alteracoes)
- Ao salvar, tambem faz update no `venues.public_page_sections.hours.schedule` para manter sincronizado com a pagina publica
- Mapeamento: day_of_week 0=sunday, 1=monday ... 6=saturday

### RPC atualizada (pseudocodigo)

```text
SELECT open_time, close_time, is_open
FROM venue_operating_hours
WHERE venue_id = p_venue_id
  AND day_of_week = EXTRACT(DOW FROM p_date)

IF NOT is_open THEN RETURN; END IF;

v_day_start := p_date + open_time AT TIME ZONE 'America/Sao_Paulo'
v_day_end   := p_date + close_time AT TIME ZONE 'America/Sao_Paulo'
```

### Agenda dinamica

- O hook retorna `{ hours: OperatingHour[], minHour: number, maxHour: number }`
- DayView e WeekViewNew recebem `startHour` e `endHour` como props em vez de usar constantes fixas