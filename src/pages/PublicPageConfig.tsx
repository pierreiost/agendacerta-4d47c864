import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useVenue } from '@/contexts/VenueContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  Loader2, Globe, Image, MessageSquare, BarChart3, HelpCircle,
  MapPin, Clock, Share2, Plus, Trash2, Upload, X, ExternalLink, GripVertical, Star
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

export default function PublicPageConfig() {
  const { currentVenue, refetchVenues } = useVenue();
  const { toast } = useToast();
  const { upload, isUploading } = useFileUpload();
  const [isLoading, setIsLoading] = useState(false);
  const [sections, setSections] = useState<PublicPageSections>(DEFAULT_SECTIONS);

  const isAdmin = currentVenue?.role === 'admin' || currentVenue?.role === 'superadmin';

  // Load sections from venue
  useEffect(() => {
    if (currentVenue?.id) {
      const loadSections = async () => {
        const { data } = await supabase
          .from('venues')
          .select('public_page_sections')
          .eq('id', currentVenue.id)
          .single();
        
        if (data?.public_page_sections) {
          setSections({ ...DEFAULT_SECTIONS, ...(data.public_page_sections as unknown as Partial<PublicPageSections>) });
        }
      };
      loadSections();
    }
  }, [currentVenue?.id]);

  const handleSave = async () => {
    if (!currentVenue?.id) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('venues')
      .update({ public_page_sections: JSON.parse(JSON.stringify(sections)) })
      .eq('id', currentVenue.id);

    setIsLoading(false);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
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

  // Helper to add items to arrays
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Globe className="h-8 w-8" />
              Página Pública
            </h1>
            <p className="text-muted-foreground">
              Configure as seções da sua página de agendamento online
            </p>
          </div>
          <div className="flex gap-2">
            {currentVenue?.slug && (
              <Button variant="outline" asChild>
                <a href={`/p/${currentVenue.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visualizar
                </a>
              </Button>
            )}
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </div>

        <Tabs defaultValue="hero" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto gap-1 p-1">
            <TabsTrigger value="hero" className="flex-col py-2 h-auto">
              <Image className="h-4 w-4 mb-1" />
              <span className="text-xs">Hero</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex-col py-2 h-auto">
              <Image className="h-4 w-4 mb-1" />
              <span className="text-xs">Galeria</span>
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="flex-col py-2 h-auto">
              <MessageSquare className="h-4 w-4 mb-1" />
              <span className="text-xs">Depoimentos</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-col py-2 h-auto">
              <BarChart3 className="h-4 w-4 mb-1" />
              <span className="text-xs">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex-col py-2 h-auto">
              <HelpCircle className="h-4 w-4 mb-1" />
              <span className="text-xs">FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="flex-col py-2 h-auto">
              <MapPin className="h-4 w-4 mb-1" />
              <span className="text-xs">Localização</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex-col py-2 h-auto">
              <Clock className="h-4 w-4 mb-1" />
              <span className="text-xs">Horários</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-col py-2 h-auto">
              <Share2 className="h-4 w-4 mb-1" />
              <span className="text-xs">Social</span>
            </TabsTrigger>
          </TabsList>

          {/* Hero Section */}
          <TabsContent value="hero">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Seção Hero</CardTitle>
                    <CardDescription>Banner principal com título e chamada para ação</CardDescription>
                  </div>
                  <Switch
                    checked={sections.hero.enabled}
                    onCheckedChange={(checked) => updateSection('hero', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.hero.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        placeholder={currentVenue?.name || "Seu título aqui"}
                        value={sections.hero.title || ''}
                        onChange={(e) => updateSection('hero', { title: e.target.value || null })}
                      />
                      <p className="text-xs text-muted-foreground">Deixe vazio para usar o nome da empresa</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Subtítulo</Label>
                      <Input
                        placeholder="Agende seu horário online"
                        value={sections.hero.subtitle || ''}
                        onChange={(e) => updateSection('hero', { subtitle: e.target.value || null })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Imagem de fundo</Label>
                    <div className="flex gap-4 items-start">
                      {sections.hero.background_image_url ? (
                        <div className="relative">
                          <img
                            src={sections.hero.background_image_url}
                            alt="Hero background"
                            className="h-32 w-48 object-cover rounded-lg border"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => updateSection('hero', { background_image_url: null })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Label
                          htmlFor="hero-bg-upload"
                          className="flex flex-col items-center justify-center h-32 w-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Upload imagem</span>
                        </Label>
                      )}
                      <Input
                        id="hero-bg-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, (url) => updateSection('hero', { background_image_url: url }));
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={sections.hero.show_cta}
                        onCheckedChange={(checked) => updateSection('hero', { show_cta: checked })}
                      />
                      <Label>Mostrar botão de ação</Label>
                    </div>
                    {sections.hero.show_cta && (
                      <Input
                        className="max-w-xs"
                        placeholder="Agendar agora"
                        value={sections.hero.cta_text}
                        onChange={(e) => updateSection('hero', { cta_text: e.target.value })}
                      />
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Gallery Section */}
          <TabsContent value="gallery">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Galeria de Fotos</CardTitle>
                    <CardDescription>Mostre fotos do seu espaço e serviços</CardDescription>
                  </div>
                  <Switch
                    checked={sections.gallery.enabled}
                    onCheckedChange={(checked) => updateSection('gallery', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.gallery.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sections.gallery.images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.url} alt={img.alt || `Foto ${i + 1}`} className="aspect-square object-cover rounded-lg border" />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Adicionar</span>
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Depoimentos</CardTitle>
                    <CardDescription>Feedback de clientes satisfeitos</CardDescription>
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
                      <AccordionItem key={t.id} value={t.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span>{t.author || `Depoimento ${i + 1}`}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Nome</Label>
                              <Input
                                value={t.author}
                                onChange={(e) => updateTestimonial(t.id, { author: e.target.value })}
                                placeholder="João Silva"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Cargo/Descrição</Label>
                              <Input
                                value={t.role}
                                onChange={(e) => updateTestimonial(t.id, { role: e.target.value })}
                                placeholder="Cliente desde 2023"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Depoimento</Label>
                            <Textarea
                              value={t.content}
                              onChange={(e) => updateTestimonial(t.id, { content: e.target.value })}
                              placeholder="Excelente atendimento..."
                              rows={3}
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="space-y-2">
                              <Label>Avaliação</Label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => updateTestimonial(t.id, { rating: star })}
                                    className="p-1"
                                  >
                                    <Star
                                      className={cn(
                                        "h-5 w-5",
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
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <Button variant="outline" onClick={addTestimonial}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar depoimento
                  </Button>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Stats Section */}
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Estatísticas</CardTitle>
                    <CardDescription>Números que destacam sua empresa</CardDescription>
                  </div>
                  <Switch
                    checked={sections.stats.enabled}
                    onCheckedChange={(checked) => updateSection('stats', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.stats.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Anos no mercado</Label>
                      <Input
                        type="number"
                        value={sections.stats.years_in_business || ''}
                        onChange={(e) => updateSection('stats', { years_in_business: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Clientes atendidos</Label>
                      <Input
                        type="number"
                        value={sections.stats.customers_served || ''}
                        onChange={(e) => updateSection('stats', { customers_served: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agendamentos realizados</Label>
                      <Input
                        type="number"
                        value={sections.stats.bookings_completed || ''}
                        onChange={(e) => updateSection('stats', { bookings_completed: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="5000"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Label className="mb-2 block">Estatísticas personalizadas</Label>
                    <div className="space-y-2">
                      {sections.stats.custom_stats.map((stat, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            placeholder="Valor (ex: 98%)"
                            value={stat.value}
                            onChange={(e) => updateCustomStat(i, { value: e.target.value })}
                            className="w-32"
                          />
                          <Input
                            placeholder="Descrição (ex: Satisfação)"
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Perguntas Frequentes</CardTitle>
                    <CardDescription>Dúvidas comuns dos seus clientes</CardDescription>
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
                      <AccordionItem key={f.id} value={f.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span>{f.question || `Pergunta ${i + 1}`}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Pergunta</Label>
                            <Input
                              value={f.question}
                              onChange={(e) => updateFaq(f.id, { question: e.target.value })}
                              placeholder="Como faço para agendar?"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Resposta</Label>
                            <Textarea
                              value={f.answer}
                              onChange={(e) => updateFaq(f.id, { answer: e.target.value })}
                              placeholder="Você pode agendar diretamente..."
                              rows={3}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeFaq(f.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remover
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <Button variant="outline" onClick={addFaq}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar pergunta
                  </Button>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Location Section */}
          <TabsContent value="location">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Localização</CardTitle>
                    <CardDescription>Endereço e mapa do seu estabelecimento</CardDescription>
                  </div>
                  <Switch
                    checked={sections.location.enabled}
                    onCheckedChange={(checked) => updateSection('location', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.location.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Endereço linha 1</Label>
                      <Input
                        value={sections.location.address_line1 || ''}
                        onChange={(e) => updateSection('location', { address_line1: e.target.value || null })}
                        placeholder="Rua das Flores, 123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Endereço linha 2</Label>
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
                    <Label>Exibir mapa</Label>
                  </div>
                  {sections.location.show_map && (
                    <div className="space-y-2">
                      <Label>URL do Google Maps Embed</Label>
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Horários de Funcionamento</CardTitle>
                    <CardDescription>Configure os horários de cada dia da semana</CardDescription>
                  </div>
                  <Switch
                    checked={sections.hours.enabled}
                    onCheckedChange={(checked) => updateSection('hours', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.hours.enabled && (
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(sections.hours.schedule).map(([day, schedule]) => (
                      <div key={day} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <span className="w-24 font-medium">{DAY_LABELS[day]}</span>
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
                              className="w-28"
                            />
                            <span>às</span>
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
                              className="w-28"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Fechado</span>
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Redes Sociais e Contato</CardTitle>
                    <CardDescription>Links e informações de contato</CardDescription>
                  </div>
                  <Switch
                    checked={sections.social.enabled}
                    onCheckedChange={(checked) => updateSection('social', { enabled: checked })}
                  />
                </div>
              </CardHeader>
              {sections.social.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input
                        value={sections.social.whatsapp || ''}
                        onChange={(e) => updateSection('social', { whatsapp: e.target.value || null })}
                        placeholder="5511999999999"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Instagram</Label>
                      <Input
                        value={sections.social.instagram || ''}
                        onChange={(e) => updateSection('social', { instagram: e.target.value || null })}
                        placeholder="@seuinstagram"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Facebook</Label>
                      <Input
                        value={sections.social.facebook || ''}
                        onChange={(e) => updateSection('social', { facebook: e.target.value || null })}
                        placeholder="https://facebook.com/suapagina"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={sections.social.phone || ''}
                        onChange={(e) => updateSection('social', { phone: e.target.value || null })}
                        placeholder="(11) 3333-4444"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Email</Label>
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
