-- Migração: Criar sistema de organizações para gestão centralizada
-- Data: 2026-01-30
-- Objetivo: Permitir que o admin gerencie configurações por corretora/organização

-- 1. Criar tabela de organizações
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comentários
COMMENT ON TABLE public.organizations IS 'Corretoras/organizações gerenciadas pelo admin';
COMMENT ON COLUMN public.organizations.slug IS 'Identificador único amigável para URLs';
COMMENT ON COLUMN public.organizations.settings IS 'Configurações específicas da organização (JSON)';

-- Índices
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_active ON public.organizations(active);

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins podem ver todas as organizações"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins podem criar organizações"
  ON public.organizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins podem atualizar organizações"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins podem deletar organizações"
  ON public.organizations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Adicionar organization_id em profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);

COMMENT ON COLUMN public.profiles.organization_id IS 'Organização à qual o usuário pertence';

-- 3. Atualizar crm_settings para usar organization_id
ALTER TABLE public.crm_settings 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_crm_settings_organization ON public.crm_settings(organization_id);

COMMENT ON COLUMN public.crm_settings.organization_id IS 'Configuração de CRM por organização (gerenciada pelo admin)';

-- Remover constraint UNIQUE(user_id) se existir, pois agora pode ser NULL
ALTER TABLE public.crm_settings DROP CONSTRAINT IF NOT EXISTS crm_settings_user_id_key;

-- 4. Criar tabela de API keys gerenciadas pelo admin
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  key_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  description TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.api_keys IS 'API keys gerenciadas centralmente pelo admin';
COMMENT ON COLUMN public.api_keys.key_value IS 'Valor da chave (deve ser criptografado no app)';
COMMENT ON COLUMN public.api_keys.last_used_at IS 'Última vez que a key foi usada';

-- Índices
CREATE INDEX idx_api_keys_service ON public.api_keys(service_name);
CREATE INDEX idx_api_keys_status ON public.api_keys(status);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (apenas admins)
CREATE POLICY "Admins podem ver todas as API keys"
  ON public.api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins podem criar API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins podem atualizar API keys"
  ON public.api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins podem deletar API keys"
  ON public.api_keys FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Triggers para updated_at
CREATE TRIGGER handle_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Função para gerar slug automaticamente
CREATE OR REPLACE FUNCTION public.generate_slug_from_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '^-+|-+$', '', 'g');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_organization_slug
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.generate_slug_from_name();

-- 7. Seed: Criar organização padrão para usuários existentes sem organização
INSERT INTO public.organizations (name, slug, settings)
VALUES ('Organização Padrão', 'default', '{"created_by_migration": true}')
ON CONFLICT (slug) DO NOTHING;

-- Atribuir usuários existentes à organização padrão
UPDATE public.profiles
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'default')
WHERE organization_id IS NULL;

-- 8. Migrar configurações de CRM existentes para organization_id
-- Criar uma organização para cada usuário que tem crm_settings
WITH user_orgs AS (
  SELECT DISTINCT
    cs.user_id,
    p.nome_completo,
    p.email
  FROM public.crm_settings cs
  JOIN public.profiles p ON p.id = cs.user_id
  WHERE cs.organization_id IS NULL
)
INSERT INTO public.organizations (name, slug, settings)
SELECT 
  COALESCE(nome_completo, email) || ' - Corretora',
  'org-' || substr(md5(user_id::text), 1, 8),
  jsonb_build_object('migrated_from_user', user_id, 'user_email', email)
FROM user_orgs
ON CONFLICT (slug) DO NOTHING;

-- Atualizar crm_settings com organization_id
UPDATE public.crm_settings cs
SET organization_id = (
  SELECT o.id 
  FROM public.organizations o
  WHERE o.settings->>'migrated_from_user' = cs.user_id::text
)
WHERE cs.organization_id IS NULL;

-- Atualizar profiles com organization_id
UPDATE public.profiles p
SET organization_id = (
  SELECT o.id 
  FROM public.organizations o
  WHERE o.settings->>'migrated_from_user' = p.id::text
)
WHERE p.organization_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.organizations o 
    WHERE o.settings->>'migrated_from_user' = p.id::text
  );
