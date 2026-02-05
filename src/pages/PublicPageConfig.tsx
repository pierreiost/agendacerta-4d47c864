import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useVenue } from '@/contexts/VenueContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useStatePersist } from '@/hooks/useStatePersist';
import { useTabPersist } from '@/hooks/useTabPersist';
import {
  Loader2, Globe, Image, MessageSquare, BarChart3, HelpCircle,
  MapPin, Clock, Share2, Plus, Trash2, Upload, X, ExternalLink, 
  GripVertical, Star, Palette, ImageIcon, Link as LinkIcon
} from 'lucide-react';
import { PublicPageSections, DEFAULT_SECTIONS, Testimonial, FaqItem, GalleryImage, CustomStat } from '@/types/public-page';
import { cn } from '@/lib/utils';

const DAY_LABELS: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const PRESET_COLORS = [
  { color: '#6366f1', name: 'Indigo' },
  { color: '#22c55e', name: 'Verde' },
  { color: '#f59e0b', name: 'Âmbar' },
  { color: '#ef4444', name: 'Vermelho' },
  { color: '#8b5cf6', name: 'Violeta' },
  { color: '#06b6d4', name: 'Ciano' },
  { color: '#ec4899', name: 'Rosa' },
  { color: '#f97316', name: 'Laranja' },
];

