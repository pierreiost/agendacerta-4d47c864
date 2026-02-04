import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Loader2,
  ArrowLeft,
  Mail,
  KeyRound,
  Lock,
  CheckCircle,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";

type Step = "email" | "code" | "password" | "success";

interface ForgotPasswordFlowProps {
  onBack: () => void;
}

const getPasswordStrength = (password: string) => ({
  hasMinLength: password.length >= 8,
  hasUpperCase: /[A-Z]/.test(password),
  hasNumber: /[0-9]/.test(password),
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});

export function ForgotPasswordFlow({ onBack }: ForgotPasswordFlowProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isPasswordValid =
    passwordStrength.hasMinLength &&
    passwordStrength.hasUpperCase &&
    passwordStrength.hasNumber &&
    passwordStrength.hasSpecialChar &&
    passwordsMatch &&
    confirmPassword.length > 0;

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        // Check if user doesn't exist
        if (error.message.includes("Signups not allowed")) {
          toast({
            title: "Email não encontrado",
            description: "Não existe uma conta com este email.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Código enviado!",
        description: "Verifique seu email e digite o código de 6 dígitos.",
      });
      setStep("code");
      setResendTimer(60);
    } catch (error: any) {
      console.error("Send OTP error:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar código. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Código verificado!",
        description: "Agora defina sua nova senha.",
      });
      setStep("password");
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      let message = "Código inválido ou expirado. Tente novamente.";
      if (error.message?.includes("expired")) {
        message = "Código expirado. Solicite um novo código.";
      }
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isPasswordValid) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      // Sign out after password change to force re-login
      await supabase.auth.signOut();

      setStep("success");
    } catch (error: any) {
      console.error("Update password error:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    await handleSendCode();
  };

  const renderStep = () => {
    switch (step) {
      case "email":
        return (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Recuperar Senha</h2>
              <p className="text-sm text-muted-foreground">
                Digite seu email para receber o código de verificação
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <Button type="submit" className="w-full h-12" disabled={loading || !email}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Código"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para login
            </Button>
          </form>
        );

      case "code":
        return (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Digite o Código</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um código de 6 dígitos para
                <br />
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                className="gap-2"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar Código"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendTimer > 0 || loading}
                className={`text-sm ${
                  resendTimer > 0
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-primary hover:underline"
                }`}
              >
                {resendTimer > 0
                  ? `Reenviar código em ${resendTimer}s`
                  : "Reenviar código"}
              </button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("email");
                setOtp("");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </form>
        );

      case "password":
        return (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Nova Senha</h2>
              <p className="text-sm text-muted-foreground">
                Defina uma nova senha segura para sua conta
              </p>
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
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {newPassword.length > 0 && (
              <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground mb-2">Requisitos da senha:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={`flex items-center gap-2 ${passwordStrength.hasMinLength ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.hasMinLength ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.hasUpperCase ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.hasUpperCase ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <span>Uma maiúscula</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.hasNumber ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.hasNumber ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <span>Um número</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.hasSpecialChar ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.hasSpecialChar ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <span>Um especial (!@#$...)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`h-12 pr-10 ${confirmPassword.length > 0 && !passwordsMatch ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <X className="h-4 w-4" />
                  As senhas não coincidem
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={loading || !isPasswordValid}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Redefinir Senha"
              )}
            </Button>
          </form>
        );

      case "success":
        return (
          <div className="space-y-5 text-center">
            <div className="flex items-center justify-center">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Senha Redefinida!</h2>
              <p className="text-sm text-muted-foreground">
                Sua senha foi alterada com sucesso.
                <br />
                Faça login com sua nova senha.
              </p>
            </div>

            <Button className="w-full h-12" onClick={onBack}>
              Ir para Login
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {renderStep()}
    </div>
  );
}
