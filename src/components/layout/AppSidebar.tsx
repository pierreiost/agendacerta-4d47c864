// src/components/layout/AppSidebar.tsx
import { useEffect, useState } from "react";
import {
  Calendar,
  FileText,
  MapPin,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Users,
  Home,
  Shield,
  Globe,
  Scissors,
  Moon,
  Sun,
  DollarSign,
  HelpCircle,
  LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useVenue } from "@/contexts/VenueContext";
import { usePermissions, type Module } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

interface MenuItem {
  title: string;
  href: string;
  icon: LucideIcon;
  module?: Module;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currentVenue, venues, setCurrentVenue } = useVenue();
  const { getPermission, isSuperAdmin: permIsSuperAdmin } = usePermissions();

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  // Check if venue is on max plan
  const isMaxPlan = currentVenue?.plan_type === 'max';
  
  // Check venue segment for conditional menu items
  const venueSegment = (currentVenue as { segment?: string })?.segment;
  const isServiceVenue = venueSegment && (venueSegment === 'beauty' || venueSegment === 'health');

  // Check if user is superadmin from database
  const { data: isSuperAdmin } = useQuery({
    queryKey: ['is-superadmin-sidebar', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc('is_superadmin', { _user_id: user.id });
      if (error) return false;
      return data;
    },
    enabled: !!user,
  });

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const getUserInitials = () => {
    if (!user?.user_metadata?.name) return "U";
    const names = user.user_metadata.name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const getVenueInitials = (name: string) => {
    if (!name) return "V";
    const words = name.split(" ");
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Build menu items based on whether user is superadmin or regular user
  const allMenuGroups: MenuGroup[] = isSuperAdmin
    ? [
        // SuperAdmin specific menu
        {
          label: "PRINCIPAL",
          items: [
            { title: "Dashboard", href: "/", icon: Home, module: "dashboard" as Module },
          ],
        },
        {
          label: "ADMINISTRAÇÃO",
          items: [
            { title: "Super Admin", href: "/superadmin", icon: Shield },
            { title: "Clientes", href: "/clientes", icon: Users, module: "clientes" as Module },
            { title: "Relatórios", href: "/relatorios", icon: BarChart3, module: "relatorios" as Module },
          ],
        },
      ]
    : [
        // Regular venue user menu
        {
          label: "PRINCIPAL",
          items: [
            { title: "Dashboard", href: "/", icon: Home, module: "dashboard" as Module },
            { title: "Agenda", href: "/agenda", icon: Calendar, module: "agenda" as Module },
          ],
        },
        {
          label: "OPERACIONAL",
          items: [{ title: "Ordens de Serviço", href: "/ordens-servico", icon: FileText, module: "ordens_servico" as Module }],
        },
        {
          label: "CADASTROS",
          items: [
            { title: "Clientes", href: "/clientes", icon: Users, module: "clientes" as Module },
            ...(isServiceVenue 
              ? [{ title: "Serviços", href: "/servicos", icon: Scissors, module: "servicos" as Module }]
              : [{ title: "Espaços", href: "/espacos", icon: MapPin, module: "espacos" as Module }]
            ),
            { title: "Produtos", href: "/produtos", icon: Package, module: "produtos" as Module },
          ],
        },
        {
          label: "GESTÃO",
          items: [
            { title: "Financeiro", href: "/financeiro", icon: DollarSign, module: "financeiro" as Module },
            { title: "Relatórios", href: "/relatorios", icon: BarChart3, module: "relatorios" as Module },
            ...(isMaxPlan ? [
              { title: "Página Pública", href: "/pagina-publica", icon: Globe, module: "pagina_publica" as Module },
            ] : []),
            { title: "Configurações", href: "/configuracoes", icon: Settings, module: "configuracoes" as Module },
          ],
        },
        {
          label: "SUPORTE",
          items: [
            { title: "Ajuda", href: "/ajuda", icon: HelpCircle },
          ],
        },
      ];

  // Filter menu items by permission (non-superadmin/admin need canView permission)
  const menuGroups: MenuGroup[] = allMenuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Items without module are always visible (e.g., Super Admin)
      if (!item.module) return true;
      // Check permission
      const perm = getPermission(item.module);
      return perm.canView;
    }),
  })).filter(group => group.items.length > 0);

  return (
    <Sidebar className="border-r border-sidebar-border h-screen max-h-screen overflow-hidden">
      {/* Header - Venue Selector with logo */}
      <SidebarHeader className="border-b border-sidebar-border bg-gradient-to-br from-sidebar-accent to-sidebar-background p-3 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-lg p-2 transition-all hover:bg-sidebar-accent active:scale-[0.98]">
              {/* Logo ou Ícone da Venue */}
              {currentVenue?.logo_url ? (
                <Avatar className="size-9 rounded-lg shadow-md ring-2 ring-brand/30">
                  <AvatarImage 
                    src={currentVenue.logo_url} 
                    alt={currentVenue.name} 
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-lg bg-brand text-brand-foreground font-semibold text-sm">
                    {getVenueInitials(currentVenue.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-md ring-2 ring-brand/30">
                  <Building2 className="size-4" />
                </div>
              )}
              <div className="flex flex-1 flex-col text-left min-w-0">
                <span className="truncate text-xs font-semibold text-sidebar-foreground">
                  {currentVenue?.name || "Selecione..."}
                </span>
                <span className="text-[10px] text-sidebar-foreground/60">{venues?.length || 0} locais</span>
              </div>
              <ChevronDown className="size-4 text-sidebar-foreground/60 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            {venues?.map((venue) => (
              <DropdownMenuItem
                key={venue.id}
                onClick={() => setCurrentVenue(venue)}
                className={cn("cursor-pointer", currentVenue?.id === venue.id && "bg-brand/10 font-semibold text-brand-600")}
              >
                <div className="flex items-center gap-2">
                  {venue.logo_url ? (
                    <Avatar className="size-5 rounded">
                      <AvatarImage src={venue.logo_url} alt={venue.name} className="object-cover" />
                      <AvatarFallback className="rounded bg-brand/20 text-brand text-[10px]">
                        {getVenueInitials(venue.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Building2 className="size-4" />
                  )}
                  <span>{venue.name}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      {/* Navigation - Compacto com scroll invisível */}
      <SidebarContent className="p-2 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {menuGroups.map((group, groupIdx) => (
          <SidebarGroup key={groupIdx} className="mb-1">
            <SidebarGroupLabel className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-0.5">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(
                          "min-h-[36px] md:min-h-[32px] rounded-lg px-2 py-2 md:py-1.5",
                          "transition-all duration-200 active:scale-[0.98]",
                          active && [
                            "bg-gradient-to-r from-brand/20 to-brand/10",
                            "text-brand font-semibold",
                            "border-l-3 border-brand pl-[8px]",
                            "shadow-sm shadow-brand/10",
                          ],
                          !active && "hover:bg-sidebar-accent"
                        )}
                      >
                        <Link to={item.href} className="flex items-center gap-2">
                          <Icon
                            className={cn(
                              "size-4 flex-shrink-0 transition-transform",
                              active ? "text-brand scale-105" : "text-sidebar-foreground/70"
                            )}
                          />
                          <span className="truncate text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer - Theme Toggle & User Menu - Compacto */}
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar-accent/30 p-2 space-y-1 flex-shrink-0">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg p-2 transition-all",
            "hover:bg-sidebar-accent active:scale-[0.98]",
            "text-sidebar-foreground/70 hover:text-sidebar-foreground"
          )}
          title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
        >
          {isDarkMode ? (
            <Sun className="size-4 text-amber-400" />
          ) : (
            <Moon className="size-4" />
          )}
          <span className="text-xs font-medium">
            {isDarkMode ? "Modo Claro" : "Modo Escuro"}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-lg p-2 transition-all hover:bg-sidebar-accent active:scale-[0.98] min-h-[44px]">
              <Avatar className="h-8 w-8 border-2 border-brand/40 ring-1 ring-brand/20">
                <AvatarFallback className="bg-brand text-xs font-semibold text-brand-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col text-left min-w-0">
                <span className="truncate text-xs font-semibold text-sidebar-foreground">
                  {user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário"}
                </span>
                <span className="truncate text-[10px] text-sidebar-foreground/60">{user?.email}</span>
              </div>
              <ChevronDown className="size-3 flex-shrink-0 text-sidebar-foreground/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48" align="start" side="top" sideOffset={4}>
            <DropdownMenuItem asChild className="cursor-pointer py-2 text-sm">
              <Link to="/configuracoes" className="flex items-center gap-2">
                <Settings className="size-3.5" />
                <span>Configurações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="cursor-pointer py-2 text-sm text-red-600 focus:bg-red-50 focus:text-red-600"
            >
              <LogOut className="mr-2 size-3.5" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
