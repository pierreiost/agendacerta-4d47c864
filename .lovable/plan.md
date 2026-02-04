
# Plano: Central de Ajuda/Suporte do AgendaCerta

## Visão Geral

Criar uma seção de ajuda/suporte completa e estruturada que explique como o sistema funciona para todos os clientes, considerando as diferenças entre segmentos (Quadras, Salões/Clínicas, Assistência Técnica) e planos (Basic e Max).

---

## Estrutura do Guia de Ajuda

### 1. Nova Página: `/ajuda`
Uma página dedicada acessível a todos os usuários autenticados, organizada em seções navegáveis.

### 2. Organização do Conteúdo

```text
Central de Ajuda
├── Primeiros Passos
│   ├── Bem-vindo ao AgendaCerta
│   ├── Escolhendo seu segmento
│   └── Entendendo seu plano (Basic vs Max)
│
├── Módulos do Sistema (por segmento)
│   ├── Dashboard
│   ├── Agenda
│   ├── Clientes
│   ├── Espaços / Serviços (condicional)
│   ├── Produtos
│   ├── Ordens de Serviço
│   ├── Financeiro
│   ├── Relatórios
│   └── Configurações
│
├── Integrações
│   ├── Google Calendar
│   └── Página Pública (Plano Max)
│
└── FAQ / Perguntas Frequentes
```

---

## Conteúdo por Segmento

### Quadras & Espaços (sports)
| Módulo | Descrição |
|--------|-----------|
| Dashboard | Foco em ocupação e reservas futuras |
| Agenda | Visualização por espaço/quadra, reservas por hora |
| Espaços | Cadastro de quadras com preço/hora e capacidade |
| Produtos | Bebidas, lanches e itens de consumo |
| Checkout | Valor do espaço + produtos consumidos |

### Salões & Clínicas (beauty/health)
| Módulo | Descrição |
|--------|-----------|
| Dashboard | Foco em ticket médio e performance de profissionais |
| Agenda | Visualização por profissional, múltiplos serviços |
| Serviços | Catálogo com duração e preço |
| Produtos | Itens de venda no checkout |
| Checkout | Serviços agendados + produtos consumidos |
| Equipe | Configuração de profissionais que atendem |

### Assistência Técnica (custom)
| Módulo | Descrição |
|--------|-----------|
| Dashboard | Foco em OS abertas, faturamento peças vs mão de obra |
| Agenda | Agendamento de visitas técnicas |
| Ordens de Serviço | Fluxo completo: aberta > finalizada > faturada |
| Checkout | Vinculação com OS para faturamento |

---

## Diferenças entre Planos

### Plano Basic (R$ 59,90/mês)
- Todos os módulos operacionais
- Limite: 1 Admin + 3 Colaboradores
- Suporte via WhatsApp
- **Sem** Página Pública

### Plano Max (R$ 89,90/mês)
- Tudo do Basic
- Limite: 1 Admin + 10 Colaboradores
- **Página Pública** personalizada
- Identidade visual customizada

---

## Arquitetura Técnica

### Arquivos a Criar

```text
src/
├── pages/
│   └── Ajuda.tsx                    # Página principal de ajuda
├── components/
│   └── help/
│       ├── HelpSidebar.tsx          # Navegação lateral
│       ├── HelpArticle.tsx          # Componente de artigo
│       ├── HelpSearch.tsx           # Busca de artigos
│       ├── SegmentFilter.tsx        # Filtro por segmento
│       └── articles/
│           ├── GettingStarted.tsx   # Primeiros passos
│           ├── DashboardHelp.tsx    # Ajuda do Dashboard
│           ├── AgendaHelp.tsx       # Ajuda da Agenda
│           ├── ClientesHelp.tsx     # Ajuda de Clientes
│           ├── EspacosHelp.tsx      # Ajuda de Espaços
│           ├── ServicosHelp.tsx     # Ajuda de Serviços
│           ├── ProdutosHelp.tsx     # Ajuda de Produtos
│           ├── OSHelp.tsx           # Ajuda de Ordens de Serviço
│           ├── FinanceiroHelp.tsx   # Ajuda do Financeiro
│           ├── RelatoriosHelp.tsx   # Ajuda de Relatórios
│           ├── ConfiguracoesHelp.tsx# Ajuda de Configurações
│           ├── IntegracaoHelp.tsx   # Ajuda de Integrações
│           ├── PaginaPublicaHelp.tsx# Ajuda da Página Pública
│           └── PlanosHelp.tsx       # Comparativo de planos
└── data/
    └── help-content.ts              # Dados estruturados dos artigos
```

### Rotas
Adicionar rota `/ajuda` no `App.tsx` acessível a todos os usuários autenticados.

### Menu
Adicionar item "Ajuda" no sidebar com ícone `HelpCircle`.

---

## Features da Página de Ajuda

### 1. Busca Inteligente
- Campo de pesquisa com resultados em tempo real
- Busca por palavras-chave nos títulos e conteúdo

### 2. Filtro por Segmento
- Exibir automaticamente conteúdo relevante ao segmento do usuário
- Opção de ver conteúdo de outros segmentos

### 3. Indicadores de Plano
- Badges para funcionalidades exclusivas do plano Max
- CTAs para upgrade quando relevante

### 4. Navegação Contextual
- Links "Como isso funciona" dentro de cada módulo
- Botão de ajuda (?) em componentes complexos

### 5. Conteúdo Rico
- Capturas de tela ilustrativas
- Vídeos tutoriais (opcional, para futuro)
- Passo a passo com imagens

---

## Exemplo de Artigo: Agenda (por segmento)

### Para Quadras (sports):
> **Agenda de Espaços**
> 
> Visualize a ocupação das suas quadras em tempo real. Clique em um horário vazio para criar uma reserva. Os valores são calculados automaticamente com base no preço/hora do espaço.
> 
> **Funcionalidades:**
> - Visualização por dia, semana ou mês
> - Filtro por espaço
> - Reservas recorrentes

### Para Salões (beauty/health):
> **Agenda de Atendimentos**
> 
> Gerencie os atendimentos por profissional. Cada agendamento pode incluir múltiplos serviços do mesmo cliente.
> 
> **Funcionalidades:**
> - Slots de 30 minutos
> - Seleção de profissional
> - Múltiplos serviços por agendamento

### Para Assistência Técnica (custom):
> **Agenda de Visitas Técnicas**
> 
> Agende visitas técnicas e vincule-as a Ordens de Serviço. O agendamento reserva o tempo do técnico, enquanto o faturamento é feito pela OS.
> 
> **Funcionalidades:**
> - Vinculação com OS
> - Controle de disponibilidade
> - Histórico de visitas

---

## Entregas

### Fase 1: Estrutura Base
1. Criar página `/ajuda` com layout responsivo
2. Implementar navegação lateral com seções
3. Criar componentes reutilizáveis de artigo

### Fase 2: Conteúdo por Módulo
4. Escrever artigos para cada módulo
5. Implementar conteúdo condicional por segmento
6. Adicionar indicadores de plano (Basic/Max)

### Fase 3: Integrações
7. Adicionar item no menu lateral
8. Implementar busca de artigos
9. Adicionar links de ajuda contextual nos módulos

---

## Considerações

- O conteúdo será estático inicialmente (hardcoded), mas estruturado para fácil manutenção
- Preparado para futura migração para CMS ou banco de dados
- Acessível em todos os dispositivos (mobile-first)
- Segue o design system existente do AgendaCerta
