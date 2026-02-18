import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, CalendarSearch } from 'lucide-react';
import logo from '@/assets/logo.svg';
import { cn } from '@/lib/utils';

interface LandingNavProps {
  onCTA: () => void;
}

export function LandingNav({ onCTA }: LandingNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'Segmentos', id: 'segmentos' },
    { label: 'Funcionalidades', id: 'funcionalidades' },
    { label: 'Depoimentos', id: 'depoimentos' },
    { label: 'Benefícios', id: 'beneficios' },
    { label: 'Preços', id: 'precos' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="AgendaCerta" className="h-8 md:h-10 w-auto" />
            <span className={cn(
              "font-bold text-lg md:text-xl transition-colors",
              isScrolled ? "text-foreground" : "text-white"
            )}>
              AgendaCerta
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isScrolled ? "text-muted-foreground" : "text-white/80 hover:text-white"
                )}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 rounded-xl font-medium transition-colors",
                isScrolled
                  ? "border-border text-muted-foreground hover:text-primary"
                  : "border-white/30 text-white/90 hover:text-white hover:bg-white/10"
              )}
            >
              <Link to="/minhas-reservas">
                <CalendarSearch className="h-4 w-4" />
                Minhas Reservas
              </Link>
            </Button>
            <Button 
              onClick={onCTA}
              className="gradient-primary hover:opacity-90 px-6"
            >
              Começar Grátis
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className={cn("h-6 w-6", isScrolled ? "text-foreground" : "text-white")} />
            ) : (
              <Menu className={cn("h-6 w-6", isScrolled ? "text-foreground" : "text-white")} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background border-b border-border">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="block w-full text-left py-2 text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </button>
            ))}
            <Button asChild variant="outline" className="w-full gap-2 mt-2">
              <Link to="/minhas-reservas">
                <CalendarSearch className="h-4 w-4" />
                Minhas Reservas
              </Link>
            </Button>
            <Button onClick={onCTA} className="w-full gradient-primary mt-2">
              Começar Grátis
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
