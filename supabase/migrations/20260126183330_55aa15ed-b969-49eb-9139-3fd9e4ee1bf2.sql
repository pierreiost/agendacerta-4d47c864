-- Tabela para rastrear tentativas de login
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Índices para consultas eficientes
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip_time ON public.login_attempts (ip_address, attempted_at DESC) WHERE ip_address IS NOT NULL;

-- RLS: Tabela acessada apenas via service role (edge function)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Função para limpar tentativas antigas (mais de 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - INTERVAL '24 hours';
END;
$$;

-- Função para verificar rate limit
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  _email TEXT,
  _ip_address TEXT DEFAULT NULL,
  _max_attempts INTEGER DEFAULT 5,
  _window_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  allowed BOOLEAN,
  attempts_remaining INTEGER,
  locked_until TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_failures INTEGER;
  last_attempt TIMESTAMP WITH TIME ZONE;
  lock_duration INTERVAL;
BEGIN
  -- Contar falhas recentes para este email
  SELECT COUNT(*), MAX(attempted_at)
  INTO recent_failures, last_attempt
  FROM public.login_attempts
  WHERE login_attempts.email = LOWER(_email)
    AND success = false
    AND attempted_at > now() - (_window_minutes || ' minutes')::INTERVAL;

  -- Se excedeu o limite
  IF recent_failures >= _max_attempts THEN
    -- Calcular duração do bloqueio baseado no número de falhas
    lock_duration := (_window_minutes || ' minutes')::INTERVAL;
    
    RETURN QUERY SELECT 
      false,
      0,
      last_attempt + lock_duration;
  END IF;

  -- Login permitido
  RETURN QUERY SELECT 
    true,
    _max_attempts - recent_failures,
    NULL::TIMESTAMP WITH TIME ZONE;
END;
$$;

-- Função para registrar tentativa de login
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  _email TEXT,
  _ip_address TEXT DEFAULT NULL,
  _success BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, ip_address, success)
  VALUES (LOWER(_email), _ip_address, _success);
  
  -- Se login bem sucedido, limpar tentativas falhas anteriores
  IF _success THEN
    DELETE FROM public.login_attempts
    WHERE email = LOWER(_email)
      AND success = false;
  END IF;
END;
$$;