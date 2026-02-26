

# Paginacao adaptativa de servicos na pagina publica

## Resumo
Os cards de servicos no Step 1 do widget de agendamento vao se adaptar de duas formas:
- **Ate 7 servicos**: reduz o tamanho dos cards para caber tudo na tela sem scroll
- **8+ servicos**: mostra 4 servicos por "pagina" com setas de navegacao embaixo para avancar/voltar

## Logica de exibicao

| Quantidade | Comportamento |
|---|---|
| 1-4 | Grid 2 colunas, tamanho normal (aspect-[4/3], descricao visivel) |
| 5-6 | Grid 2 colunas, imagem menor (aspect-[3/2]), descricao com line-clamp-1 |
| 7 | Grid 2 colunas + 1 coluna na ultima linha, imagem compacta (aspect-[2/1]), sem descricao |
| 8+ | Grid 2 colunas, tamanho normal, paginacao de 4 em 4 com setas |

## Paginacao (8+ servicos)

- Estado `servicePage` comeca em 0
- Mostra `services.slice(page * 4, page * 4 + 4)` (4 cards por pagina)
- Indicador de pagina: bolinhas (dots) + setas esquerda/direita
- Texto discreto tipo "1/3" ou dots para indicar paginas
- Setas com icones `ChevronLeft` e `ChevronRight` (ja importados)
- Animacao suave de transicao entre paginas nao e necessaria, troca direta

## Detalhes tecnicos

**Arquivo**: `src/components/public-page/ServiceBookingWidget.tsx`

1. Adicionar estado `const [servicePage, setServicePage] = useState(0)`
2. Criar constante `SERVICES_PER_PAGE = 4`
3. Calcular `totalPages = Math.ceil(services.length / SERVICES_PER_PAGE)`
4. Criar funcao `getAdaptiveLayout(count)` que retorna classes CSS baseadas na quantidade total
5. No render do Step 1:
   - Se `services.length >= 8`: renderizar apenas o slice da pagina atual + controles de navegacao (setas + dots) abaixo do grid
   - Se `services.length <= 7`: renderizar todos os servicos com tamanhos adaptados conforme a tabela acima
6. Os controles de paginacao ficam centralizados abaixo do grid: `< o o o >` (seta, dots, seta)
7. Resetar `servicePage` para 0 quando services mudam

**Componente de navegacao** (inline, sem componente separado):
```text
[ card ] [ card ]
[ card ] [ card ]

     <  o o o  >
```

A seta esquerda fica desabilitada na primeira pagina, a direita na ultima. Os dots indicam a pagina ativa com cor primaria.

