

## Mapa Clicavel na Pagina Publica

### Problema Identificado
O campo `google_maps_embed_url` esta armazenando o HTML completo do `<iframe>` (copiado do Google Maps) em vez de apenas a URL. Por isso, a validacao falha e o mapa nao aparece.

### Solucao

**1. Extrair a URL do iframe automaticamente**
Adicionar uma funcao que detecta se o valor salvo e um HTML de iframe e extrai o atributo `src` automaticamente. Isso resolve o problema sem exigir que o usuario cole apenas a URL.

**2. Mapa clicavel que abre o Google Maps**
Envolver o iframe do mapa em um link clicavel. Ao clicar, o usuario sera redirecionado para o Google Maps com o endereco preenchido. O iframe continuara mostrando o mini mapa normalmente, mas com um overlay transparente clicavel por cima.

### Detalhes Tecnicos

**Arquivo: `src/components/public-page/LocationSection.tsx`**

- Criar funcao `extractEmbedUrl(raw)` que:
  - Se o valor contem `<iframe`, extrai o atributo `src` via regex
  - Caso contrario, retorna o valor como esta
- Usar essa funcao antes da validacao `isValidGoogleMapsEmbedUrl`
- Adicionar um overlay clicavel (`<a>` com `position: absolute`) sobre o iframe que redireciona para o Google Maps (usando o endereco ou coordenadas extraidas da URL)
- O overlay tera um icone discreto de "abrir no Maps" no canto

**Arquivo: `src/pages/PublicPageConfig.tsx`** (se necessario)
- Garantir que o campo de input aceita tanto a URL quanto o HTML do iframe, fazendo a extracao no momento de salvar tambem

### Resultado
- O mapa aparecera corretamente na pagina publica mesmo que o usuario cole o iframe completo
- Clicar no mapa abrira o Google Maps em uma nova aba
- Design responsivo mantido

