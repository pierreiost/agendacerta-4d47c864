import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

// Error codes that indicate permission/auth issues
const AUTH_ERROR_CODES = ['PGRST301', 'PGRST302', '401', '403', '42501'];
const SESSION_EXPIRED_MESSAGES = ['JWT expired', 'session_expired', 'invalid token'];

export interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export function isAuthError(error: SupabaseError | null): boolean {
  if (!error) return false;
  
  if (error.code && AUTH_ERROR_CODES.includes(error.code)) {
    return true;
  }
  
  const errorMessage = error.message?.toLowerCase() || '';
  return SESSION_EXPIRED_MESSAGES.some(msg => errorMessage.includes(msg.toLowerCase()));
}

export function isRLSError(error: SupabaseError | null): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const details = error.details?.toLowerCase() || '';
  
  return (
    message.includes('row-level security') ||
    message.includes('rls') ||
    details.includes('violates row-level security') ||
    error.code === '42501'
  );
}

/**
 * Hook para tratamento centralizado de erros de autenticação/RLS
 */
export function useBookingErrors() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleAuthError = (error: SupabaseError): boolean => {
    console.error('Auth/RLS error:', error);
    
    if (isAuthError(error)) {
      toast({
        title: 'Sessão expirada',
        description: 'Sua sessão expirou. Por favor, faça login novamente.',
        variant: 'destructive',
      });
      signOut().then(() => navigate('/auth'));
      return true;
    }
    
    if (isRLSError(error)) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar estes dados.',
        variant: 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      return true;
    }
    
    return false;
  };

  const shouldRetry = (error: unknown, failureCount: number): boolean => {
    const err = error as SupabaseError;
    if (isAuthError(err) || isRLSError(err)) {
      return false;
    }
    return failureCount < 3;
  };

  return {
    handleAuthError,
    shouldRetry,
    isAuthError,
    isRLSError,
  };
}
