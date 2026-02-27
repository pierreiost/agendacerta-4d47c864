
-- =============================================
-- CRM Tables + Global Metrics RPC
-- =============================================

-- 1. saas_crm_columns
CREATE TABLE public.saas_crm_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saas_crm_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can manage crm columns" ON public.saas_crm_columns
  FOR ALL TO authenticated USING (public.is_superadmin(auth.uid()));

-- 2. saas_crm_leads
CREATE TABLE public.saas_crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  person_name text NOT NULL,
  company_name text NOT NULL,
  whatsapp text,
  plan text DEFAULT 'basic',
  segment text DEFAULT 'sports',
  status_id uuid NOT NULL REFERENCES public.saas_crm_columns(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saas_crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can manage crm leads" ON public.saas_crm_leads
  FOR ALL TO authenticated USING (public.is_superadmin(auth.uid()));

-- 3. Seed CRM columns
INSERT INTO public.saas_crm_columns (name, position, color) VALUES
  ('Lead/Novo', 0, '#6366f1'),
  ('Contato Feito', 1, '#3b82f6'),
  ('Em Negociação', 2, '#f59e0b'),
  ('Não Respondeu (Vácuo)', 3, '#ef4444'),
  ('Fechado/Ativo', 4, '#22c55e'),
  ('Perdido/Churn', 5, '#64748b');

-- 4. RPC get_saas_global_metrics
CREATE OR REPLACE FUNCTION public.get_saas_global_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_totals jsonb;
  v_per_venue jsonb;
  v_monthly jsonb;
BEGIN
  -- Global totals
  SELECT jsonb_build_object(
    'total_venues', (SELECT count(*) FROM venues),
    'total_bookings', (SELECT count(*) FROM bookings),
    'total_customers', (SELECT count(*) FROM customers),
    'total_service_orders', (SELECT count(*) FROM service_orders),
    'total_products', (SELECT count(*) FROM products),
    'total_services', (SELECT count(*) FROM services)
  ) INTO v_totals;

  -- Per venue metrics
  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'name'), '[]'::jsonb)
  INTO v_per_venue
  FROM (
    SELECT jsonb_build_object(
      'venue_id', v.id,
      'name', v.name,
      'segment', COALESCE(v.segment::text, 'sports'),
      'bookings', (SELECT count(*) FROM bookings b WHERE b.venue_id = v.id),
      'customers', (SELECT count(*) FROM customers c WHERE c.venue_id = v.id),
      'service_orders', (SELECT count(*) FROM service_orders so WHERE so.venue_id = v.id),
      'products', (SELECT count(*) FROM products p WHERE p.venue_id = v.id),
      'services', (SELECT count(*) FROM services s WHERE s.venue_id = v.id)
    ) as row_data
    FROM venues v
  ) sub;

  -- Monthly growth (bookings created in last 6 months)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', to_char(m.month_start, 'Mon'),
      'month_num', to_char(m.month_start, 'YYYY-MM'),
      'bookings', (
        SELECT count(*) FROM bookings
        WHERE created_at >= m.month_start
          AND created_at < m.month_start + interval '1 month'
      ),
      'venues', (
        SELECT count(*) FROM venues
        WHERE created_at >= m.month_start
          AND created_at < m.month_start + interval '1 month'
      )
    ) ORDER BY m.month_start
  ), '[]'::jsonb)
  INTO v_monthly
  FROM (
    SELECT generate_series(
      date_trunc('month', now() - interval '5 months'),
      date_trunc('month', now()),
      interval '1 month'
    )::date as month_start
  ) m;

  v_result := jsonb_build_object(
    'totals', v_totals,
    'per_venue', v_per_venue,
    'monthly_growth', v_monthly
  );

  RETURN v_result;
END;
$$;
