// src/components/layout/AppSidebar.tsx - MENUS SEMPRE EXPANDIDOS
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currentVenue, venues, setCurrentVenue } = useVenue();

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

  const menuItems = [
    {
      label: "PRINCIPAL",
      items: [
        { title: "Dashboard", href: "/", icon: Home },
        { title: "Agenda", href: "/agenda", icon: Calendar },
      ],
    },
    { label: "OPERACIONAL", items: [{ title: "Ordens de Serviço", href: "/ordens-servico", icon: FileText }] },
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
        { title: "Configurações", href: "/configuracoes", icon: Settings },
      ],
    },
  ];

  const isSuperAdmin = user?.user_metadata?.role === "super_admin";
  if (isSuperAdmin) {
    menuItems.push({
      label: "ADMINISTRAÇÃO",
      items: [{ title: "Super Admin", href: "/superadmin", icon: Zap }],
    });
  }

  return (
    <Sidebar collapsible="icon">
      {/* Header com Venue Selector */}
      <SidebarHeader className="border-b bg-gradient-to-br from-primary-50 to-white p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-primary-100 transition-colors">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary-600 text-white shadow-md">
                <Building2 className="size-5" />
              </div>
              <div className="flex flex-col gap-0.5 flex-1 text-left">
                <span className="font-semibold text-sm text-foreground">{currentVenue?.name || "Selecione..."}</span>
                <span className="text-xs text-muted-foreground">{venues?.length || 0} locais</span>
              </div>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            {venues?.map((venue) => (
              <DropdownMenuItem
                key={venue.id}
                onClick={() => setCurrentVenue(venue)}
                className={cn("cursor-pointer", currentVenue?.id === venue.id && "bg-primary-50 font-semibold")}
              >
                {venue.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      {/* Menu Items - SEMPRE EXPANDIDOS */}
      <SidebarContent className="px-3 py-4">
        <div className="space-y-6">
          {menuItems.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-2">
              {/* Label do Grupo */}
              <div className="px-2">
                <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">{group.label}</span>
              </div>

              {/* Items do Grupo - SEMPRE VISÍVEIS */}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        "hover:bg-accent",
                        active && [
                          "bg-primary-100 dark:bg-primary-900",
                          "text-primary-900 dark:text-primary-50",
                          "font-semibold",
                          "border-l-4 border-primary-600",
                          "pl-[10px]",
                        ],
                        !active && ["text-foreground", "font-medium"],
                      )}
                    >
                      <Icon
                        className={cn("size-5 flex-shrink-0", active ? "text-primary-600" : "text-foreground/70")}
                      />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SidebarContent>

      {/* Footer com User Menu */}
      <SidebarFooter className="border-t bg-muted/30 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent transition-colors">
              <Avatar className="h-9 w-9 border-2 border-primary-200">
                <AvatarFallback className="bg-primary-600 text-white font-semibold text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 flex-1 text-left min-w-0">
                <span className="font-semibold text-sm truncate text-foreground">
                  {user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário"}
                </span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
              <ChevronDown className="size-4 text-muted-foreground flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" side="top" sideOffset={8}>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/configuracoes" className="flex items-center gap-2">
                <Settings className="size-4" />
                <span>Configurações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="size-4 mr-2" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
