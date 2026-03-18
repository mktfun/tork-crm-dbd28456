
-- =============================================
-- MIGRATION A: Create crm_products table
-- =============================================
CREATE TABLE public.crm_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_products_user_id ON public.crm_products(user_id);
ALTER TABLE public.crm_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.crm_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.crm_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.crm_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.crm_products FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_crm_products_updated_at BEFORE UPDATE ON public.crm_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- MIGRATION B: Add product_id to crm_deals
-- =============================================
ALTER TABLE public.crm_deals ADD COLUMN product_id UUID REFERENCES public.crm_products(id) ON DELETE SET NULL;
CREATE INDEX idx_crm_deals_product_id ON public.crm_deals(product_id);

-- =============================================
-- MIGRATION C: Update seed_user_defaults with pipelines & products
-- =============================================
CREATE OR REPLACE FUNCTION public.seed_user_defaults(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_porto uuid := gen_random_uuid();
  v_bradesco uuid := gen_random_uuid();
  v_sulamerica uuid := gen_random_uuid();
  v_allianz uuid := gen_random_uuid();
  v_tokio uuid := gen_random_uuid();
  v_hdi uuid := gen_random_uuid();
  v_mapfre uuid := gen_random_uuid();
  v_azul uuid := gen_random_uuid();
  v_mitsui uuid := gen_random_uuid();
  v_suhai uuid := gen_random_uuid();
  v_zurich uuid := gen_random_uuid();
  v_itau uuid := gen_random_uuid();
  v_liberty uuid := gen_random_uuid();
  v_sompo uuid := gen_random_uuid();
  v_auto uuid := gen_random_uuid();
  v_vida uuid := gen_random_uuid();
  v_saude uuid := gen_random_uuid();
  v_residencial uuid := gen_random_uuid();
  v_empresarial uuid := gen_random_uuid();
  v_condominio uuid := gen_random_uuid();
  v_transporte uuid := gen_random_uuid();
  v_rc uuid := gen_random_uuid();
  v_fianca uuid := gen_random_uuid();
  v_viagem uuid := gen_random_uuid();
  v_equipamentos uuid := gen_random_uuid();
  -- Pipeline IDs
  v_pipeline_seguros uuid := gen_random_uuid();
  v_pipeline_sinistros uuid := gen_random_uuid();
BEGIN
  -- Seguradoras
  INSERT INTO public.companies (id, user_id, name, service_phone, assistance_phone) VALUES
    (v_porto, p_user_id, 'Porto Seguro', '0800 727 0800', '0800 727 0800'),
    (v_bradesco, p_user_id, 'Bradesco Seguros', '0800 701 9090', '0800 701 9090'),
    (v_sulamerica, p_user_id, 'SulAmérica', '0800 727 2020', '0800 727 2020'),
    (v_allianz, p_user_id, 'Allianz', '0800 115 215', '0800 115 215'),
    (v_tokio, p_user_id, 'Tokio Marine', '0800 721 2583', '0800 721 2583'),
    (v_hdi, p_user_id, 'HDI', '0800 771 2010', '0800 771 2010'),
    (v_mapfre, p_user_id, 'Mapfre', '0800 775 4545', '0800 775 4545'),
    (v_azul, p_user_id, 'Azul Seguros', '0800 703 1280', '0800 703 1280'),
    (v_mitsui, p_user_id, 'Mitsui Sumitomo', '0800 721 7878', '0800 721 7878'),
    (v_suhai, p_user_id, 'Suhai', '0800 020 3040', '0800 020 3040'),
    (v_zurich, p_user_id, 'Zurich', '0800 284 4848', '0800 284 4848'),
    (v_itau, p_user_id, 'Itaú Seguros', '0800 728 0079', '0800 728 0079'),
    (v_liberty, p_user_id, 'Liberty', '0800 709 6464', '0800 709 6464'),
    (v_sompo, p_user_id, 'Sompo', '0800 776 676', '0800 776 676');

  -- Ramos
  INSERT INTO public.ramos (id, user_id, nome) VALUES
    (v_auto, p_user_id, 'Automóvel'),
    (v_vida, p_user_id, 'Vida'),
    (v_saude, p_user_id, 'Saúde'),
    (v_residencial, p_user_id, 'Residencial'),
    (v_empresarial, p_user_id, 'Empresarial'),
    (v_condominio, p_user_id, 'Condomínio'),
    (v_transporte, p_user_id, 'Transporte'),
    (v_rc, p_user_id, 'Responsabilidade Civil'),
    (v_fianca, p_user_id, 'Fiança Locatícia'),
    (v_viagem, p_user_id, 'Viagem'),
    (v_equipamentos, p_user_id, 'Equipamentos');

  -- Company-Ramo relationships
  INSERT INTO public.company_ramos (company_id, ramo_id, user_id) VALUES
    (v_porto, v_auto, p_user_id), (v_porto, v_vida, p_user_id), (v_porto, v_saude, p_user_id),
    (v_porto, v_residencial, p_user_id), (v_porto, v_empresarial, p_user_id), (v_porto, v_condominio, p_user_id),
    (v_porto, v_transporte, p_user_id), (v_porto, v_rc, p_user_id), (v_porto, v_fianca, p_user_id),
    (v_porto, v_viagem, p_user_id), (v_porto, v_equipamentos, p_user_id),
    (v_bradesco, v_auto, p_user_id), (v_bradesco, v_vida, p_user_id), (v_bradesco, v_saude, p_user_id),
    (v_bradesco, v_residencial, p_user_id), (v_bradesco, v_empresarial, p_user_id), (v_bradesco, v_condominio, p_user_id),
    (v_bradesco, v_transporte, p_user_id), (v_bradesco, v_rc, p_user_id), (v_bradesco, v_fianca, p_user_id),
    (v_bradesco, v_viagem, p_user_id), (v_bradesco, v_equipamentos, p_user_id),
    (v_sulamerica, v_auto, p_user_id), (v_sulamerica, v_vida, p_user_id), (v_sulamerica, v_saude, p_user_id),
    (v_sulamerica, v_residencial, p_user_id), (v_sulamerica, v_empresarial, p_user_id),
    (v_sulamerica, v_transporte, p_user_id), (v_sulamerica, v_viagem, p_user_id),
    (v_allianz, v_auto, p_user_id), (v_allianz, v_vida, p_user_id), (v_allianz, v_residencial, p_user_id),
    (v_allianz, v_empresarial, p_user_id), (v_allianz, v_condominio, p_user_id),
    (v_allianz, v_transporte, p_user_id), (v_allianz, v_rc, p_user_id), (v_allianz, v_equipamentos, p_user_id),
    (v_tokio, v_auto, p_user_id), (v_tokio, v_vida, p_user_id), (v_tokio, v_residencial, p_user_id),
    (v_tokio, v_empresarial, p_user_id), (v_tokio, v_condominio, p_user_id),
    (v_tokio, v_transporte, p_user_id), (v_tokio, v_rc, p_user_id), (v_tokio, v_fianca, p_user_id),
    (v_hdi, v_auto, p_user_id), (v_hdi, v_vida, p_user_id), (v_hdi, v_residencial, p_user_id),
    (v_hdi, v_empresarial, p_user_id), (v_hdi, v_condominio, p_user_id), (v_hdi, v_rc, p_user_id),
    (v_mapfre, v_auto, p_user_id), (v_mapfre, v_vida, p_user_id), (v_mapfre, v_residencial, p_user_id),
    (v_mapfre, v_empresarial, p_user_id), (v_mapfre, v_condominio, p_user_id),
    (v_mapfre, v_transporte, p_user_id), (v_mapfre, v_rc, p_user_id), (v_mapfre, v_viagem, p_user_id),
    (v_azul, v_auto, p_user_id), (v_azul, v_vida, p_user_id), (v_azul, v_residencial, p_user_id),
    (v_mitsui, v_auto, p_user_id), (v_mitsui, v_vida, p_user_id), (v_mitsui, v_residencial, p_user_id),
    (v_mitsui, v_empresarial, p_user_id), (v_mitsui, v_transporte, p_user_id), (v_mitsui, v_rc, p_user_id),
    (v_suhai, v_auto, p_user_id),
    (v_zurich, v_auto, p_user_id), (v_zurich, v_vida, p_user_id), (v_zurich, v_residencial, p_user_id),
    (v_zurich, v_empresarial, p_user_id), (v_zurich, v_rc, p_user_id), (v_zurich, v_viagem, p_user_id),
    (v_itau, v_auto, p_user_id), (v_itau, v_vida, p_user_id), (v_itau, v_residencial, p_user_id),
    (v_itau, v_empresarial, p_user_id), (v_itau, v_condominio, p_user_id),
    (v_liberty, v_auto, p_user_id), (v_liberty, v_vida, p_user_id), (v_liberty, v_residencial, p_user_id),
    (v_liberty, v_empresarial, p_user_id), (v_liberty, v_condominio, p_user_id), (v_liberty, v_rc, p_user_id),
    (v_sompo, v_auto, p_user_id), (v_sompo, v_vida, p_user_id), (v_sompo, v_residencial, p_user_id),
    (v_sompo, v_empresarial, p_user_id), (v_sompo, v_transporte, p_user_id),
    (v_sompo, v_rc, p_user_id), (v_sompo, v_equipamentos, p_user_id);

  -- =============================================
  -- CRM Pipelines padrão
  -- =============================================
  INSERT INTO public.crm_pipelines (id, user_id, name, is_default, position) VALUES
    (v_pipeline_seguros, p_user_id, 'Seguros', true, 0),
    (v_pipeline_sinistros, p_user_id, 'Sinistros e Assistência', false, 1);

  -- Etapas do pipeline "Seguros"
  INSERT INTO public.crm_stages (user_id, pipeline_id, name, color, chatwoot_label, position) VALUES
    (p_user_id, v_pipeline_seguros, 'Novo Lead', '#3B82F6', 'lead_novo', 0),
    (p_user_id, v_pipeline_seguros, 'Em Contato', '#F59E0B', 'em_contato', 1),
    (p_user_id, v_pipeline_seguros, 'Proposta Enviada', '#8B5CF6', 'proposta_enviada', 2),
    (p_user_id, v_pipeline_seguros, 'Negociação', '#EC4899', 'negociacao', 3),
    (p_user_id, v_pipeline_seguros, 'Fechado Ganho', '#10B981', 'fechado_ganho', 4),
    (p_user_id, v_pipeline_seguros, 'Perdido', '#EF4444', 'perdido', 5);

  -- Etapas do pipeline "Sinistros e Assistência"
  INSERT INTO public.crm_stages (user_id, pipeline_id, name, color, chatwoot_label, position) VALUES
    (p_user_id, v_pipeline_sinistros, 'Abertura', '#3B82F6', 'abertura', 0),
    (p_user_id, v_pipeline_sinistros, 'Documentação', '#F59E0B', 'documentacao', 1),
    (p_user_id, v_pipeline_sinistros, 'Em Análise', '#8B5CF6', 'em_analise', 2),
    (p_user_id, v_pipeline_sinistros, 'Aprovado', '#10B981', 'aprovado', 3),
    (p_user_id, v_pipeline_sinistros, 'Negado', '#EF4444', 'negado', 4),
    (p_user_id, v_pipeline_sinistros, 'Concluído', '#6B7280', 'concluido', 5);

  -- =============================================
  -- Produtos padrão (CRM Products)
  -- =============================================
  INSERT INTO public.crm_products (user_id, name, description) VALUES
    (p_user_id, 'Seguro Auto', 'Seguro para veículos automotores'),
    (p_user_id, 'Seguro Vida', 'Seguro de vida individual ou em grupo'),
    (p_user_id, 'Seguro Residencial', 'Proteção para imóveis residenciais'),
    (p_user_id, 'Consórcio', 'Consórcio de bens e imóveis'),
    (p_user_id, 'Fiança Locatícia', 'Garantia locatícia para contratos de aluguel');

END;
$$;
