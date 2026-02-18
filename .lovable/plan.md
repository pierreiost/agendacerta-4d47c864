

# Correcao do Bug de Sincronizacao do Formulario - PublicPageConfig

## Problema
O formulario renderiza imediatamente com valores vazios (defaults) antes dos dados do banco carregarem. Se o usuario clicar "Salvar" nesse momento, os dados existentes sao sobrescritos por valores vazios.

## Causa Raiz
O componente ja possui a variavel `isDataLoaded` (linha 59), mas ela nao e utilizada para:
1. Bloquear o botao "Salvar" enquanto os dados nao carregaram
2. Mostrar um estado de carregamento no lugar do formulario

## Correcoes

### 1. Desabilitar o botao Salvar ate os dados carregarem
Na linha 312, o botao so verifica `isLoading` (indicador de salvamento). Adicionar `!isDataLoaded` como condicao de desabilitacao:
```
disabled={isLoading || !isDataLoaded}
```

### 2. Mostrar loading spinner no conteudo das tabs
Envolver o conteudo do formulario (a area das Tabs, a partir da linha 319) com uma verificacao de `isDataLoaded`. Enquanto os dados nao carregarem, exibir um spinner centralizado. Quando carregarem, renderizar o formulario normalmente.

### 3. Desabilitar o switch da pagina publica ate carregar
O switch `publicPageEnabled` (linha 296) tambem pode ser clicado antes dos dados carregarem, causando inconsistencia. Desabilita-lo com `!isDataLoaded`.

## Arquivo a modificar
- `src/pages/PublicPageConfig.tsx` - 3 alteracoes pontuais (botao salvar, loading guard, switch)

## Detalhes Tecnicos
- Nao e necessario usar `react-hook-form` ou `reset()` pois o componente usa `useState` diretamente
- O `isDataLoaded` ja existe e e setado corretamente no `useEffect` (linha 142)
- A correcao e minima e nao altera a logica de carregamento existente, apenas adiciona guardas visuais

