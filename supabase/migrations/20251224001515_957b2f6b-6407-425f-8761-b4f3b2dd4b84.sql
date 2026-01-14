-- =============================================
-- CRM MODULE: Database Schema
-- =============================================

-- 1. CRM Settings table (per-user Chatwoot credentials)
CREATE TABLE public.crm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chatwoot_url text,
  chatwoot_api_key text,
  chatwoot_account_id text,
  chatwoot_webhook_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS for crm_settings
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own CRM settings"
  ON public.crm_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CRM settings"
  ON public.crm_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM settings"
  ON public.crm_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM settings"
  ON public.crm_settings FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Add Chatwoot columns to clientes table
ALTER TABLE public.clientes 
  ADD COLUMN IF NOT EXISTS chatwoot_contact_id bigint,
  ADD COLUMN IF NOT EXISTS chatwoot_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clientes_chatwoot_contact 
  ON public.clientes(chatwoot_contact_id) 
  WHERE chatwoot_contact_id IS NOT NULL;

-- 3. CRM Stages table (Kanban columns)
CREATE TABLE public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  chatwoot_label text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for crm_stages
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own CRM stages"
  ON public.crm_stages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CRM stages"
  ON public.crm_stages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM stages"
  ON public.crm_stages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM stages"
  ON public.crm_stages FOR DELETE
  USING (auth.uid() = user_id);

-- 4. CRM Deals table (Kanban cards)
CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  stage_id uuid NOT NULL REFERENCES public.crm_stages(id) ON DELETE CASCADE,
  chatwoot_conversation_id bigint,
  title text NOT NULL,
  value numeric DEFAULT 0,
  expected_close_date date,
  notes text,
  sync_token uuid,
  last_sync_source text CHECK (last_sync_source IN ('crm', 'chatwoot')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for crm_deals
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own CRM deals"
  ON public.crm_deals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CRM deals"
  ON public.crm_deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM deals"
  ON public.crm_deals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM deals"
  ON public.crm_deals FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime for crm_deals (for live Kanban updates)
ALTER TABLE public.crm_deals REPLICA IDENTITY FULL;

-- Trigger for updated_at on crm_settings
CREATE OR REPLACE FUNCTION public.handle_updated_at_crm_settings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_crm_settings_updated_at
  BEFORE UPDATE ON public.crm_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_crm_settings();

-- Trigger for updated_at on crm_deals
CREATE OR REPLACE FUNCTION public.handle_updated_at_crm_deals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_crm_deals_updated_at
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_crm_deals();