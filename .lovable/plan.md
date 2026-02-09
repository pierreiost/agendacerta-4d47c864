

## Redesign da Secao de Localizacao

### Mudancas Visuais

1. **Remover o botao "Como chegar"** - eliminar completamente o botao e o link de direcoes da secao
2. **Endereco acima do mapa** - mover o endereco para ficar centralizado entre o titulo "Nossa Localizacao" e o mapa
3. **Mapa retangular e maior** - ocupar toda a largura disponivel (sem grid de 2 colunas), com aspect ratio mais largo (16/9 ou similar)
4. **Botao de tela cheia** - icone pequeno de expandir no canto superior direito do mapa, que ao clicar abre o mapa em um dialog/modal ocupando a tela toda
5. **Clicar no mapa abre o Google Maps** - manter o overlay clicavel que redireciona para o Maps em nova aba

### Detalhes Tecnicos

**Arquivo: `src/components/public-page/LocationSection.tsx`**

- Remover o botao "Como chegar" e o import de `Navigation`
- Remover o layout `grid md:grid-cols-2` e usar layout vertical centralizado
- Endereco renderizado centralizado logo abaixo do titulo
- Mapa com `aspect-video` (16:9) e `w-full` para ocupar toda a largura
- Adicionar import de `Maximize2` do lucide-react para o icone de tela cheia
- Adicionar state `fullscreen` com useState
- Botao de tela cheia no canto superior direito do mapa (posicao absoluta, z-index acima do iframe)
- Ao clicar no icone de tela cheia, abrir um Dialog (do radix) com o mapa ocupando a tela toda (`w-screen h-screen`)
- Manter o overlay clicavel no mapa que abre o Google Maps externo

### Layout Final (de cima para baixo)

```text
+----------------------------------+
|  Nossa Localizacao [icone MapPin]|
|R. Bento Martins, 1509 Pelotas -RS|
|                                  |
| +------------------------------+ |
| |  [mapa embed 16:9]      [⛶] | |
| |                              | |
| |      clique -> Google Maps   | |
| +------------------------------+ |
+----------------------------------+
```

