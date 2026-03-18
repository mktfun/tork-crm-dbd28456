
-- Drop and recreate is_admin with correct parameter name
DROP FUNCTION IF EXISTS public.is_admin(uuid);

CREATE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin'
  );
$$;

-- Create organization_payments table (columns on brokerages already added)
CREATE TABLE IF NOT EXISTS public.organization_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brokerage_id integer NOT NULL REFERENCES public.brokerages(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  period_added text NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'paid',
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for brokerages - admin update policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'brokerages' AND policyname = 'Admins can update all brokerages'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update all brokerages" ON public.brokerages FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()))';
  END IF;
END $$;

-- RLS for organization_payments
ALTER TABLE public.organization_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organization_payments' AND policyname = 'Admins can select payments'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can select payments" ON public.organization_payments FOR SELECT TO authenticated USING (public.is_admin(auth.uid()))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organization_payments' AND policyname = 'Admins can insert payments'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can insert payments" ON public.organization_payments FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()))';
  END IF;
END $$;
