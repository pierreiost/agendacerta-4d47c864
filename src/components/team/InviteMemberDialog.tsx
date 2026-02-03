import { useState } from "react";
import { Search, UserPlus, Loader2, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { AppRole } from "@/hooks/usePermissions";

interface FoundUser {
  user_id: string;
  full_name: string;
}

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "manager", label: "Gerente" },
  { value: "staff", label: "Funcionário" },
];

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("staff");
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const resetState = () => {
    setEmail("");
    setSelectedRole("staff");
    setFoundUser(null);
    setSearchError(null);
    setHasSearched(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handleSearch = async () => {
    if (!email.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setFoundUser(null);
    setHasSearched(true);

    try {
      // Search in profiles table - we need to find user by checking auth metadata
      // Since profiles doesn't have email, we'll use an edge function or RPC
      // For now, let's try a workaround: search users who have this email in auth
      
      // First, check if user is already a member
      if (currentVenue?.id) {
        const { data: existingMembers } = await supabase
          .from("venue_members")
          .select("user_id")
          .eq("venue_id", currentVenue.id);

        const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);

        // Search in profiles - we'll need to match by full_name or use a lookup
        // Since we can't directly query auth.users, we'll search by name
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .ilike("full_name", `%${email}%`)
          .limit(1);

        if (error) throw error;

        if (profiles && profiles.length > 0) {
          const profile = profiles[0];
          
          if (existingUserIds.has(profile.user_id)) {
            setSearchError("Este usuário já é membro da equipe");
          } else {
            setFoundUser(profile);
          }
        } else {
          setSearchError("Nenhum usuário encontrado. O usuário precisa ter uma conta no sistema.");
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Erro ao buscar usuário");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async () => {
    if (!foundUser || !currentVenue?.id) return;

    setIsAdding(true);

    try {
      const { error } = await supabase
        .from("venue_members")
        .insert({
          venue_id: currentVenue.id,
          user_id: foundUser.user_id,
          role: selectedRole,
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Usuário já é membro",
            description: "Este usuário já faz parte da equipe",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Membro adicionado com sucesso!" });
        queryClient.invalidateQueries({ queryKey: ["team-members", currentVenue.id] });
        handleOpenChange(false);
      }
    } catch (error) {
      console.error("Add member error:", error);
      toast({
        title: "Erro ao adicionar membro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Membro
          </DialogTitle>
          <DialogDescription>
            Busque por nome para adicionar um usuário existente à equipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar por nome</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome do usuário..."
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setHasSearched(false);
                    setFoundUser(null);
                    setSearchError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || !email.trim()}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buscar"
                )}
              </Button>
            </div>
          </div>

          {/* Search result */}
          {hasSearched && (
            <div className="min-h-[80px]">
              {searchError ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <p className="text-sm text-destructive">{searchError}</p>
                </div>
              ) : foundUser ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{foundUser.full_name[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{foundUser.full_name}</p>
                    <p className="text-sm text-muted-foreground">Usuário encontrado</p>
                  </div>
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
              ) : null}
            </div>
          )}

          {/* Role selection */}
          {foundUser && (
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMember} disabled={!foundUser || isAdding}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar à Equipe
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
