-- Add Sinistro and Endosso as default products for all existing users
INSERT INTO crm_products (user_id, name, description, is_active)
SELECT u.user_id, p.name, p.description, true
FROM (SELECT DISTINCT user_id FROM crm_products) u
CROSS JOIN (VALUES
  ('Sinistro', 'Abertura e acompanhamento de sinistros'),
  ('Endosso', 'Alterações e endossos em apólices vigentes')
) AS p(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM crm_products cp
  WHERE cp.user_id = u.user_id AND cp.name = p.name
);

-- Update the onboarding function to include Sinistro and Endosso for new users
CREATE OR REPLACE FUNCTION public.setup_default_crm_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pipeline_id uuid;
  v_stage_id uuid;
  v_stage_names text[] := ARRAY['Novo Lead', 'Em Contato', 'Proposta Enviada', 'Negociação', 'Fechado/Ganho'];
  v_stage_colors text[] := ARRAY['#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981'];
  v_product_names text[] := ARRAY['Seguro Auto', 'Seguro Vida', 'Seguro Residencial', 'Consórcio', 'Fiança Locatícia', 'Sinistro', 'Endosso'];
  v_product_descs text[] := ARRAY[
    'Seguro para veículos automotores',
    'Seguro de vida individual ou em grupo',
    'Seguro para imóveis residenciais',
    'Consórcio de bens móveis e imóveis',
    'Seguro fiança para locação de imóveis',
    'Abertura e acompanhamento de sinistros',
    'Alterações e endossos em apólices vigentes'
  ];
  i int;
BEGIN
  IF EXISTS (SELECT 1 FROM crm_pipelines WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  INSERT INTO crm_pipelines (user_id, name, is_default, position)
  VALUES (p_user_id, 'Pipeline Padrão', true, 0)
  RETURNING id INTO v_pipeline_id;

  FOR i IN 1..array_length(v_stage_names, 1) LOOP
    INSERT INTO crm_stages (user_id, pipeline_id, name, color, position)
    VALUES (p_user_id, v_pipeline_id, v_stage_names[i], v_stage_colors[i], i - 1)
    RETURNING id INTO v_stage_id;

    INSERT INTO crm_ai_settings (user_id, stage_id, is_active, ai_name, ai_persona, ai_objective, ai_custom_rules)
    VALUES (
      p_user_id, v_stage_id, true,
      'Assistente Tork',
      'Consultor profissional, educado e prestativo. Especialista em seguros.',
      'Qualificar o interesse do cliente e coletar dados básicos para cotação.',
      'Não prometa valores exatos sem aprovação. Sempre peça CPF para análise.'
    );
  END LOOP;

  FOR i IN 1..array_length(v_product_names, 1) LOOP
    INSERT INTO crm_products (user_id, name, description, is_active)
    VALUES (p_user_id, v_product_names[i], v_product_descs[i], true);
  END LOOP;
END;
$$;