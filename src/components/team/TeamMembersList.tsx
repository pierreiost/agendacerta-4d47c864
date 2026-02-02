import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Settings2, Trash2, Crown, Shield } from "lucide-react";
import { useTeamMembers, type TeamMember } from "@/hooks/useTeamMembers";
import { RolePermissionsDialog } from "./RolePermissionsDialog";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/hooks/usePermissions";

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
  { value: "staff", label: "Funcionário" },
];

const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Super Admin",
  admin: "Administrador",
  manager: "Gerente",
  staff: "Funcionário",
};

export function TeamMembersList() {
  const { user } = useAuth();
  const { members, isLoading, updateRole, isUpdatingRole, removeMember, isRemovingMember } = useTeamMembers();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const handleRoleChange = (member: TeamMember, newRole: AppRole) => {
    // Prevent changing own role or admin roles
    if (member.user_id === user?.id || member.role === "admin" || member.role === "superadmin") {
      return;
    }
    updateRole({ memberId: member.id, newRole });
  };

  const handleOpenPermissions = (member: TeamMember) => {
    setSelectedMember(member);
    setPermissionsDialogOpen(true);
  };

  const handleRemoveMember = () => {
    if (memberToRemove) {
      removeMember(memberToRemove.id);
      setMemberToRemove(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Shield className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold">Nenhum membro na equipe</h3>
        <p className="text-muted-foreground mt-1 text-sm max-w-sm">
          Convide membros para ajudar a gerenciar a unidade
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membro</TableHead>
            <TableHead>Função</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isCurrentUser = member.user_id === user?.id;
            const isAdmin = member.role === "admin" || member.role === "superadmin";
            const canChangeRole = !isCurrentUser && !isAdmin;
            const canRemove = !isCurrentUser && !isAdmin;
            const memberName = member.display_name || member.profile?.full_name || "Membro";

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                      <AvatarFallback>{memberName[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{memberName}</p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">Você</Badge>
                        )}
                        {isAdmin && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      {member.profile?.phone && (
                        <p className="text-xs text-muted-foreground">{member.profile.phone}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canChangeRole ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member, value as AppRole)}
                      disabled={isUpdatingRole}
                    >
                      <SelectTrigger className="w-[150px]">
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
                  ) : (
                    <Badge variant={isAdmin ? "default" : "secondary"}>
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenPermissions(member)}
                      title="Configurar permissões"
                    >
                      <Settings2 className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Permissões</span>
                    </Button>
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMemberToRemove(member)}
                        className="text-destructive hover:text-destructive"
                        title="Remover membro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Permissions Dialog */}
      <RolePermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        member={selectedMember}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover <strong>{memberToRemove?.display_name || memberToRemove?.profile?.full_name}</strong> da equipe.
              O usuário perderá acesso a esta unidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemovingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
