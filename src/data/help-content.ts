// Tipos para o sistema de ajuda
export type VenueSegment = 'sports' | 'beauty' | 'health' | 'custom' | 'all';
export type PlanType = 'basic' | 'max' | 'all';

export interface HelpArticle {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  segments: VenueSegment[];
  planRequired?: PlanType;
  keywords: string[];
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  articles: HelpArticle[];
}

// Categorias e artigos do sistema de ajuda
export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Primeiros Passos',
    icon: 'Rocket',
    articles: [
      {
        id: 'welcome',
        title: 'Bem-vindo ao AgendaCerta',
        description: 'Conheça o sistema e aprenda a navegar pelas principais funcionalidades.',
        icon: 'Hand',
        category: 'getting-started',
        segments: ['all'],
        keywords: ['início', 'começar', 'introdução', 'tutorial', 'primeiro acesso'],
      },
      {
        id: 'segments',
        title: 'Escolhendo seu Segmento',
        description: 'Entenda as diferenças entre Quadras, Salões/Clínicas e Assistência Técnica.',
        icon: 'Layers',
        category: 'getting-started',
        segments: ['all'],
        keywords: ['segmento', 'tipo', 'quadra', 'salão', 'clínica', 'assistência', 'técnica'],
      },
      {
        id: 'plans',
        title: 'Entendendo seu Plano',
        description: 'Compare os planos Basic e Max e descubra qual é o ideal para você.',
        icon: 'CreditCard',
        category: 'getting-started',
        segments: ['all'],
        keywords: ['plano', 'basic', 'max', 'preço', 'funcionalidades', 'upgrade'],
      },
    ],
  },
  {
    id: 'modules',
    title: 'Módulos do Sistema',
    icon: 'LayoutGrid',
    articles: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Acompanhe as métricas mais importantes do seu negócio em tempo real.',
        icon: 'Home',
        category: 'modules',
        segments: ['all'],
        keywords: ['dashboard', 'métricas', 'resumo', 'indicadores', 'kpi'],
      },
      {
        id: 'agenda',
        title: 'Agenda',
        description: 'Gerencie reservas, agendamentos e visualize a ocupação do seu negócio.',
        icon: 'Calendar',
        category: 'modules',
        segments: ['all'],
        keywords: ['agenda', 'calendário', 'reserva', 'agendamento', 'horário'],
      },
      {
        id: 'clientes',
        title: 'Clientes',
        description: 'Cadastre e gerencie sua base de clientes com histórico completo.',
        icon: 'Users',
        category: 'modules',
        segments: ['all'],
        keywords: ['cliente', 'cadastro', 'contato', 'histórico', 'telefone'],
      },
      {
        id: 'espacos',
        title: 'Espaços',
        description: 'Configure suas quadras e espaços com preços e capacidade.',
        icon: 'MapPin',
        category: 'modules',
        segments: ['sports'],
        keywords: ['espaço', 'quadra', 'campo', 'arena', 'preço', 'hora'],
      },
      {
        id: 'servicos',
        title: 'Serviços',
        description: 'Crie seu catálogo de serviços com duração e valores.',
        icon: 'Scissors',
        category: 'modules',
        segments: ['beauty', 'health'],
        keywords: ['serviço', 'procedimento', 'tratamento', 'duração', 'preço'],
      },
      {
        id: 'produtos',
        title: 'Produtos',
        description: 'Gerencie produtos para venda e consumo nos atendimentos.',
        icon: 'Package',
        category: 'modules',
        segments: ['all'],
        keywords: ['produto', 'estoque', 'venda', 'item', 'consumo'],
      },
      {
        id: 'ordens-servico',
        title: 'Ordens de Serviço',
        description: 'Controle o fluxo completo de serviços técnicos e manutenções.',
        icon: 'FileText',
        category: 'modules',
        segments: ['custom'],
        keywords: ['ordem', 'serviço', 'os', 'manutenção', 'técnico', 'reparo'],
      },
      {
        id: 'financeiro',
        title: 'Financeiro',
        description: 'Acompanhe receitas, despesas e o fluxo de caixa do seu negócio.',
        icon: 'DollarSign',
        category: 'modules',
        segments: ['all'],
        keywords: ['financeiro', 'receita', 'despesa', 'caixa', 'faturamento'],
      },
      {
        id: 'relatorios',
        title: 'Relatórios',
        description: 'Gere relatórios detalhados para análise do seu negócio.',
        icon: 'BarChart3',
        category: 'modules',
        segments: ['all'],
        keywords: ['relatório', 'análise', 'estatística', 'exportar', 'excel'],
      },
      {
        id: 'configuracoes',
        title: 'Configurações',
        description: 'Personalize o sistema de acordo com as necessidades do seu negócio.',
        icon: 'Settings',
        category: 'modules',
        segments: ['all'],
        keywords: ['configuração', 'ajuste', 'preferência', 'equipe', 'permissão'],
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrações',
    icon: 'Plug',
    articles: [
      {
        id: 'google-calendar',
        title: 'Google Calendar',
        description: 'Sincronize seus agendamentos com o Google Calendar.',
        icon: 'Calendar',
        category: 'integrations',
        segments: ['all'],
        keywords: ['google', 'calendar', 'sincronização', 'integração'],
      },
      {
        id: 'pagina-publica',
        title: 'Página Pública',
        description: 'Configure sua página de agendamento online para clientes.',
        icon: 'Globe',
        category: 'integrations',
        segments: ['all'],
        planRequired: 'max',
        keywords: ['página', 'pública', 'online', 'agendamento', 'link'],
      },
    ],
  },
  {
    id: 'faq',
    title: 'Perguntas Frequentes',
    icon: 'HelpCircle',
    articles: [
      {
        id: 'faq-geral',
        title: 'Dúvidas Gerais',
        description: 'Respostas para as perguntas mais comuns sobre o sistema.',
        icon: 'MessageCircle',
        category: 'faq',
        segments: ['all'],
        keywords: ['dúvida', 'pergunta', 'ajuda', 'suporte', 'problema'],
      },
    ],
  },
];

