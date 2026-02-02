-- 1. Criar enum de categoria de despesa
CREATE TYPE expense_category AS ENUM (
  'material', 'salary', 'rent', 'utilities', 
  'maintenance', 'marketing', 'other'
);

-- 2. Criar tabela expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method payment_method,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  supplier TEXT,
  notes TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Criar tabela role_permissions  
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id, role, module)
);

-- 4. Índices para performance
CREATE INDEX idx_expenses_venue_id ON public.expenses(venue_id);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_is_paid ON public.expenses(is_paid);
CREATE INDEX idx_role_permissions_venue_role ON public.role_permissions(venue_id, role);

-- 5. Trigger para updated_at em expenses
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Trigger para updated_at em role_permissions
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS para expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view venue expenses"
ON public.expenses FOR SELECT
USING (public.is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Admins and managers can insert expenses"
ON public.expenses FOR INSERT
WITH CHECK (
  public.is_venue_admin(auth.uid(), venue_id) OR 
  EXISTS (
    SELECT 1 FROM public.venue_members 
    WHERE venue_id = expenses.venue_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update expenses"
ON public.expenses FOR UPDATE
USING (
  public.is_venue_admin(auth.uid(), venue_id) OR 
  EXISTS (
    SELECT 1 FROM public.venue_members 
    WHERE venue_id = expenses.venue_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can delete expenses"
ON public.expenses FOR DELETE
USING (
  public.is_venue_admin(auth.uid(), venue_id) OR 
  EXISTS (
    SELECT 1 FROM public.venue_members 
    WHERE venue_id = expenses.venue_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- 8. RLS para role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions FOR ALL
USING (public.is_venue_admin(auth.uid(), venue_id));

CREATE POLICY "Members can view role permissions"
ON public.role_permissions FOR SELECT
USING (public.is_venue_member(auth.uid(), venue_id));

-- 9. Função para verificar permissão específica (security definer)
CREATE OR REPLACE FUNCTION public.check_permission(
  _user_id UUID,
  _venue_id UUID,
  _module TEXT,
  _action TEXT -- 'view', 'create', 'edit', 'delete'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _has_permission BOOLEAN;
BEGIN
  -- Superadmin sempre tem acesso
  IF public.is_superadmin(_user_id) THEN
    RETURN true;
  END IF;

  -- Obter role do usuário na venue
  SELECT role INTO _role
  FROM public.venue_members
  WHERE user_id = _user_id AND venue_id = _venue_id;
  
  IF _role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admin sempre tem acesso total
  IF _role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Verificar permissão específica na tabela role_permissions
  SELECT 
    CASE _action
      WHEN 'view' THEN can_view
      WHEN 'create' THEN can_create
      WHEN 'edit' THEN can_edit
      WHEN 'delete' THEN can_delete
      ELSE false
    END INTO _has_permission
  FROM public.role_permissions 
  WHERE venue_id = _venue_id 
    AND role = _role 
    AND module = _module;
  
  -- Se não encontrou configuração específica, usar padrões por role
  IF _has_permission IS NULL THEN
    -- Padrões para manager
    IF _role = 'manager' THEN
      RETURN _action IN ('view', 'create', 'edit') 
        AND _module NOT IN ('equipe', 'configuracoes');
    END IF;
    
    -- Padrões para staff
    IF _role = 'staff' THEN
      RETURN _action = 'view' 
        AND _module IN ('dashboard', 'agenda', 'clientes', 'produtos');
    END IF;
    
    RETURN false;
  END IF;
  
  RETURN _has_permission;
END;
$$;

-- 10. Função helper para obter role do usuário na venue
CREATE OR REPLACE FUNCTION public.get_user_venue_role(
  _user_id UUID,
  _venue_id UUID
)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.venue_members 
  WHERE user_id = _user_id AND venue_id = _venue_id
  LIMIT 1;
$$;