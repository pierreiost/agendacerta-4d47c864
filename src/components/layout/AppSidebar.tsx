// src/components/layout/AppSidebar.tsx
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
  Palette,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useVenue } from "@/contexts/VenueContext";
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

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currentVenue, venues, setCurrentVenue } = useVenue();

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

  const menuGroups = [
    {
      label: "PRINCIPAL",
      items: [
        { title: "Dashboard", href: "/", icon: Home },
        { title: "Agenda", href: "/agenda", icon: Calendar },
      ],
    },
    {
      label: "OPERACIONAL",
      items: [{ title: "Ordens de Serviço", href: "/ordens-servico", icon: FileText }],
    },
    {
      label: "CADASTROS",
      items: [
        { title: "Clientes", href: "/clientes", icon: Users },
        { title: "Espaços", href: "/espacos", icon: MapPin },
        { title: "Produtos", href: "/produtos", icon: Package },
      ],
    },
    {
      label: "GESTÃO",
      items: [
        { title: "Relatórios", href: "/relatorios", icon: BarChart3 },
        { title: "Personalização", href: "/personalizacao", icon: Palette },
        { title: "Configurações", href: "/configuracoes", icon: Settings },
      ],
    },
  ];

  // Add SuperAdmin menu for superadmins
  if (isSuperAdmin) {
    menuGroups.push({
      label: "ADMINISTRAÇÃO",
      items: [{ title: "Super Admin", href: "/superadmin", icon: Shield }],
    });
  }

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* Header - Venue Selector with logo */}
      <SidebarHeader className="border-b border-sidebar-border bg-gradient-to-br from-sidebar-accent to-sidebar-background p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-sidebar-accent active:scale-[0.98]">
              {/* Logo ou Ícone da Venue */}
              {currentVenue?.logo_url ? (
                <Avatar className="size-11 rounded-xl shadow-md ring-2 ring-brand/30">
                  <AvatarImage 
                    src={currentVenue.logo_url} 
                    alt={currentVenue.name} 
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-xl bg-brand text-brand-foreground font-semibold">
                    {getVenueInitials(currentVenue.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-md ring-2 ring-brand/30">
                  <Building2 className="size-5" />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-0.5 text-left">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {currentVenue?.name || "Selecione..."}
                </span>
                <span className="text-xs text-sidebar-foreground/60">{venues?.length || 0} locais</span>
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

      {/* Navigation */}
      <SidebarContent className="p-3">
        {menuGroups.map((group, groupIdx) => (
          <SidebarGroup key={groupIdx}>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1">
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
                          "min-h-[48px] md:min-h-[44px] rounded-xl px-3 py-3.5 md:py-3",
                          "transition-all duration-200 active:scale-[0.98]",
                          active && [
                            "bg-gradient-to-r from-brand/20 to-brand/10",
                            "text-brand font-semibold",
                            "border-l-4 border-brand pl-[10px]",
                            "shadow-sm shadow-brand/10",
                          ],
                          !active && "hover:bg-sidebar-accent"
                        )}
                      >
                        <Link to={item.href} className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              "size-5 flex-shrink-0 transition-transform",
                              active ? "text-brand scale-110" : "text-sidebar-foreground/70"
                            )}
                          />
                          <span className="truncate">{item.title}</span>
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

      {/* Footer - User Menu */}
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar-accent/30 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-sidebar-accent active:scale-[0.98] min-h-[56px]">
              <Avatar className="h-10 w-10 border-2 border-brand/40 ring-2 ring-brand/20">
                <AvatarFallback className="bg-brand text-sm font-semibold text-brand-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-0.5 text-left min-w-0">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário"}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">{user?.email}</span>
              </div>
              <ChevronDown className="size-4 flex-shrink-0 text-sidebar-foreground/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" side="top" sideOffset={8}>
            <DropdownMenuItem asChild className="cursor-pointer py-3">
              <Link to="/configuracoes" className="flex items-center gap-2">
                <Settings className="size-4" />
                <span>Configurações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="cursor-pointer py-3 text-red-600 focus:bg-red-50 focus:text-red-600"
            >
              <LogOut className="mr-2 size-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
