import { useState } from "react";
import { useVenue } from "@/contexts/VenueContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { HelpSidebar } from "@/components/help/HelpSidebar";
import { HelpArticle } from "@/components/help/HelpArticle";
import { HelpSearch } from "@/components/help/HelpSearch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, BookOpen } from "lucide-react";
import { type VenueSegment } from "@/data/help-content";

export default function Ajuda() {
  const { currentVenue } = useVenue();
  const [selectedArticle, setSelectedArticle] = useState<string | null>("welcome");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Obter segmento e plano da venue atual
  const segment = (currentVenue as { segment?: VenueSegment })?.segment;
  const planType = currentVenue?.plan_type as 'basic' | 'max' | undefined;

  const handleSelectArticle = (articleId: string) => {
    setSelectedArticle(articleId);
    setMobileMenuOpen(false);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <div className="p-4 border-b">
                  <h2 className="font-semibold flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Central de Ajuda
                  </h2>
                </div>
                <HelpSidebar
                  selectedArticle={selectedArticle}
                  onSelectArticle={handleSelectArticle}
                  segment={segment}
                  planType={planType}
                />
              </SheetContent>
            </Sheet>

            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Central de Ajuda
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Encontre respostas e aprenda a usar o AgendaCerta
              </p>
            </div>

            {/* Search */}
            <div className="w-64 hidden sm:block">
              <HelpSearch 
                segment={segment} 
                onSelectArticle={handleSelectArticle} 
              />
            </div>
          </div>

          {/* Mobile search */}
          <div className="mt-3 sm:hidden">
            <HelpSearch 
              segment={segment} 
              onSelectArticle={handleSelectArticle} 
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - desktop */}
          <div className="hidden md:block w-72 border-r bg-muted/30 overflow-hidden">
            <HelpSidebar
              selectedArticle={selectedArticle}
              onSelectArticle={handleSelectArticle}
              segment={segment}
              planType={planType}
            />
          </div>

          {/* Article content */}
          <div className="flex-1 overflow-y-auto">
            <HelpArticle
              articleId={selectedArticle || "welcome"}
              segment={segment}
              planType={planType}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
