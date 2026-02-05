import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getArticleById, segmentLabels, type VenueSegment } from "@/data/help-content";
import {
  Home,
  Calendar,
  Users,
  MapPin,
  Scissors,
  Package,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  Globe,
  Hand,
  Layers,
  CreditCard,
  MessageCircle,
  HelpCircle,
  Plug,
  Heart,
  type LucideIcon,
} from "lucide-react";

// Mapeamento de ícones
const iconMap: Record<string, LucideIcon> = {
  Home,
  Calendar,
  Users,
  MapPin,
  Scissors,
  Package,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  Globe,
  Hand,
  Layers,
  CreditCard,
  MessageCircle,
  Plug,
  HelpCircle,
  Heart,
};

interface HelpArticleProps {
  articleId: string;
  segment?: VenueSegment;
  planType?: 'basic' | 'max';
}

export function HelpArticle({ articleId, segment, planType }: HelpArticleProps) {
  const article = getArticleById(articleId);

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <HelpCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Selecione um artigo</h2>
        <p className="text-muted-foreground">
          Escolha um tópico no menu lateral para visualizar o conteúdo.
        </p>
      </div>
    );
  }

  const Icon = iconMap[article.icon] || HelpCircle;
  const isMaxOnly = article.planRequired === 'max';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{article.title}</h1>
            {isMaxOnly && (
              <Badge className="bg-brand text-brand-foreground">
                Plano Max
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{article.description}</p>
        </div>
      </div>

      {/* Conteúdo do artigo baseado no ID */}
      <ArticleContent articleId={articleId} segment={segment} planType={planType} />
    </div>
  );
}

// Componente que renderiza o conteúdo específico de cada artigo
function ArticleContent({ articleId, segment, planType }: { articleId: string; segment?: VenueSegment; planType?: 'basic' | 'max' }) {
  switch (articleId) {
    case 'welcome':
      return <WelcomeContent />;
    case 'segments':
      return <SegmentsContent />;
    case 'plans':
      return <PlansContent />;
    case 'dashboard':
      return <DashboardContent segment={segment} />;
    case 'agenda':
      return <AgendaContent segment={segment} />;
    case 'clientes':
      return <ClientesContent />;
    case 'espacos':
      return <EspacosContent />;
    case 'servicos':
      return <ServicosContent />;
    case 'produtos':
      return <ProdutosContent />;
    case 'ordens-servico':
      return <OrdensServicoContent />;
    case 'financeiro':
      return <FinanceiroContent />;
    case 'relatorios':
      return <RelatoriosContent />;
    case 'configuracoes':
      return <ConfiguracoesContent />;
    case 'google-calendar':
      return <GoogleCalendarContent />;
    case 'pagina-publica':
      return <PaginaPublicaContent planType={planType} />;
    case 'faq-geral':
      return <FaqGeralContent />;
    default:
      return <DefaultContent />;
  }
}

