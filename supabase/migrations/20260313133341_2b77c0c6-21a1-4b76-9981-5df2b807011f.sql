
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(_email text, _ip_address text DEFAULT NULL::text, _max_attempts integer DEFAULT 5, _window_minutes integer DEFAULT 15)
 RETURNS TABLE(allowed boolean, attempts_remaining integer, locked_until timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  recent_failures INTEGER;
  last_attempt TIMESTAMP WITH TIME ZONE;
  lock_duration INTERVAL;
BEGIN
  -- Count recent failures scoped to email + IP pair
  SELECT COUNT(*), MAX(attempted_at)
  INTO recent_failures, last_attempt
  FROM public.login_attempts
  WHERE login_attempts.email = LOWER(_email)
    AND success = false
    AND attempted_at > now() - (_window_minutes || ' minutes')::INTERVAL
    AND (_ip_address IS NULL OR login_attempts.ip_address = _ip_address);

  -- If exceeded the limit
  IF recent_failures >= _max_attempts THEN
    lock_duration := (_window_minutes || ' minutes')::INTERVAL;
    
    RETURN QUERY SELECT 
      false,
      0,
      last_attempt + lock_duration;
    RETURN;
  END IF;

  -- Login allowed
  RETURN QUERY SELECT 
    true,
    _max_attempts - recent_failures,
    NULL::TIMESTAMP WITH TIME ZONE;
END;
$function$;
