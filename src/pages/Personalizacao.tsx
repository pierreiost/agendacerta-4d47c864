import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useVenue } from '@/contexts/VenueContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  Loader2,
  Palette,
  ImageIcon,
  Upload,
  Link,
  X,
  Moon,
  Sun,
  Eye,
  Calendar,
  Bell,
  Settings,
} from 'lucide-react';

// Cores predefinidas
const PRESET_COLORS = [
  { color: '#6366f1', name: 'Indigo' },
  { color: '#22c55e', name: 'Verde' },
  { color: '#f59e0b', name: 'Âmbar' },
  { color: '#ef4444', name: 'Vermelho' },
  { color: '#8b5cf6', name: 'Violeta' },
  { color: '#06b6d4', name: 'Ciano' },
  { color: '#ec4899', name: 'Rosa' },
  { color: '#f97316', name: 'Laranja' },
  { color: '#14b8a6', name: 'Teal' },
  { color: '#64748b', name: 'Cinza' },
];

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

const themeFormSchema = z.object({
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
  primary_color: z.string().regex(hexColorRegex, 'Cor inválida').optional().or(z.literal('')),
  secondary_color: z.string().regex(hexColorRegex, 'Cor inválida').optional().or(z.literal('')),
  accent_color: z.string().regex(hexColorRegex, 'Cor inválida').optional().or(z.literal('')),
  dark_mode: z.boolean(),
});

type ThemeFormData = z.infer<typeof themeFormSchema>;