export default function PublicPageConfig() {
  const { currentVenue, refetchVenues } = useVenue();
  const { toast } = useToast();
  const { upload, isUploading } = useFileUpload();
  const [isLoading, setIsLoading] = useState(false);
  const [sections, setSections] = useState<PublicPageSections>(DEFAULT_SECTIONS);
  const [primaryColor, setPrimaryColor] = useState<string>('');
  const [publicLogoUrl, setPublicLogoUrl] = useState<string>('');
  const [logoInputMode, setLogoInputMode] = useState<'url' | 'file'>('url');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const hasLoadedFromDbRef = useRef(false);
  
  const { activeTab, onTabChange } = useTabPersist({ key: 'public_page_config', defaultValue: 'branding' });

  const isAdmin = currentVenue?.role === 'admin' || currentVenue?.role === 'superadmin';

  // Use state persistence for sections
  const { clearDraft } = useStatePersist({
    key: `public_page_${currentVenue?.id}`,
    state: sections,
    setState: setSections,
    isReady: isDataLoaded && !!currentVenue?.id,
  });

  // Load sections and branding from venue (only on first mount)
  useEffect(() => {
    if (currentVenue?.id && !hasLoadedFromDbRef.current) {
      hasLoadedFromDbRef.current = true;
      
      const loadData = async () => {
        // Check if there's a draft first
        const storageKey = `state_draft_public_page_${currentVenue.id}`;
        const hasDraft = localStorage.getItem(storageKey);
        
        if (hasDraft) {
          // If there's a draft, the useStatePersist hook will handle restoration
          setIsDataLoaded(true);
          return;
        }

        // No draft, load from database
        const { data } = await supabase
          .from('venues')
          .select('public_page_sections, primary_color, logo_url')
          .eq('id', currentVenue.id)
          .single();
        
        if (data?.public_page_sections) {
          setSections({ ...DEFAULT_SECTIONS, ...(data.public_page_sections as unknown as Partial<PublicPageSections>) });
        }
        if (data?.primary_color) {
          setPrimaryColor(data.primary_color);
        }
        if (data?.logo_url) {
          setPublicLogoUrl(data.logo_url);
        }
        
        setIsDataLoaded(true);
      };
      loadData();
    }
  }, [currentVenue?.id]);

  const handleSave = async () => {
    if (!currentVenue?.id) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('venues')
      .update({ 
        public_page_sections: JSON.parse(JSON.stringify(sections)),
        primary_color: primaryColor || null,
        logo_url: publicLogoUrl || null,
      })
      .eq('id', currentVenue.id);

    setIsLoading(false);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      // Clear draft on successful save
      clearDraft();
      toast({ title: 'Configurações salvas!' });
      refetchVenues();
    }
  };

  const handleImageUpload = async (file: File, callback: (url: string) => void) => {
    if (!currentVenue?.id) return;
    const result = await upload(file, {
      bucket: 'public-page-assets',
      folder: currentVenue.id,
    });
    if (result?.url) {
      callback(result.url);
    }
  };

  const updateSection = <K extends keyof PublicPageSections>(
    section: K,
    updates: Partial<PublicPageSections[K]>
  ) => {
    setSections(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  };

  // Helper functions for array items
  const addTestimonial = () => {
    const newItem: Testimonial = {
      id: crypto.randomUUID(),
      author: '',
      role: '',
      content: '',
      avatar_url: null,
      rating: 5
    };
    updateSection('testimonials', { items: [...sections.testimonials.items, newItem] });
  };

  const updateTestimonial = (id: string, updates: Partial<Testimonial>) => {
    updateSection('testimonials', {
      items: sections.testimonials.items.map(t => t.id === id ? { ...t, ...updates } : t)
    });
  };

  const removeTestimonial = (id: string) => {
    updateSection('testimonials', {
      items: sections.testimonials.items.filter(t => t.id !== id)
    });
  };

  const addFaq = () => {
    const newItem: FaqItem = { id: crypto.randomUUID(), question: '', answer: '' };
    updateSection('faq', { items: [...sections.faq.items, newItem] });
  };

  const updateFaq = (id: string, updates: Partial<FaqItem>) => {
    updateSection('faq', {
      items: sections.faq.items.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const removeFaq = (id: string) => {
    updateSection('faq', { items: sections.faq.items.filter(f => f.id !== id) });
  };

  const addGalleryImage = (url: string) => {
    const newImage: GalleryImage = { url, alt: '' };
    updateSection('gallery', { images: [...sections.gallery.images, newImage] });
  };

  const removeGalleryImage = (index: number) => {
    updateSection('gallery', {
      images: sections.gallery.images.filter((_, i) => i !== index)
    });
  };

  const addCustomStat = () => {
    const newStat: CustomStat = { label: '', value: '' };
    updateSection('stats', { custom_stats: [...sections.stats.custom_stats, newStat] });
  };

  const updateCustomStat = (index: number, updates: Partial<CustomStat>) => {
    updateSection('stats', {
      custom_stats: sections.stats.custom_stats.map((s, i) => i === index ? { ...s, ...updates } : s)
    });
  };

  const removeCustomStat = (index: number) => {
    updateSection('stats', {
      custom_stats: sections.stats.custom_stats.filter((_, i) => i !== index)
    });
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground mt-2">
            Apenas administradores podem configurar a página pública.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Globe className="h-6 w-6" />
              Página Pública
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure as seções e a identidade visual do seu site
            </p>
          </div>
          <div className="flex gap-2">
            {currentVenue?.slug && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/v/${currentVenue.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Visualizar
                </a>
              </Button>
            )}
            <Button onClick={handleSave} disabled={isLoading} size="sm">
              {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto gap-1 p-1">
            <TabsTrigger value="branding" className="flex-col py-1.5 h-auto">
              <Palette className="h-4 w-4 mb-0.5" />
              <span className="text-xs">Identidade</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex-col py-1.5 h-auto">
              <Image className="h-4 w-4 mb-0.5" />
              <span className="text-xs">Galeria</span>
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="flex-col py-1.5 h-auto">
              <MessageSquare className="h-4 w-4 mb-0.5" />
              <span className="text-xs">Depoimentos</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-col py-1.5 h-auto">
              <BarChart3 className="h-4 w-4 mb-0.5" />
              <span className="text-xs">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex-col py-1.5 h-auto">
              <HelpCircle className="h-4 w-4 mb-0.5" />
              <span className="text-xs">FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="flex-col py-1.5 h-auto">
              <MapPin className="h-4 w-4 mb-0.5" />
              <span className="text-xs">Localização</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex-col py-1.5 h-auto">
              <Clock className="h-4 w-4 mb-0.5" />
              <span className="text-xs">Horários</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-col py-1.5 h-auto">
              <Share2 className="h-4 w-4 mb-0.5" />
              <span className="text-xs">Social</span>
            </TabsTrigger>
          </TabsList>

          {/* Branding / Identity Section */}
          <TabsContent value="branding">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Logo do Site */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Logo do Site
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Exibido no hero e cabeçalho da página pública
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border">
                        <AvatarImage src={publicLogoUrl || currentVenue?.logo_url || undefined} alt="Logo" />
                        <AvatarFallback>
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      {publicLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setPublicLogoUrl('')}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={logoInputMode === 'url' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setLogoInputMode('url')}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          URL
                        </Button>
                        <Button
                          type="button"
                          variant={logoInputMode === 'file' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setLogoInputMode('file')}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Arquivo
                        </Button>
                      </div>
                      {logoInputMode === 'url' ? (
                        <Input
                          placeholder="https://exemplo.com/logo.png"
                          value={publicLogoUrl}
                          onChange={(e) => setPublicLogoUrl(e.target.value)}
                          className="text-sm"
                        />
                      ) : (
                        <div>
                          <Label
                            htmlFor="public-logo-upload"
                            className={cn(
                              "flex flex-col items-center justify-center w-full h-14 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                              isUploading && 'opacity-50 pointer-events-none'
                            )}
                          >
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">PNG, JPG</span>
                              </>
                            )}
                          </Label>
                          <Input
                            id="public-logo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, setPublicLogoUrl);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Usa o logo do sistema se não definido
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cor Principal */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Cor Principal
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Aplicada nos botões, links e destaques do site
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                          primaryColor === preset.color ? 'border-foreground scale-110 ring-2 ring-offset-2' : 'border-transparent'
                        )}
                        style={{ backgroundColor: preset.color }}
                        onClick={() => setPrimaryColor(preset.color)}
                        title={preset.name}
                      />
                    ))}
                    <Input
                      type="color"
                      className="h-8 w-8 p-0 border-0 cursor-pointer rounded-full overflow-hidden"
                      value={primaryColor || '#6366f1'}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                    {primaryColor && (
                      <>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">{primaryColor}</span>
                        <button
                          type="button"
                          onClick={() => setPrimaryColor('')}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Gallery Section */}
          <TabsContent value="gallery">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Galeria de Fotos</CardTitle>
                    <CardDescription className="text-xs">Mostre fotos do seu espaço e serviços</CardDescription>
                  </div>
                  <Switch
                    checked={sections.gallery.enabled}
                    onCheckedChange={(checked) => updateSection('gallery', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.gallery.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {sections.gallery.images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.url} alt={img.alt || `Foto ${i + 1}`} className="aspect-square object-cover rounded-lg border" />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeGalleryImage(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {sections.gallery.images.length < 12 && (
                      <Label
                        htmlFor="gallery-upload"
                        className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Plus className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Adicionar</span>
                      </Label>
                    )}
                  </div>
                  <Input
                    id="gallery-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, addGalleryImage);
                      e.target.value = '';
                    }}
                  />
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Testimonials Section */}
          <TabsContent value="testimonials">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Depoimentos</CardTitle>
                    <CardDescription className="text-xs">Feedback de clientes satisfeitos</CardDescription>
                  </div>
                  <Switch
                    checked={sections.testimonials.enabled}
                    onCheckedChange={(checked) => updateSection('testimonials', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.testimonials.enabled && (
                <CardContent className="space-y-4">
                  <Accordion type="multiple" className="space-y-2">
                    {sections.testimonials.items.map((t, i) => (
                      <AccordionItem key={t.id} value={t.id} className="border rounded-lg px-3">
                        <AccordionTrigger className="hover:no-underline py-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{t.author || `Depoimento ${i + 1}`}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Nome</Label>
                              <Input
                                value={t.author}
                                onChange={(e) => updateTestimonial(t.id, { author: e.target.value })}
                                placeholder="João Silva"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Cargo/Descrição</Label>
                              <Input
                                value={t.role}
                                onChange={(e) => updateTestimonial(t.id, { role: e.target.value })}
                                placeholder="Cliente desde 2023"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Depoimento</Label>
                            <Textarea
                              value={t.content}
                              onChange={(e) => updateTestimonial(t.id, { content: e.target.value })}
                              placeholder="Excelente atendimento..."
                              rows={2}
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Avaliação</Label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => updateTestimonial(t.id, { rating: star })}
                                    className="p-0.5"
                                  >
                                    <Star
                                      className={cn(
                                        "h-4 w-4",
                                        star <= t.rating ? "fill-warning text-warning" : "text-muted-foreground"
                                      )}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive ml-auto"
                              onClick={() => removeTestimonial(t.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <Button variant="outline" size="sm" onClick={addTestimonial}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar depoimento
                  </Button>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Stats Section */}
          <TabsContent value="stats">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Estatísticas</CardTitle>
                    <CardDescription className="text-xs">Números que destacam sua empresa</CardDescription>
                  </div>
                  <Switch
                    checked={sections.stats.enabled}
                    onCheckedChange={(checked) => updateSection('stats', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.stats.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Anos no mercado</Label>
                      <Input
                        type="number"
                        value={sections.stats.years_in_business || ''}
                        onChange={(e) => updateSection('stats', { years_in_business: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="5"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Clientes atendidos</Label>
                      <Input
                        type="number"
                        value={sections.stats.customers_served || ''}
                        onChange={(e) => updateSection('stats', { customers_served: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="1000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Agendamentos realizados</Label>
                      <Input
                        type="number"
                        value={sections.stats.bookings_completed || ''}
                        onChange={(e) => updateSection('stats', { bookings_completed: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="5000"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <Label className="text-xs mb-2 block">Estatísticas personalizadas</Label>
                    <div className="space-y-2">
                      {sections.stats.custom_stats.map((stat, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            placeholder="Valor"
                            value={stat.value}
                            onChange={(e) => updateCustomStat(i, { value: e.target.value })}
                            className="w-24"
                          />
                          <Input
                            placeholder="Descrição"
                            value={stat.label}
                            onChange={(e) => updateCustomStat(i, { label: e.target.value })}
                            className="flex-1"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeCustomStat(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={addCustomStat} className="mt-2">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* FAQ Section */}
          <TabsContent value="faq">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Perguntas Frequentes</CardTitle>
                    <CardDescription className="text-xs">Dúvidas comuns dos seus clientes</CardDescription>
                  </div>
                  <Switch
                    checked={sections.faq.enabled}
                    onCheckedChange={(checked) => updateSection('faq', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.faq.enabled && (
                <CardContent className="space-y-4">
                  <Accordion type="multiple" className="space-y-2">
                    {sections.faq.items.map((f, i) => (
                      <AccordionItem key={f.id} value={f.id} className="border rounded-lg px-3">
                        <AccordionTrigger className="hover:no-underline py-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{f.question || `Pergunta ${i + 1}`}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Pergunta</Label>
                            <Input
                              value={f.question}
                              onChange={(e) => updateFaq(f.id, { question: e.target.value })}
                              placeholder="Como faço para agendar?"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Resposta</Label>
                            <Textarea
                              value={f.answer}
                              onChange={(e) => updateFaq(f.id, { answer: e.target.value })}
                              placeholder="Você pode agendar diretamente..."
                              rows={2}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeFaq(f.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remover
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <Button variant="outline" size="sm" onClick={addFaq}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar pergunta
                  </Button>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Location Section */}
          <TabsContent value="location">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Localização</CardTitle>
                    <CardDescription className="text-xs">Endereço e mapa do seu estabelecimento</CardDescription>
                  </div>
                  <Switch
                    checked={sections.location.enabled}
                    onCheckedChange={(checked) => updateSection('location', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.location.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Endereço linha 1</Label>
                      <Input
                        value={sections.location.address_line1 || ''}
                        onChange={(e) => updateSection('location', { address_line1: e.target.value || null })}
                        placeholder="Rua das Flores, 123"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Endereço linha 2</Label>
                      <Input
                        value={sections.location.address_line2 || ''}
                        onChange={(e) => updateSection('location', { address_line2: e.target.value || null })}
                        placeholder="Centro, São Paulo - SP"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sections.location.show_map}
                      onCheckedChange={(checked) => updateSection('location', { show_map: checked })}
                    />
                    <Label className="text-sm">Exibir mapa</Label>
                  </div>
                  {sections.location.show_map && (
                    <div className="space-y-1">
                      <Label className="text-xs">URL do Google Maps Embed</Label>
                      <Input
                        value={sections.location.google_maps_embed_url || ''}
                        onChange={(e) => updateSection('location', { google_maps_embed_url: e.target.value || null })}
                        placeholder="https://www.google.com/maps/embed?pb=..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Cole aqui o código de incorporação do Google Maps
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Hours Section */}
          <TabsContent value="hours">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Horários de Funcionamento</CardTitle>
                    <CardDescription className="text-xs">Configure os horários de cada dia da semana</CardDescription>
                  </div>
                  <Switch
                    checked={sections.hours.enabled}
                    onCheckedChange={(checked) => updateSection('hours', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.hours.enabled && (
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(sections.hours.schedule).map(([day, schedule]) => (
                      <div key={day} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <span className="w-20 font-medium text-sm">{DAY_LABELS[day]}</span>
                        <Switch
                          checked={!schedule.closed}
                          onCheckedChange={(checked) => {
                            const newSchedule = { ...sections.hours.schedule };
                            (newSchedule as Record<string, typeof schedule>)[day] = {
                              ...schedule,
                              closed: !checked
                            };
                            updateSection('hours', { schedule: newSchedule });
                          }}
                        />
                        {!schedule.closed ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={schedule.open || ''}
                              onChange={(e) => {
                                const newSchedule = { ...sections.hours.schedule };
                                (newSchedule as Record<string, typeof schedule>)[day] = {
                                  ...schedule,
                                  open: e.target.value || null
                                };
                                updateSection('hours', { schedule: newSchedule });
                              }}
                              className="w-24"
                            />
                            <span className="text-sm">às</span>
                            <Input
                              type="time"
                              value={schedule.close || ''}
                              onChange={(e) => {
                                const newSchedule = { ...sections.hours.schedule };
                                (newSchedule as Record<string, typeof schedule>)[day] = {
                                  ...schedule,
                                  close: e.target.value || null
                                };
                                updateSection('hours', { schedule: newSchedule });
                              }}
                              className="w-24"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Fechado</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Social Section */}
          <TabsContent value="social">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Redes Sociais e Contato</CardTitle>
                    <CardDescription className="text-xs">Links e informações de contato</CardDescription>
                  </div>
                  <Switch
                    checked={sections.social.enabled}
                    onCheckedChange={(checked) => updateSection('social', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.social.enabled && (
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">WhatsApp</Label>
                      <Input
                        value={sections.social.whatsapp || ''}
                        onChange={(e) => updateSection('social', { whatsapp: e.target.value || null })}
                        placeholder="5511999999999"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Instagram</Label>
                      <Input
                        value={sections.social.instagram || ''}
                        onChange={(e) => updateSection('social', { instagram: e.target.value || null })}
                        placeholder="@seuinstagram"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Facebook</Label>
                      <Input
                        value={sections.social.facebook || ''}
                        onChange={(e) => updateSection('social', { facebook: e.target.value || null })}
                        placeholder="https://facebook.com/suapagina"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input
                        value={sections.social.phone || ''}
                        onChange={(e) => updateSection('social', { phone: e.target.value || null })}
                        placeholder="(11) 3333-4444"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        value={sections.social.email || ''}
                        onChange={(e) => updateSection('social', { email: e.target.value || null })}
                        placeholder="contato@empresa.com"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