// Helper para buscar artigos por ID
export function getArticleById(id: string): HelpArticle | undefined {
  for (const category of helpCategories) {
    const article = category.articles.find(a => a.id === id);
    if (article) return article;
  }
  return undefined;
}

// Helper para buscar categoria por ID
export function getCategoryById(id: string): HelpCategory | undefined {
  return helpCategories.find(c => c.id === id);
}

// Helper para filtrar artigos por segmento
export function filterArticlesBySegment(segment: VenueSegment): HelpArticle[] {
  const articles: HelpArticle[] = [];
  for (const category of helpCategories) {
    for (const article of category.articles) {
      if (article.segments.includes('all') || article.segments.includes(segment)) {
        articles.push(article);
      }
    }
  }
  return articles;
}

// Helper para buscar artigos por termo
export function searchArticles(query: string, segment?: VenueSegment): HelpArticle[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];
  
  const results: HelpArticle[] = [];
  
  for (const category of helpCategories) {
    for (const article of category.articles) {
      // Verificar segmento
      if (segment && !article.segments.includes('all') && !article.segments.includes(segment)) {
        continue;
      }
      
      // Buscar em título, descrição e keywords
      const matchesTitle = article.title.toLowerCase().includes(normalizedQuery);
      const matchesDescription = article.description.toLowerCase().includes(normalizedQuery);
      const matchesKeywords = article.keywords.some(k => k.toLowerCase().includes(normalizedQuery));
      
      if (matchesTitle || matchesDescription || matchesKeywords) {
        results.push(article);
      }
    }
  }
  
  return results;
}

// Labels para segmentos
export const segmentLabels: Record<VenueSegment, string> = {
  sports: 'Quadras & Espaços',
  beauty: 'Salões de Beleza',
  health: 'Clínicas & Saúde',
  custom: 'Assistência Técnica',
  all: 'Todos os Segmentos',
};

// Labels para planos
export const planLabels: Record<PlanType, string> = {
  basic: 'Plano Basic',
  max: 'Plano Max',
  all: 'Todos os Planos',
};
