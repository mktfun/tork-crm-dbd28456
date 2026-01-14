
-- PHASE 1: Fix Critical Role-Based Access Control Vulnerability
-- Remove the current unsafe policy that allows users to update their own role
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;

-- Create a new policy that prevents users from updating their role
CREATE POLICY "Usuários podem atualizar seu próprio perfil (exceto role)" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    -- Prevent role changes unless user is admin
    (OLD.role = NEW.role OR get_user_role(auth.uid()) = 'admin')
  );

-- Create admin-only policy for role management
CREATE POLICY "Admins podem gerenciar roles de usuários" 
  ON public.profiles 
  FOR UPDATE 
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- PHASE 2: Harden Database Functions Security
-- Update handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', 'Usuário'),
    NEW.email,
    'corretor'
  );
  RETURN NEW;
END;
$$;

-- Update get_user_role function with proper search_path
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role_output TEXT;
BEGIN
  SELECT role INTO user_role_output FROM public.profiles WHERE id = user_id;
  RETURN user_role_output;
END;
$$;

-- Update handle_updated_at function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- PHASE 3: Add Role Change Audit Trail
CREATE TABLE IF NOT EXISTS public.role_change_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    old_role user_role NOT NULL,
    new_role user_role NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reason TEXT
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view role change audit
CREATE POLICY "Admins podem ver auditoria de mudanças de role"
ON public.role_change_audit
FOR SELECT
USING (get_user_role(auth.uid()) = 'admin');

-- Create trigger function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Only log if role actually changed
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO public.role_change_audit (
            user_id, 
            old_role, 
            new_role, 
            changed_by
        ) VALUES (
            NEW.id,
            OLD.role,
            NEW.role,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for role change logging
DROP TRIGGER IF EXISTS log_profile_role_changes ON public.profiles;
CREATE TRIGGER log_profile_role_changes
    AFTER UPDATE ON public.profiles
    FOR EACH ROW 
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION public.log_role_changes();
