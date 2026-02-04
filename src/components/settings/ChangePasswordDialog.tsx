import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Eye, EyeOff, Check, X, Shield } from "lucide-react";

const getPasswordStrength = (password: string) => ({
  hasMinLength: password.length >= 8,
  hasUpperCase: /[A-Z]/.test(password),
  hasNumber: /[0-9]/.test(password),
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});

export function ChangePasswordDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isFormValid =
    currentPassword.length > 0 &&
    passwordStrength.hasMinLength &&
    passwordStrength.hasUpperCase &&
    passwordStrength.hasNumber &&
    passwordStrength.hasSpecialChar &&
    passwordsMatch &&
    confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.email) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado.",
        variant: "destructive",
      });
      return;
    }

    if (!isFormValid) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos corretamente.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Re-authenticate with current password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (authError) {
        toast({
          title: "Senha atual incorreta",
          description: "Verifique sua senha atual e tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });

      // Reset form and close dialog
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOpen(false);
    } catch (error: any) {
      console.error("Password change error:", error);
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset form when closing
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Lock className="mr-2 h-4 w-4" />
          Alterar Senha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Alterar Senha
          </DialogTitle>
          <DialogDescription>
            Digite sua senha atual e defina uma nova senha segura.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha Atual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {newPassword.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-foreground mb-2">Requisitos da senha:</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className={`flex items-center gap-1.5 ${passwordStrength.hasMinLength ? "text-green-600" : "text-muted-foreground"}`}>
                  {passwordStrength.hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordStrength.hasUpperCase ? "text-green-600" : "text-muted-foreground"}`}>
                  {passwordStrength.hasUpperCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Uma maiúscula</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordStrength.hasNumber ? "text-green-600" : "text-muted-foreground"}`}>
                  {passwordStrength.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Um número</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordStrength.hasSpecialChar ? "text-green-600" : "text-muted-foreground"}`}>
                  {passwordStrength.hasSpecialChar ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Um especial (!@#$...)</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirmNewPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`pr-10 ${confirmPassword.length > 0 && !passwordsMatch ? "border-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <X className="h-3 w-3" />
                As senhas não coincidem
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !isFormValid}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                "Alterar Senha"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
