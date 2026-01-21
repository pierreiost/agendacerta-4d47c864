// src/components/layout/AppSidebar.tsx - VERSÃO FINAL CORRETA
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

interface NavItem {
  title: string;
  href: string;
  icon: any;
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
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  // Navegação com rotas corretas do seu App.tsx
  const navigation: NavGroup[] = [
    {
      label: "Principal",
      items: [
        { title: "Dashboard", href: "/", icon: Home },
        { title: "Agenda", href: "/agenda", icon: Calendar },
      ],
    },
    {
      label: "Operacional",
      items: [{ title: "Ordens de Serviço", href: "/ordens-servico", icon: FileText }],
    },
    {
      label: "Cadastros",
      items: [
        { title: "Clientes", href: "/clientes", icon: Users },
        { title: "Espaços", href: "/espacos", icon: MapPin },
        { title: "Produtos", href: "/produtos", icon: Package },
      ],
    },
    {
      label: "Gestão",
      items: [
        { title: "Relatórios", href: "/relatorios", icon: BarChart3 },
        { title: "Configurações", href: "/configuracoes", icon: Settings },
      ],
    },
  ];

  // Se for super admin, adiciona menu
  const isSuperAdmin = user?.user_metadata?.role === "super_admin";
  if (isSuperAdmin) {
    navigation.push({
      label: "Administração",
      items: [{ title: "Super Admin", href: "/superadmin", icon: Zap }],
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
      {/* Header */}
      <SidebarHeader className="border-b bg-gradient-to-br from-primary-50 to-white dark:from-primary-950 dark:to-background">
        <SidebarMenu>
          <SidebarMenuItem>
            {!isCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-primary-100 hover:bg-primary-100/70">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary-600 text-white shadow-md">
                        <Building2 className="size-5" />
                      </div>
                      <div className="flex flex-col gap-0.5 leading-none flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate text-foreground">
                          {currentVenue?.name || "Selecione..."}
                        </span>
                        <span className="text-xs text-muted-foreground">{venues?.length || 0} locais</span>
                      </div>
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start" side="bottom" sideOffset={4}>
                  {venues?.map((venue) => (
                    <DropdownMenuItem
                      key={venue.id}
                      onClick={() => switchVenue(venue.id)}
                      className={cn("gap-2 p-3 cursor-pointer", currentVenue?.id === venue.id && "bg-primary-50")}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="size-8 rounded-md bg-primary-100 flex items-center justify-center">
                          <Building2 className="size-4 text-primary-600" />
                        </div>
                        <span className="font-medium">{venue.name}</span>
                      </div>
                      {currentVenue?.id === venue.id && <div className="size-2 rounded-full bg-primary-600" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton size="lg">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                  <Building2 className="size-4" />
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content - Menu Items */}
      <SidebarContent className="px-2 py-4">
        {navigation.map((group, groupIdx) => (
          <SidebarGroup key={groupIdx} className="mb-4">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2 px-2">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          "h-10 transition-all duration-200",
                          active && [
                            "bg-primary-100 dark:bg-primary-900",
                            "text-primary-900 dark:text-primary-50",
                            "hover:bg-primary-200",
                            "font-semibold",
                            "border-l-4 border-primary-600",
                          ],
                          !active && ["text-foreground hover:bg-accent", "hover:text-foreground", "font-medium"],
                        )}
                      >
                        <Link to={item.href} className="flex items-center gap-3 w-full">
                          <item.icon
                            className={cn("size-5 flex-shrink-0", active ? "text-primary-600" : "text-foreground/70")}
                          />
                          {!isCollapsed && <span className="truncate">{item.title}</span>}
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

      {/* Footer */}
      <SidebarFooter className="border-t bg-muted/30">
        <SidebarMenu>
          <SidebarMenuItem>
            {!isCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-accent hover:bg-accent">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-9 w-9 border-2 border-primary-200">
                        <AvatarFallback className="bg-primary-600 text-white font-semibold">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 leading-none flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate text-foreground">
                          {user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                      </div>
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start" side="top" sideOffset={4}>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/configuracoes" className="flex items-center gap-2">
                      <Settings className="size-4" />
                      <span>Configurações</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600">
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
                      <AvatarFallback className="bg-primary-600 text-white text-xs font-semibold">
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
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
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
