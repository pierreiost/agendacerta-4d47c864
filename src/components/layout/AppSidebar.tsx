import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useVenue } from '@/contexts/VenueContext';
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Check,
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { title: 'Agenda', icon: Calendar, path: '/agenda' },
  { title: 'Espaços', icon: MapPin, path: '/espacos' },
  { title: 'Produtos', icon: Package, path: '/produtos' },
  { title: 'Relatórios', icon: BarChart3, path: '/relatorios' },
  { title: 'Configurações', icon: Settings, path: '/configuracoes' },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { venues, currentVenue, setCurrentVenue } = useVenue();

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Calendar className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">Agenda Certa</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestão de Reservas</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Venue Selector */}
        {venues.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center justify-between rounded-lg bg-sidebar-accent p-3 text-left transition-colors hover:bg-sidebar-accent/80">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-sidebar-foreground/60" />
                      <span className="text-sm font-medium text-sidebar-foreground">
                        {currentVenue?.name || 'Selecione'}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Suas unidades</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {venues.map((venue) => (
                    <DropdownMenuItem
                      key={venue.id}
                      onClick={() => setCurrentVenue(venue)}
                      className="flex items-center justify-between"
                    >
                      <span>{venue.name}</span>
                      {currentVenue?.id === venue.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-sidebar-foreground">
                  {user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-sidebar-foreground/60">{user?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
