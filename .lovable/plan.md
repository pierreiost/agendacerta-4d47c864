

## Plano: Evolução completa do SEO do AgendaCerta

### Contexto
O AgendaCerta é uma SPA React. Crawlers de redes sociais (WhatsApp, Facebook) não executam JS, então dependem das meta tags do `index.html` como fallback. O Google renderiza JS mas precisa de um sitemap para descobrir as páginas dinâmicas `/v/{slug}`. Atualmente o sitemap é estático e não inclui venues.

### 1. Edge Function `generate-sitemap`

Criar `supabase/functions/generate-sitemap/index.ts`:
- Consulta `venues` onde `public_page_enabled = true` e `slug IS NOT NULL` e `status IN ('active', 'trialing')`
- Retorna XML com `Content-Type: application/xml`
- Rotas estáticas: `/inicio` (1.0, weekly), `/marketplace` (0.9, daily), `/auth` (0.5, monthly)
- Rotas dinâmicas: `/v/{slug}` (0.8, weekly) para cada venue
- `verify_jwt = false` no config.toml (é público)
- CORS headers incluídos

### 2. Atualizar `public/robots.txt`

Trocar a URL do sitemap para apontar à Edge Function:
```
Sitemap: https://uhfpgqdlsjfmkrsjowih.supabase.co/functions/v1/generate-sitemap
```

### 3. Melhorar meta tags fallback no `index.html`

Adicionar `og:url`, keywords e garantir que todas as meta tags essenciais estejam presentes como fallback para crawlers que não executam JS.

### 4. SEO no Marketplace

Adicionar `SEOHead` na página Marketplace com:
- Título: "Agendamento Online de Quadras e Serviços | AgendaCerta"
- Descrição focada em palavras-chave
- JSON-LD `WebApplication` com termos como "sistema de agendamento", "app de agenda"

### 5. Enriquecer JSON-LD das páginas de venues

No `PublicPageVenue.tsx`, expandir o JSON-LD `LocalBusiness` para incluir:
- `telephone` (do venue.phone)
- `address` (do venue.address/city/state)
- `image` (do venue.logo_url)
- Usar `SportsActivityLocation` quando `segment === 'sports'`, `HealthAndBeautyBusiness` para beauty/health, `LocalBusiness` como fallback

### 6. Deletar `public/sitemap.xml` estático

O sitemap estático será substituído pela Edge Function dinâmica.

### Detalhes Técnicos

```text
Fluxo do Sitemap:
  Crawler → GET /functions/v1/generate-sitemap
          → Edge Function consulta venues públicos
          → Retorna XML com rotas estáticas + /v/{slug} de cada venue

Filtro SQL na Edge Function:
  SELECT slug, name, updated_at FROM venues
  WHERE public_page_enabled = true
    AND slug IS NOT NULL
    AND status IN ('active', 'trialing')
```

### Arquivos afetados
- **Criar**: `supabase/functions/generate-sitemap/index.ts`
- **Editar**: `supabase/config.toml`, `public/robots.txt`, `index.html`, `src/pages/Marketplace.tsx`, `src/pages/public/PublicPageVenue.tsx`
- **Deletar**: `public/sitemap.xml`

