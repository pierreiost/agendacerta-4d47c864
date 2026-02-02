import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Eye, EyeOff, Check, X, Calendar, BarChart3, Users, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.svg';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RateLimitResponse {
  allowed: boolean;
  attemptsRemaining: number;
  lockedUntil: string | null;
  message?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function checkRateLimit(email: string): Promise<RateLimitResponse> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rate-limit-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'check' }),
    });
    return await response.json();
  } catch {
    // If rate limit check fails, allow login attempt
    return { allowed: true, attemptsRemaining: 5, lockedUntil: null };
  }
}

async function recordLoginAttempt(email: string, success: boolean): Promise<RateLimitResponse> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rate-limit-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: success ? 'record_success' : 'record_failure' }),
    });
    return await response.json();
  } catch {
    return { allowed: true, attemptsRemaining: 5, lockedUntil: null };
  }
}

const getPasswordStrength = (password: string) => ({
  hasMinLength: password.length >= 8,
  hasUpperCase: /[A-Z]/.test(password),
  hasNumber: /[0-9]/.test(password),
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});

const loginBenefits = [
  { icon: Calendar, text: 'Agenda online 24/7' },
  { icon: BarChart3, text: 'Dashboard em tempo real' },
  { icon: Users, text: 'Gestão completa de clientes' },
  { icon: FileText, text: 'Relatórios e exportações' },
];

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitResponse | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = mode !== 'signup' || (
    passwordStrength.hasMinLength &&
    passwordStrength.hasUpperCase &&
    passwordStrength.hasNumber &&
    passwordStrength.hasSpecialChar &&
    passwordsMatch &&
    confirmPassword.length > 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password requirements for signup
    if (mode === 'signup') {
      if (!passwordStrength.hasMinLength || !passwordStrength.hasUpperCase || 
          !passwordStrength.hasNumber || !passwordStrength.hasSpecialChar) {
        toast({
          title: 'Senha fraca',
          description: 'A senha não atende aos requisitos mínimos de segurança.',
          variant: 'destructive',
        });
        return;
      }
      if (!passwordsMatch) {
        toast({
          title: 'Senhas não coincidem',
          description: 'As senhas digitadas devem ser iguais.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    setLoading(true);
    setRateLimitInfo(null);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });

        if (error) throw error;

        toast({
          title: 'Email enviado!',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        });
        setMode('login');
      } else if (mode === 'login') {
        // Check rate limit before attempting login
        const rateLimitCheck = await checkRateLimit(email);
        
        if (!rateLimitCheck.allowed) {
          setRateLimitInfo(rateLimitCheck);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Record failed attempt
          const updatedRateLimit = await recordLoginAttempt(email, false);
          setRateLimitInfo(updatedRateLimit);
          throw error;
        }

        // Record successful login
        await recordLoginAttempt(email, true);
        setRateLimitInfo(null);

        toast({
          title: 'Login realizado!',
          description: 'Bem-vindo de volta.',
        });
        navigate('/');
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        toast({
          title: 'Conta criada!',
          description: 'Você já pode acessar o sistema.',
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let message = 'Ocorreu um erro. Tente novamente.';
      
      if (error.message?.includes('Invalid login credentials')) {
        message = 'Email ou senha incorretos.';
      } else if (error.message?.includes('User already registered')) {
        message = 'Este email já está cadastrado.';
      } else if (error.message?.includes('Password should be at least')) {
        message = 'A senha deve ter pelo menos 6 caracteres.';
      }

      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getHeading = () => {
    if (mode === 'forgot') return 'RECUPERAR SENHA';
    if (mode === 'login') return 'BEM-VINDO';
    return 'CRIAR CONTA';
  };

  const getSubheading = () => {
    if (mode === 'forgot') return 'Digite seu email para receber o link de recuperação';
    if (mode === 'login') return 'Entre com suas credenciais';
    return 'Preencha os dados para se cadastrar';
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 right-0 w-40 h-40 bg-white/10 rounded-full translate-x-1/2" />
        
        {/* Floating icons */}
        <div className="absolute top-20 right-20 bg-white/10 rounded-xl p-3 animate-bounce-slow">
          <Calendar className="w-6 h-6 text-white/80" />
        </div>
        <div className="absolute bottom-32 left-20 bg-white/10 rounded-xl p-3 animate-bounce-slow" style={{ animationDelay: '0.5s' }}>
          <BarChart3 className="w-6 h-6 text-white/80" />
        </div>
        <div className="absolute top-1/3 left-16 bg-white/10 rounded-xl p-3 animate-bounce-slow" style={{ animationDelay: '1s' }}>
          <Users className="w-6 h-6 text-white/80" />
        </div>
        
        {/* Logo and branding content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="bg-white rounded-3xl p-6 shadow-2xl mb-8">
            <img 
              src={logo} 
              alt="AgendaCerta Logo" 
              className="w-24 h-24 object-contain"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            AgendaCerta
          </h1>
          
          <p className="text-lg text-white/80 mb-8">
            Sistema completo de gestão e agendamento para seu negócio.
          </p>

          {/* Benefits List */}
          <div className="space-y-3 text-left w-full mb-8">
            {loginBenefits.map((benefit) => (
              <div key={benefit.text} className="flex items-center gap-3 text-white bg-white/10 rounded-lg px-4 py-3">
                <benefit.icon className="h-5 w-5 text-green-400 flex-shrink-0" />
                <span className="font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Trust Badge */}
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <span className="text-white font-semibold">+500 negócios confiam no AgendaCerta</span>
          </div>
          
          <Link 
            to="/privacy" 
            className="text-sm text-white/70 hover:text-white underline transition-colors"
          >
            Política de Privacidade
          </Link>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="bg-primary rounded-2xl p-4 mb-4">
              <img 
                src={logo} 
                alt="AgendaCerta Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-foreground">AgendaCerta</h1>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Sistema de gestão e agendamento para espaços
            </p>
          </div>

          {/* Welcome heading */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-wide">
              {getHeading()}
            </h2>
            <p className="text-muted-foreground mt-2">
              {getSubheading()}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground font-medium">
                  Nome completo
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 bg-secondary/50 border-input focus:border-primary focus:ring-primary"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-secondary/50 border-input focus:border-primary focus:ring-primary"
              />
            </div>

            {mode !== 'forgot' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 bg-secondary/50 border-input focus:border-primary focus:ring-primary pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements for Signup */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground mb-2">Requisitos da senha:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className={`flex items-center gap-2 ${passwordStrength.hasMinLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.hasMinLength ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        <span>Mínimo 8 caracteres</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordStrength.hasUpperCase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.hasUpperCase ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        <span>Uma maiúscula</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordStrength.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.hasNumber ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        <span>Um número</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordStrength.hasSpecialChar ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.hasSpecialChar ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        <span>Um especial (!@#$...)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm Password for Signup */}
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                      Confirmar senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={`h-12 bg-secondary/50 border-input focus:border-primary focus:ring-primary pr-12 ${
                          confirmPassword.length > 0 && !passwordsMatch ? 'border-destructive' : ''
                        }`}
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
                        <AlertTriangle className="h-4 w-4" />
                        As senhas não coincidem
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setMode('forgot')}
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {/* Rate limit warning */}
            {rateLimitInfo && mode === 'login' && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {!rateLimitInfo.allowed ? (
                    <>
                      Conta bloqueada temporariamente. Tente novamente{' '}
                      {rateLimitInfo.lockedUntil && (
                        <>às {new Date(rateLimitInfo.lockedUntil).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
                      )}
                      .
                    </>
                  ) : rateLimitInfo.attemptsRemaining < 5 ? (
                    <>
                      {rateLimitInfo.attemptsRemaining} tentativa{rateLimitInfo.attemptsRemaining !== 1 ? 's' : ''} restante{rateLimitInfo.attemptsRemaining !== 1 ? 's' : ''}.
                    </>
                  ) : null}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-opacity" 
              disabled={loading || (rateLimitInfo && !rateLimitInfo.allowed) || (mode === 'signup' && !isPasswordValid)}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {mode === 'forgot' ? 'ENVIAR LINK' : mode === 'login' ? 'ENTRAR' : 'CADASTRAR'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'forgot' ? (
              <button
                type="button"
                className="text-primary font-semibold hover:underline transition-all"
                onClick={() => setMode('login')}
              >
                Voltar ao login
              </button>
            ) : (
              <>
                <span className="text-muted-foreground">
                  {mode === 'login' ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
                </span>
                <button
                  type="button"
                  className="text-primary font-semibold hover:underline transition-all"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setConfirmPassword('');
                  }}
                >
                {mode === 'login' ? 'Cadastre-se' : 'Entre'}
                </button>
              </>
            )}
          </div>

          {/* Link to Pricing */}
          <div className="mt-6 text-center">
            <Link 
              to="/inicio#precos" 
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <span>Ver nossos planos</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {/* Mobile Privacy Policy Link */}
          <div className="lg:hidden mt-6 text-center">
            <Link 
              to="/privacy" 
              className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}