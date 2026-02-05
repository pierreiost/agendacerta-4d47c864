import { cn } from "@/lib/utils";
import { helpCategories, type HelpArticle, type VenueSegment } from "@/data/help-content";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Rocket,
  LayoutGrid,
  Plug,
  HelpCircle,
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
  Heart,
  type LucideIcon,
} from "lucide-react";

// Mapeamento de ícones
const iconMap: Record<string, LucideIcon> = {
  Rocket,
  LayoutGrid,
  Plug,
  HelpCircle,
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
  Heart,
};

interface HelpSidebarProps {
  selectedArticle: string | null;
  onSelectArticle: (articleId: string) => void;
  segment?: VenueSegment;
  planType?: 'basic' | 'max';
}

export function HelpSidebar({ selectedArticle, onSelectArticle, segment, planType }: HelpSidebarProps) {
  // Filtrar artigos por segmento
  const isArticleVisible = (article: HelpArticle): boolean => {
    // Verificar segmento
    if (segment && !article.segments.includes('all') && !article.segments.includes(segment)) {
      return false;
    }
    return true;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {helpCategories.map((category) => {
          const visibleArticles = category.articles.filter(isArticleVisible);
          if (visibleArticles.length === 0) return null;

          const CategoryIcon = iconMap[category.icon] || HelpCircle;

          return (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-2 px-2">
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {category.title}
                </span>
              </div>

              <div className="space-y-1">
                {visibleArticles.map((article) => {
                  const ArticleIcon = iconMap[article.icon] || HelpCircle;
                  const isMaxOnly = article.planRequired === 'max';
                  const isLocked = isMaxOnly && planType === 'basic';

                  return (
                    <button
                      key={article.id}
                      onClick={() => onSelectArticle(article.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all",
                        "hover:bg-muted",
                        selectedArticle === article.id && "bg-primary/10 text-primary font-medium",
                        isLocked && "opacity-60"
                      )}
                    >
                      <ArticleIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate flex-1">{article.title}</span>
                      {isMaxOnly && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-brand/10 text-brand">
                          Max
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