// Componente de seleção de cor com descrição
function ColorPicker({
  label,
  description,
  value,
  onChange,
  presets = PRESET_COLORS,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (color: string) => void;
  presets?: typeof PRESET_COLORS;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {presets.map((preset) => (
          <button
            key={preset.color}
            type="button"
            className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
              value === preset.color ? 'border-foreground scale-110 ring-2 ring-offset-2' : 'border-transparent'
            }`}
            style={{ backgroundColor: preset.color }}
            onClick={() => onChange(preset.color)}
            title={preset.name}
          />
        ))}
        <div className="relative">
          <Input
            type="color"
            className="h-8 w-8 p-0 border-0 cursor-pointer rounded-full overflow-hidden"
            value={value || '#6366f1'}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        {value && (
          <>
            <span className="text-sm text-muted-foreground ml-2 font-mono">{value}</span>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-muted-foreground hover:text-foreground ml-1"
              title="Remover cor"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Componente de Preview em tempo real
function ThemePreview({
  primaryColor,
  secondaryColor,
  accentColor,
  darkMode,
  logoUrl,
}: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkMode: boolean;
  logoUrl: string;
}) {
  const primary = primaryColor || '#6366f1';
  const secondary = secondaryColor || '#64748b';
  const accent = accentColor || '#f59e0b';

  return (
    <Card className={`overflow-hidden ${darkMode ? 'dark bg-slate-900' : 'bg-white'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mini Sidebar */}
        <div className={`rounded-lg p-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-6 w-6 rounded object-cover" />
            ) : (
              <div
                className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: primary }}
              >
                A
              </div>
            )}
            <span className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Minha Empresa
            </span>
          </div>
          <div className="space-y-1">
            <div
              className="flex items-center gap-2 px-2 py-1 rounded text-xs text-white"
              style={{ backgroundColor: primary }}
            >
              <Calendar className="h-3 w-3" />
              Agenda
            </div>
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Settings className="h-3 w-3" />
              Configurações
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2 flex-wrap">
          <button
            className="px-3 py-1.5 rounded text-xs font-medium text-white"
            style={{ backgroundColor: primary }}
          >
            Primário
          </button>
          <button
            className="px-3 py-1.5 rounded text-xs font-medium text-white"
            style={{ backgroundColor: secondary }}
          >
            Secundário
          </button>
          <button
            className="px-3 py-1.5 rounded text-xs font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            Destaque
          </button>
        </div>

        {/* Notificação/Badge */}
        <div className={`flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <div
            className="p-1.5 rounded-full"
            style={{ backgroundColor: `${accent}20` }}
          >
            <Bell className="h-3 w-3" style={{ color: accent }} />
          </div>
          <div className="flex-1">
            <p className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Nova reserva
            </p>
            <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Cliente confirmou agendamento
            </p>
          </div>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
            style={{ backgroundColor: secondary }}
          >
            Novo
          </span>
        </div>

        {/* Links */}
        <div className="flex gap-3 text-xs">
          <a href="#" style={{ color: primary }} className="hover:underline">
            Link primário
          </a>
          <a href="#" style={{ color: accent }} className="hover:underline">
            Link destaque
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Personalizacao() {
  const { currentVenue, refetchVenues } = useVenue();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logoInputMode, setLogoInputMode] = useState<'url' | 'file'>('url');
  const { upload, isUploading } = useFileUpload();

  // Verificar se o utilizador tem permissão de admin/superadmin
  const isAdmin = currentVenue?.role === 'admin' || currentVenue?.role === 'superadmin';

  const form = useForm<ThemeFormData>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      logo_url: currentVenue?.logo_url ?? '',
      primary_color: currentVenue?.primary_color ?? '',
      secondary_color: currentVenue?.secondary_color ?? '',
      accent_color: currentVenue?.accent_color ?? '',
      dark_mode: currentVenue?.dark_mode ?? false,
    },
  });

  // Atualizar form quando venue mudar
  useEffect(() => {
    if (currentVenue) {
      form.reset({
        logo_url: currentVenue.logo_url ?? '',
        primary_color: currentVenue.primary_color ?? '',
        secondary_color: currentVenue.secondary_color ?? '',
        accent_color: currentVenue.accent_color ?? '',
        dark_mode: currentVenue.dark_mode ?? false,
      });
    }
  }, [currentVenue, form]);

  const watchedValues = form.watch();

  const onSubmit = async (data: ThemeFormData) => {
    if (!currentVenue?.id) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('venues')
      .update({
        logo_url: data.logo_url || null,
        primary_color: data.primary_color || null,
        secondary_color: data.secondary_color || null,
        accent_color: data.accent_color || null,
        dark_mode: data.dark_mode,
      })
      .eq('id', currentVenue.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Personalização salva com sucesso!' });
      refetchVenues();
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Palette className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground mt-2">
            Apenas administradores podem acessar as configurações de personalização.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Palette className="h-8 w-8" />
            Personalização
          </h1>
          <p className="text-muted-foreground">
            Customize a aparência do sistema com suas cores e logo
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulário Principal */}
          <div className="lg:col-span-2 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Logo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Logotipo
                    </CardTitle>
                    <CardDescription>
                      Sua logo aparece na sidebar e em documentos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="logo_url"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-start gap-4">
                            <div className="relative">
                              <Avatar className="h-20 w-20 border">
                                <AvatarImage src={field.value || undefined} alt="Logo" />
                                <AvatarFallback>
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              {field.value && (
                                <button
                                  type="button"
                                  onClick={() => field.onChange('')}
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                                  title="Remover logo"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={logoInputMode === 'url' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setLogoInputMode('url')}
                                >
                                  <Link className="h-4 w-4 mr-1" />
                                  URL
                                </Button>
                                <Button
                                  type="button"
                                  variant={logoInputMode === 'file' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setLogoInputMode('file')}
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Arquivo
                                </Button>
                              </div>

                              {logoInputMode === 'url' ? (
                                <div>
                                  <FormControl>
                                    <Input
                                      placeholder="https://exemplo.com/logo.png"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription className="mt-1">
                                    Cole a URL de uma imagem
                                  </FormDescription>
                                </div>
                              ) : (
                                <div>
                                  <Label
                                    htmlFor="logo-upload"
                                    className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                                      isUploading ? 'opacity-50 pointer-events-none' : ''
                                    }`}
                                  >
                                    {isUploading ? (
                                      <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span className="text-sm">Enviando...</span>
                                      </div>
                                    ) : (
                                      <>
                                        <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                                        <span className="text-xs text-muted-foreground">
                                          PNG, JPG, GIF ou SVG (max. 5MB)
                                        </span>
                                      </>
                                    )}
                                  </Label>
                                  <Input
                                    id="logo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploading}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file || !currentVenue?.id) return;

                                      const result = await upload(file, {
                                        bucket: 'venue-logos',
                                        folder: currentVenue.id,
                                      });

                                      if (result) {
                                        field.onChange(result.url);
                                        toast({ title: 'Logo enviado!' });
                                      }
                                      e.target.value = '';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Cores */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Cores do Sistema
                    </CardTitle>
                    <CardDescription>
                      Defina as cores que serão aplicadas em toda a interface
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="primary_color"
                      render={({ field }) => (
                        <FormItem>
                          <ColorPicker
                            label="Cor Primária"
                            description="Botões principais, links, item ativo na sidebar, campos de foco"
                            value={field.value || ''}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="secondary_color"
                      render={({ field }) => (
                        <FormItem>
                          <ColorPicker
                            label="Cor Secundária"
                            description="Botões secundários, badges, tags, elementos de suporte"
                            value={field.value || ''}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accent_color"
                      render={({ field }) => (
                        <FormItem>
                          <ColorPicker
                            label="Cor de Destaque"
                            description="Notificações, alertas, indicadores de status, elementos que precisam de atenção"
                            value={field.value || ''}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Modo Escuro */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Moon className="h-5 w-5" />
                      Aparência
                    </CardTitle>
                    <CardDescription>
                      Configure o tema visual do sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="dark_mode"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2">
                              {field.value ? (
                                <Moon className="h-4 w-4" />
                              ) : (
                                <Sun className="h-4 w-4" />
                              )}
                              Modo Escuro
                            </FormLabel>
                            <FormDescription>
                              Ativa o tema escuro em toda a interface
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Personalização
                </Button>
              </form>
            </Form>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <ThemePreview
                primaryColor={watchedValues.primary_color || ''}
                secondaryColor={watchedValues.secondary_color || ''}
                accentColor={watchedValues.accent_color || ''}
                darkMode={watchedValues.dark_mode}
                logoUrl={watchedValues.logo_url || ''}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
