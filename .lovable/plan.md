

# Marketplace MVP - AgendaCerta

## Resumo
Criar uma vitrine publica onde clientes finais buscam profissionais por nicho e cidade, com nichos organizados por segmento do negocio.

---

## 1. Banco de Dados

### Migracao 1 - Tabela `niches` com coluna `segment` + Seed amplo

Tabela `niches`:
- `id` (uuid, PK)
- `name` (text, NOT NULL)
- `slug` (text, UNIQUE)
- `icon_url` (text, nullable)
- `segment` (venue_segment, NOT NULL) -- vincula ao segmento

RLS: SELECT publico (anon + authenticated). Sem INSERT/UPDATE/DELETE para usuarios comuns.

**Seed por segmento:**

**beauty** (Saloes e Barbearias):
Barbeiro, Cabeleireiro(a), Manicure, Pedicure, Maquiador(a), Design de Sobrancelhas, Esteticista, Depilador(a), Extensionista de Cilios, Colorista, Trancista, Nail Designer, Micropigmentador(a), Visagista, Penteadista

**health** (Clinicas e Saude):
Nutricionista, Psicologo(a), Fisioterapeuta, Dentista, Fonoaudiologo(a), Terapeuta Ocupacional, Acupunturista, Quiropraxista, Podologo(a), Massagista, Personal Trainer, Pilates/Yoga, Dermatologista, Medico(a), Enfermeiro(a), Osteopata, Naturopata

**sports** (Quadras e Espacos):
Quadra de Beach Tennis, Quadra de Futevolei, Quadra Society, Quadra de Tenis, Quadra de Padel, Quadra de Volei, Quadra de Basquete, Campo de Futebol, Piscina, Espaco Fitness, Salao de Festas, Espaco de Eventos

**custom** (Assistencia Tecnica e Servicos Gerais):
Encanador, Eletricista, Tecnico HVAC, Tecnico de Informatica, Tecnico de Celular, Tecnico de Eletrodomesticos, Veterinario(a), Passeador de Caes, Pet Sitter, Faxina/Diarista, Jardineiro(a), Pintor(a), Marceneiro(a), Serralheiro(a), Vidraceiro, Dedetizador, Fotografo(a), Tatuador(a)

### Migracao 2 - Novas colunas em `venues`

- `niche_id` (uuid, FK para niches, nullable)
- `city` (text, nullable)
- `state` (text, nullable, default 'RS')
- `is_marketplace_visible` (boolean, default false)

### Migracao 3 - RPCs publicas

**`get_marketplace_venues(p_niche_id uuid, p_city text)`**
- SECURITY DEFINER
- Retorna: id, name, slug, logo_url, city, state, niche_name, primary_color, segment
- Filtros: `is_marketplace_visible = true`, `public_page_enabled = true`, status in ('active','trialing')
- Filtro opcional por niche_id e city (ILIKE)

**`get_marketplace_filters()`**
- Retorna nichos e cidades distintas de venues visiveis
- Inclui a coluna `segment` nos nichos para agrupamento visual

---

## 2. Frontend - Pagina do Marketplace

### Novo: `src/pages/Marketplace.tsx`
- Hero com titulo "Encontre o profissional certo"
- Dropdown de Nicho (agrupado por segmento para melhor UX)
- Input/Dropdown de Cidade (autocomplete das cidades disponiveis)
- Grid de cards responsivos: logo, nome, badge nicho, cidade/UF, botao "Agendar" que redireciona para `/v/{slug}`
- Estado vazio quando sem resultados

### Novo: `src/hooks/useMarketplace.ts`
- `useMarketplaceVenues(nicheId, city)` - chama RPC
- `useMarketplaceFilters()` - carrega nichos e cidades

### Rota em `src/App.tsx`
- Adicionar `/marketplace` como rota publica (junto com `/inicio`, `/v/:slug`)

---

## 3. Configuracoes do Profissional

### Alterar: `src/pages/PublicPageConfig.tsx`
Adicionar novo card "Marketplace" com:
- Switch "Aparecer no Marketplace" (`is_marketplace_visible`)
- Select "Nicho Principal" (carregando da tabela `niches` **filtrado pelo segmento do venue**)
- Inputs "Cidade" e "Estado (UF)"
- Atualizar `handleSave` para salvar os novos campos

---

## 4. Arquivos a criar/modificar

| Arquivo | Acao |
|---|---|
| Migracao SQL 1 | Criar tabela `niches` com coluna `segment` + seed de 60+ profissoes |
| Migracao SQL 2 | Alterar `venues` (niche_id, city, state, is_marketplace_visible) |
| Migracao SQL 3 | RPCs get_marketplace_venues e get_marketplace_filters |
| `src/pages/Marketplace.tsx` | Criar - pagina completa |
| `src/hooks/useMarketplace.ts` | Criar - hook de dados |
| `src/App.tsx` | Adicionar rota /marketplace |
| `src/pages/PublicPageConfig.tsx` | Adicionar controles marketplace com nichos filtrados por segmento |

## 5. Seguranca
- Tabela `niches`: leitura publica, sem escrita por usuarios
- RPCs SECURITY DEFINER retornando apenas dados publicos
- Venues so aparecem se `is_marketplace_visible = true` E `public_page_enabled = true`

