import { useState } from 'react';
import { useMarketplaceVenues, useMarketplaceFilters } from '@/hooks/useMarketplace';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Store, ArrowRight, Loader2, CalendarSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

const SEGMENT_LABELS: Record<string, string> = {
  beauty: 'Beleza & Estética',
  health: 'Saúde & Bem-estar',
  sports: 'Quadras & Espaços',
  custom: 'Serviços Gerais',
};

export default function Marketplace() {
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const [activeCity, setActiveCity] = useState<string | null>(null);

  const { data: filters, isLoading: filtersLoading } = useMarketplaceFilters();
  const { data: venues, isLoading: venuesLoading } = useMarketplaceVenues(selectedNiche, activeCity);

  const handleCitySearch = () => {
    setActiveCity(citySearch.trim() || null);
  };

  // Group niches by segment
  const nichesBySegment = (filters?.niches || []).reduce<Record<string, typeof filters.niches>>((acc, niche) => {
    if (!acc[niche.segment]) acc[niche.segment] = [];
    acc[niche.segment].push(niche);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b">
        <div className="container mx-auto px-4 py-12 md:py-20 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
            Encontre o profissional certo
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-6">
            Busque por categoria e cidade, e agende diretamente com o profissional.
          </p>
          <div className="flex justify-center mb-8">
            <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl">
              <Link to="/minhas-reservas">
                <CalendarSearch className="h-4 w-4" />
                Consultar Minhas Reservas
              </Link>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <Select
              value={selectedNiche || 'all'}
              onValueChange={(v) => setSelectedNiche(v === 'all' ? null : v)}
            >
              <SelectTrigger className="flex-1 bg-background">
                <SelectValue placeholder="Todos os nichos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os nichos</SelectItem>
                {Object.entries(nichesBySegment).map(([segment, niches]) => (
                  <SelectGroup key={segment}>
                    <SelectLabel>{SEGMENT_LABELS[segment] || segment}</SelectLabel>
                    {niches.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cidade..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()}
                  className="pl-9 bg-background"
                />
              </div>
              <Button onClick={handleCitySearch} size="icon" variant="default">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        {venuesLoading || filtersLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : venues && venues.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {venues.length} resultado{venues.length !== 1 ? 's' : ''} encontrado{venues.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {venues.map((venue) => (
                <a
                  key={venue.id}
                  href={venue.slug ? `/v/${venue.slug}` : '#'}
                  className="group block rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:border-primary/30"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {venue.logo_url ? (
                      <img
                        src={venue.logo_url}
                        alt={venue.name}
                        className="h-12 w-12 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {venue.name}
                      </h3>
                      {(venue.city || venue.state) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[venue.city, venue.state].filter(Boolean).join(' / ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {venue.niche_name && (
                    <Badge variant="secondary" className="text-xs mb-3">
                      {venue.niche_name}
                    </Badge>
                  )}
                  <div className="flex justify-end">
                    <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                      Agendar <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum resultado encontrado</h2>
            <p className="text-muted-foreground">
              Tente buscar com outros filtros ou em outra cidade.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
