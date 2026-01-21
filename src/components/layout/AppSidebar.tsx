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
  ChevronRight,
  Home,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useVenue } from "@/contexts/VenueContext";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: string;
  color?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AppSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentVenue, venues, switchVenue } = useVenue();
  const { state } = useSidebar();

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  // Navegação organizada por grupos
  const navigation: NavGroup[] = [
    {
      label: "Principal",
      items: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: Home,
          color: "text-primary-600",
        },
        {
          title: "Agenda",
          href: "/agenda",
          icon: Calendar,
          color: "text-blue-600",
        },
      ],
    },
    {
      label: "Operacional",
      items: [
        {
          title: "Ordens de Serviço",
          href: "/ordem-servico",
          icon: FileText,
          color: "text-orange-600",
        },
      ],
    },
    {
      label: "Cadastros",
      items: [
        {
          title: "Espaços",
          href: "/espacos",
          icon: MapPin,
          color: "text-green-600",
        },
        {
          title: "Produtos",
          href: "/produtos",
          icon: Package,
          color: "text-purple-600",
        },
      ],
    },
    {
      label: "Gestão",
      items: [
        {
          title: "Relatórios",
          href: "/relatorios",
          icon: BarChart3,
          color: "text-indigo-600",
        },
        {
          title: "Configurações",
          href: "/configuracoes",
          icon: Settings,
          color: "text-slate-600",
        },
      ],
    },
  ];

  // Se for super admin, adiciona menu
  const isSuperAdmin = user?.user_metadata?.role === "super_admin";
  if (isSuperAdmin) {
    navigation.push({
      label: "Administração",
      items: [
        {
          title: "Super Admin",
          href: "/super-admin",
          icon: Zap,
          color: "text-amber-600",
        },
      ],
    });
  }

  const getUserInitials = () => {
    if (!user?.user_metadata?.name) return "U";
    const names = user.user_metadata.name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      {/* Header - Logo e Seletor de Venue */}
      <SidebarHeader className="border-b bg-gradient-to-br from-primary-50 to-white dark:from-primary-950 dark:to-background">
        <SidebarMenu>
          <SidebarMenuItem>
            {!isCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-primary-100 hover:bg-primary-100/70 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary-600 text-primary-foreground shadow-md">
                        <Building2 className="size-5" />
                      </div>
                      <div className="flex flex-col gap-0.5 leading-none flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate">{currentVenue?.name || "Selecione..."}</span>
                        <span className="text-xs text-muted-foreground">
                          {venues?.length || 0} {venues?.length === 1 ? "local" : "locais"}
                        </span>
                      </div>
                      <ChevronDown className="size-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  {venues?.map((venue) => (
                    <DropdownMenuItem
                      key={venue.id}
                      onClick={() => switchVenue(venue.id)}
                      className={cn(
                        "gap-2 p-3 cursor-pointer",
                        currentVenue?.id === venue.id && "bg-primary-50 dark:bg-primary-950",
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="size-8 rounded-md bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <Building2 className="size-4 text-primary-600" />
                        </div>
                        <span className="font-medium">{venue.name}</span>
                      </div>
                      {currentVenue?.id === venue.id && <div className="size-2 rounded-full bg-primary-600" />}
                    </DropdownMenuItem>
                  ))}
                  {venues && venues.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum local disponível</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary-600 text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navegação Principal */}
      <SidebarContent className="px-2 py-4">
        {navigation.map((group, groupIdx) => (
          <SidebarGroup key={groupIdx}>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(
                          "relative group transition-all duration-200",
                          active && [
                            "bg-primary-100 dark:bg-primary-950",
                            "text-primary-900 dark:text-primary-100",
                            "hover:bg-primary-200 dark:hover:bg-primary-900",
                            "font-semibold",
                            "shadow-sm",
                          ],
                          !active && ["hover:bg-accent", "text-muted-foreground", "hover:text-foreground"],
                        )}
                      >
                        <Link to={item.href} className="flex items-center gap-3 w-full">
                          {/* Barra de destaque quando ativo */}
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-r-full" />
                          )}

                          {/* Ícone */}
                          <div
                            className={cn(
                              "flex items-center justify-center transition-all",
                              active ? item.color : "text-muted-foreground group-hover:text-foreground",
                            )}
                          >
                            <item.icon className={cn("transition-all", active ? "size-5" : "size-5")} />
                          </div>

                          {/* Texto */}
                          {!isCollapsed && (
                            <div className="flex items-center justify-between flex-1">
                              <span>{item.title}</span>
                              {item.badge && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-600 text-white">
                                  {item.badge}
                                </span>
                              )}
                              {active && <ChevronRight className="size-4 text-primary-600" />}
                            </div>
                          )}
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
      <SidebarFooter className="border-t bg-gradient-to-br from-muted/30 to-background">
        <SidebarMenu>
          <SidebarMenuItem>
            {!isCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-accent hover:bg-accent transition-all">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-9 w-9 border-2 border-primary-200">
                        <AvatarFallback className="bg-primary-600 text-white font-semibold">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 leading-none flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate">
                          {user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                      </div>
                      <ChevronDown className="size-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                  align="start"
                  side="top"
                  sideOffset={4}
                >
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/configuracoes" className="flex items-center gap-2">
                      <Settings className="size-4" />
                      <span>Configurações</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-error-600 focus:text-error-600 focus:bg-error-50"
                  >
                    <LogOut className="size-4 mr-2" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <Avatar className="h-8 w-8 border-2 border-primary-200">
                      <AvatarFallback className="bg-primary-600 text-white font-semibold text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold">{user?.user_metadata?.name || "Usuário"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/configuracoes">
                      <Settings className="size-4 mr-2" />
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-error-600">
                    <LogOut className="size-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
