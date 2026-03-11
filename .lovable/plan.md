

# Plano de SEO — Melhorar Descoberta das Páginas Públicas pelo Google

## Situacao Atual

- O **sitemap estático** (`public/sitemap.xml`) tem apenas 4 páginas fixas (inicio, marketplace, auth, privacy)
- A **edge function** `generate-sitemap` já gera um sitemap dinâmico com todos os venues ativos, mas está hospedada num domínio diferente (backend), então o Google Search Console não aceita como sitemap do `agendacertaa.lovable.app`
- As páginas públicas dos venues (`/v/{slug}`) já têm meta tags SEO e JSON-LD via `SEOHead`
- O `robots.txt` aponta para `agendacerta.online/sitemap.xml`

## Problema

As páginas dos venues (ex: `/v/bola-na-rede-pelotas`) não estão no sitemap que o Google conhece. Sem sitemap, o Google depende de descobrir por links internos (marketplace), o que é mais lento.

## Solucao

Criar uma **rota `/sitemap.xml`** que redireciona para a edge function, ou melhor ainda: criar uma **página React que gera o sitemap dinamicamente** no client — mas isso não funciona para crawlers.

A abordagem mais eficaz: **criar uma edge function que serve como proxy** e pode ser chamada diretamente, **e adicionar os venues ao sitemap estático** consultando o banco no momento do build. Como não temos build hooks, a melhor solução prática é:

### 1. Atualizar o sitemap estático com os venues atuais (manual/periódico)
Criar uma **nova edge function `update-sitemap`** que gera o XML completo e pode ser chamada para obter o conteúdo atualizado. Mas como não podemos escrever ficheiros no deploy...

**Solução real:** Adicionar um **link para o sitemap dinâmico no robots.txt do domínio Lovable**, e submeter a URL da edge function diretamente no Google Search Console como sitemap adicional.

### Mudanças Concretas

#### 1. Atualizar `robots.txt` — adicionar o sitemap dinâmico como segundo sitemap
```
Sitemap: https://agendacerta.online/sitemap.xml
Sitemap: https://uhfpgqdlsjfmkrsjowih.supabase.co/functions/v1/generate-sitemap
```
O Google aceita múltiplos sitemaps no robots.txt.

#### 2. Melhorar SEO das páginas públicas — adicionar meta tags faltantes
No `PublicPageVenue.tsx`, melhorar o JSON-LD com mais dados estruturados (telefone, endereço, horários) que já estão disponíveis nas sections do venue.

#### 3. Adicionar `<link rel="alternate">` e meta tags para Marketplace
Garantir que o Marketplace tenha links para todas as páginas dos venues, servindo como "hub de descoberta" para o Google.

#### 4. Submeter sitemap dinâmico no Search Console
Instrução para o utilizador: no Google Search Console, adicionar a URL da edge function como sitemap adicional.

### Resultado Esperado

- Google descobre todas as páginas `/v/{slug}` via sitemap dinâmico
- Páginas de venues têm dados estruturados ricos (LocalBusiness, horários, endereço)
- Marketplace serve como página hub com links internos para todos os venues
- Dupla cobertura: sitemap estático (4 páginas core) + sitemap dinâmico (todos os venues)