// Conteúdos específicos dos artigos
function WelcomeContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao AgendaCerta! 🎉</CardTitle>
          <CardDescription>
            Seu sistema completo de gestão de agendamentos e serviços
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            O AgendaCerta foi desenvolvido para simplificar a gestão do seu negócio, 
            seja você dono de uma quadra esportiva, salão de beleza, clínica ou 
            assistência técnica.
          </p>
          
          <h3 className="font-semibold mt-4">O que você pode fazer:</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Gerenciar agendamentos e reservas</li>
            <li>Cadastrar e acompanhar clientes</li>
            <li>Controlar produtos e serviços</li>
            <li>Acompanhar o financeiro do seu negócio</li>
            <li>Gerar relatórios detalhados</li>
            <li>Configurar sua equipe com permissões personalizadas</li>
          </ul>

          <h3 className="font-semibold mt-4">Navegação</h3>
          <p className="text-muted-foreground">
            Use o menu lateral para navegar entre os módulos do sistema. 
            Cada módulo foi pensado para atender às necessidades específicas do seu segmento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SegmentsContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quadras & Espaços</CardTitle>
          <CardDescription>Para arenas, campos e locais de aluguel por hora</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>Ideal para:</p>
          <ul className="list-disc list-inside text-muted-foreground">
            <li>Quadras de futebol, beach tennis, vôlei</li>
            <li>Espaços para eventos</li>
            <li>Salas de reunião</li>
          </ul>
          <p className="mt-3">
            <strong>Foco:</strong> Ocupação de espaços, reservas por hora, controle de produtos consumidos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salões & Clínicas</CardTitle>
          <CardDescription>Para serviços de beleza e saúde</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>Ideal para:</p>
          <ul className="list-disc list-inside text-muted-foreground">
            <li>Salões de beleza e barbearias</li>
            <li>Clínicas de estética</li>
            <li>Consultórios e spas</li>
          </ul>
          <p className="mt-3">
            <strong>Foco:</strong> Agendamento por profissional, catálogo de serviços, múltiplos serviços por atendimento.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assistência Técnica</CardTitle>
          <CardDescription>Para serviços técnicos e manutenções</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>Ideal para:</p>
          <ul className="list-disc list-inside text-muted-foreground">
            <li>Manutenção de ar condicionado (HVAC)</li>
            <li>Assistência técnica de eletrônicos</li>
            <li>Serviços de reparo em geral</li>
          </ul>
          <p className="mt-3">
            <strong>Foco:</strong> Ordens de Serviço, controle de peças vs mão de obra, fluxo de trabalho completo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PlansContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plano Basic</CardTitle>
          <CardDescription>R$ 59,90/mês</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Todos os módulos operacionais
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Dashboard personalizado por segmento
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              1 Administrador + 3 Colaboradores
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Suporte via WhatsApp
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <span className="text-red-500">✗</span>
              Página Pública de agendamento
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-brand">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plano Max</CardTitle>
              <CardDescription>R$ 89,90/mês</CardDescription>
            </div>
            <Badge className="bg-brand text-brand-foreground">Recomendado</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Tudo do plano Basic
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              1 Administrador + 10 Colaboradores
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <strong>Página Pública personalizada</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Identidade visual customizada
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Link exclusivo para agendamento online
            </li>
          </ul>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        💡 Plano anual tem 20% de desconto!
      </p>
    </div>
  );
}

