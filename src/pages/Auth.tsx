import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

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
        
        {/* Logo and branding content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="bg-white rounded-3xl p-6 shadow-2xl mb-8">
            <img 
              src={logo} 
              alt="Agenda Certa Logo" 
              className="w-32 h-32 object-contain"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Agenda Certa
          </h1>
          
          <p className="text-lg text-white/80 max-w-sm">
            Gestão completa para complexos esportivos e locação de espaços
          </p>
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
                alt="Agenda Certa Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Agenda Certa</h1>
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
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 bg-secondary/50 border-input focus:border-primary focus:ring-primary"
                />
              </div>
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

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-opacity" 
              disabled={loading}
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
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                >
                  {mode === 'login' ? 'Cadastre-se' : 'Entre'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
