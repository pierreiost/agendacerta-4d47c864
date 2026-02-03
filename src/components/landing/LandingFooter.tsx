import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="AgendaCerta" className="h-10 w-auto" />
              <span className="text-xl font-bold text-background">AgendaCerta</span>
            </div>
            <p className="text-background/70 text-sm max-w-md">
              Sistema completo de gestão e agendamento para quadras esportivas, 
              salões de beleza, clínicas e assistência técnica. Organize sua 
              operação e aumente seu faturamento.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-background font-semibold mb-4">Produto</h4>
            <ul className="space-y-2">
              <li>
                <a href="#funcionalidades" className="text-background/70 hover:text-background text-sm transition-colors">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#precos" className="text-background/70 hover:text-background text-sm transition-colors">
                  Preços
                </a>
              </li>
              <li>
                <a href="#segmentos" className="text-background/70 hover:text-background text-sm transition-colors">
                  Segmentos
                </a>
              </li>
              <li>
                <a href="#depoimentos" className="text-background/70 hover:text-background text-sm transition-colors">
                  Depoimentos
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-background font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-background/70 hover:text-background text-sm transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <a href="mailto:contato@agendacerta.com" className="text-background/70 hover:text-background text-sm transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/50 text-sm">
            © {currentYear} AgendaCerta. Todos os direitos reservados.
          </p>
          <p className="text-background/50 text-sm">
            Feito com ❤️ no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
