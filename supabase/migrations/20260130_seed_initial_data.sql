-- Seed: Popular banco com dados iniciais para o admin

-- Criar organização padrão se não existir
INSERT INTO organizations (id, name, slug, active)
VALUES (
  'org-default-001',
  'Organização Padrão',
  'organizacao-padrao',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Atualizar profiles existentes para vincular à organização padrão
UPDATE profiles
SET organization_id = 'org-default-001'
WHERE organization_id IS NULL;

-- Atualizar crm_settings existentes para vincular à organização padrão
UPDATE crm_settings
SET organization_id = 'org-default-001'
WHERE organization_id IS NULL;

-- Criar API key de exemplo (OpenAI)
INSERT INTO api_keys (service_name, key_value, description, status)
VALUES (
  'OpenAI',
  'sk-proj-exemplo-nao-funcional',
  'Chave de exemplo - substitua pela chave real',
  'inactive'
)
ON CONFLICT DO NOTHING;

-- Comentário de sucesso
COMMENT ON TABLE organizations IS 'Dados iniciais populados com sucesso';