function DashboardContent({ segment }: { segment?: VenueSegment }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            O Dashboard é sua central de controle, mostrando as métricas mais 
            importantes do seu negócio em tempo real.
          </p>

          {(!segment || segment === 'sports') && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">📍 Para Quadras & Espaços:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Taxa de ocupação dos espaços</li>
                <li>Reservas de hoje e pendentes</li>
                <li>Faturamento do mês</li>
                <li>Gráfico de receitas</li>
              </ul>
            </div>
          )}

          {(!segment || segment === 'beauty' || segment === 'health') && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">💇 Para Salões & Clínicas:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Atendimentos do dia</li>
                <li>Ticket médio por cliente</li>
                <li>Performance dos profissionais</li>
                <li>Faturamento por serviço</li>
              </ul>
            </div>
          )}

          {(!segment || segment === 'custom') && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">🔧 Para Assistência Técnica:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>OS abertas (crítico)</li>
                <li>OS finalizadas hoje</li>
                <li>Faturamento: peças vs mão de obra</li>
                <li>Distribuição por status</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AgendaContent({ segment }: { segment?: VenueSegment }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Como funciona a Agenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!segment || segment === 'sports') && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">📍 Agenda de Espaços</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Visualize a ocupação das suas quadras em tempo real.
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Clique em um horário vazio para criar uma reserva</li>
                <li>Valores calculados automaticamente pelo preço/hora</li>
                <li>Visualização por dia, semana ou mês</li>
                <li>Filtro por espaço</li>
                <li>Reservas recorrentes (semanal, mensal)</li>
              </ul>
            </div>
          )}

          {(!segment || segment === 'beauty' || segment === 'health') && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">💇 Agenda de Atendimentos</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Gerencie os atendimentos por profissional.
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Slots de 30 minutos configuráveis</li>
                <li>Seleção de profissional</li>
                <li>Múltiplos serviços por agendamento</li>
                <li>Duração calculada automaticamente</li>
                <li>Visualização por profissional ou geral</li>
              </ul>
            </div>
          )}

          {(!segment || segment === 'custom') && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">🔧 Agenda de Visitas Técnicas</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Agende visitas e vincule a Ordens de Serviço.
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Agendamento reserva o tempo do técnico</li>
                <li>Vinculação direta com OS</li>
                <li>Faturamento feito pela OS, não pela agenda</li>
                <li>Histórico de visitas por cliente</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dicas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>💡 Clique e arraste para criar reservas mais longas</li>
            <li>💡 Use os filtros para visualizar apenas o que precisa</li>
            <li>💡 Cores indicam o status: pendente, confirmado, finalizado</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ClientesContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Clientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Mantenha uma base de clientes organizada com todas as informações 
            que você precisa para um atendimento personalizado.
          </p>

          <h4 className="font-semibold">Informações do Cliente:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Nome completo e apelido</li>
            <li>Telefone e e-mail</li>
            <li>CPF/CNPJ (opcional)</li>
            <li>Endereço completo</li>
            <li>Observações e preferências</li>
          </ul>

          <h4 className="font-semibold mt-4">Histórico do Cliente:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Todos os agendamentos anteriores</li>
            <li>Ordens de serviço vinculadas</li>
            <li>Valor total gasto</li>
            <li>Frequência de visitas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function EspacosContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Espaços</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Configure seus espaços, quadras e locais disponíveis para reserva.
          </p>

          <h4 className="font-semibold">Para cada espaço, defina:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Nome do espaço (ex: Quadra 1, Sala VIP)</li>
            <li>Preço por hora</li>
            <li>Capacidade máxima</li>
            <li>Descrição e observações</li>
            <li>Categoria (opcional)</li>
          </ul>

          <h4 className="font-semibold mt-4">Categorias:</h4>
          <p className="text-sm text-muted-foreground">
            Organize seus espaços em categorias para facilitar a visualização 
            (ex: Quadras de Futebol, Quadras de Beach Tennis, Salas).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ServicosContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Serviços</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Crie e gerencie todos os serviços oferecidos pelo seu estabelecimento.
          </p>

          <h4 className="font-semibold">Para cada serviço, defina:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Nome do serviço</li>
            <li>Descrição detalhada</li>
            <li>Duração em minutos</li>
            <li>Preço</li>
            <li>Profissionais habilitados</li>
          </ul>

          <h4 className="font-semibold mt-4">Preços por Profissional:</h4>
          <p className="text-sm text-muted-foreground">
            Cada profissional pode ter um preço ou duração diferente para o 
            mesmo serviço, permitindo personalização por experiência.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProdutosContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Produtos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Cadastre produtos para venda e consumo durante os atendimentos.
          </p>

          <h4 className="font-semibold">Exemplos de uso:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li><strong>Quadras:</strong> Bebidas, lanches, aluguel de material</li>
            <li><strong>Salões:</strong> Produtos de beleza, kits de tratamento</li>
            <li><strong>Assistência:</strong> Peças de reposição, componentes</li>
          </ul>

          <h4 className="font-semibold mt-4">Categorias de Produtos:</h4>
          <p className="text-sm text-muted-foreground">
            Organize seus produtos em categorias para facilitar a busca no 
            momento do checkout.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdensServicoContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ordens de Serviço (OS)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Controle completo do fluxo de trabalho para serviços técnicos e manutenções.
          </p>

          <h4 className="font-semibold">Fluxo de Status:</h4>
          <div className="flex items-center gap-2 text-sm my-3">
            <Badge variant="outline">Aberta</Badge>
            <span>→</span>
            <Badge variant="outline">Em Andamento</Badge>
            <span>→</span>
            <Badge variant="outline">Finalizada</Badge>
            <span>→</span>
            <Badge variant="outline">Faturada</Badge>
          </div>

          <h4 className="font-semibold mt-4">Itens da OS:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Serviços executados (mão de obra)</li>
            <li>Peças utilizadas</li>
            <li>Descrição detalhada do problema</li>
            <li>Observações técnicas</li>
          </ul>

          <h4 className="font-semibold mt-4">Integração com Agenda:</h4>
          <p className="text-sm text-muted-foreground">
            Agendamentos podem ser vinculados a uma OS. O agendamento controla 
            o tempo do técnico, enquanto a OS controla o faturamento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function FinanceiroContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Controle Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Acompanhe todas as movimentações financeiras do seu negócio.
          </p>

          <h4 className="font-semibold">Receitas:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Geradas automaticamente de reservas finalizadas</li>
            <li>Geradas de OS concluídas/faturadas</li>
            <li>Separação por forma de pagamento</li>
          </ul>

          <h4 className="font-semibold mt-4">Despesas:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Categorias: material, salário, aluguel, etc.</li>
            <li>Controle de pendências</li>
            <li>Data de vencimento</li>
          </ul>

          <h4 className="font-semibold mt-4">Fluxo de Caixa:</h4>
          <p className="text-sm text-muted-foreground">
            Gráfico visual mostrando entradas e saídas ao longo do tempo, 
            com resumo de saldo disponível.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function RelatoriosContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatórios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Gere relatórios detalhados para análise e tomada de decisão.
          </p>

          <h4 className="font-semibold">Relatórios disponíveis:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Faturamento por período</li>
            <li>Ocupação de espaços/agenda</li>
            <li>Performance por profissional</li>
            <li>Clientes mais frequentes</li>
            <li>Produtos mais vendidos</li>
          </ul>

          <h4 className="font-semibold mt-4">Exportação:</h4>
          <p className="text-sm text-muted-foreground">
            Todos os relatórios podem ser exportados para Excel para 
            análise mais detalhada ou compartilhamento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfiguracoesContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <h4 className="font-semibold">Dados da Empresa:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Nome e logotipo</li>
            <li>Endereço e contatos</li>
            <li>CNPJ/CPF</li>
          </ul>

          <h4 className="font-semibold mt-4">Equipe:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Adicionar membros da equipe</li>
            <li>Definir papéis: Admin, Gerente, Colaborador</li>
            <li>Configurar permissões por módulo</li>
          </ul>

          <h4 className="font-semibold mt-4">Preferências:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Intervalo entre slots da agenda</li>
            <li>Horário de funcionamento</li>
            <li>Lembretes automáticos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleCalendarContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integração com Google Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Sincronize seus agendamentos automaticamente com o Google Calendar.
          </p>

          <h4 className="font-semibold">Como funciona:</h4>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
            <li>Acesse Configurações → Integrações</li>
            <li>Clique em "Conectar Google Calendar"</li>
            <li>Autorize o acesso à sua conta Google</li>
            <li>Pronto! Novos agendamentos serão sincronizados</li>
          </ol>

          <h4 className="font-semibold mt-4">Benefícios:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Visualize agendamentos no seu celular</li>
            <li>Receba notificações do Google</li>
            <li>Compartilhe calendário com a equipe</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function PaginaPublicaContent({ planType }: { planType?: 'basic' | 'max' }) {
  const isBasic = planType === 'basic';

  return (
    <div className="space-y-6">
      {isBasic && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <p className="text-amber-700 dark:text-amber-400">
              ⚠️ Esta funcionalidade está disponível apenas no <strong>Plano Max</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Página Pública de Agendamento</CardTitle>
          <CardDescription>Exclusivo do Plano Max</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Tenha sua própria página de agendamento online para que seus 
            clientes marquem horários 24/7.
          </p>

          <h4 className="font-semibold">Recursos:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Link exclusivo (ex: agendacerta.app/v/seunegocio)</li>
            <li>Identidade visual personalizada</li>
            <li>Cores, logo e informações do seu negócio</li>
            <li>Seleção de serviços/espaços disponíveis</li>
            <li>Horários em tempo real</li>
          </ul>

          <h4 className="font-semibold mt-4">Personalização:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Escolha suas cores (primária, secundária, destaque)</li>
            <li>Adicione seu logotipo</li>
            <li>Configure seções visíveis (galeria, depoimentos, FAQ)</li>
            <li>Integração com WhatsApp</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function FaqGeralContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold">Como altero meu plano?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse Configurações e clique na seção de Plano. Você pode 
              fazer upgrade a qualquer momento.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">Posso ter mais de uma unidade?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Sim! Você pode gerenciar múltiplas unidades na mesma conta. 
              Cada unidade tem seu próprio plano e configurações.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">Como adiciono membros à equipe?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse Configurações → Equipe. Clique em "Adicionar Membro" e 
              preencha os dados. O novo membro receberá um e-mail de acesso.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">Os dados são seguros?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Sim! Utilizamos criptografia de ponta a ponta e servidores 
              seguros. Seus dados são protegidos e nunca compartilhados.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">Como entro em contato com o suporte?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Você pode nos contatar via WhatsApp ou e-mail. O tempo médio 
              de resposta é de até 24 horas em dias úteis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DefaultContent() {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground">
          Conteúdo em desenvolvimento. Em breve teremos mais informações aqui.
        </p>
      </CardContent>
    </Card>
  );
}
