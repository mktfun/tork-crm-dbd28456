
DO $$
DECLARE
  v_user_id uuid := '65b85549-c928-4513-8d56-a3ef41512dc8';
  v_pipeline_seguros uuid;
  v_pipeline_sinistros uuid;
BEGIN
  -- 1. Delete deal events and notes first (FK refs)
  DELETE FROM crm_deal_events WHERE deal_id IN (
    SELECT d.id FROM crm_deals d WHERE d.user_id = v_user_id
  );
  DELETE FROM crm_deal_notes WHERE deal_id IN (
    SELECT d.id FROM crm_deals d WHERE d.user_id = v_user_id
  );

  -- 2. Delete follow-ups
  DELETE FROM ai_follow_ups WHERE user_id = v_user_id;

  -- 3. Delete deals
  DELETE FROM crm_deals WHERE user_id = v_user_id;

  -- 4. Delete AI settings (refs stages)
  DELETE FROM crm_ai_settings WHERE user_id = v_user_id;

  -- 5. Delete pipeline AI defaults
  DELETE FROM crm_pipeline_ai_defaults WHERE user_id = v_user_id;

  -- 6. Delete stages
  DELETE FROM crm_stages WHERE user_id = v_user_id;

  -- 7. Delete pipelines
  DELETE FROM crm_pipelines WHERE user_id = v_user_id;

  -- 8. Delete old products
  DELETE FROM crm_products WHERE user_id = v_user_id;

  -- 9. Create pipeline "Seguros" (default)
  INSERT INTO crm_pipelines (user_id, name, description, position, is_default)
  VALUES (v_user_id, 'Seguros', 'Pipeline principal de vendas de seguros', 0, true)
  RETURNING id INTO v_pipeline_seguros;

  -- 10. Create pipeline "Sinistros e Assistência"
  INSERT INTO crm_pipelines (user_id, name, description, position, is_default)
  VALUES (v_user_id, 'Sinistros e Assistência', 'Acompanhamento de sinistros e assistências', 1, false)
  RETURNING id INTO v_pipeline_sinistros;

  -- 11. Stages for "Seguros"
  INSERT INTO crm_stages (user_id, pipeline_id, name, color, chatwoot_label, position) VALUES
    (v_user_id, v_pipeline_seguros, 'Novo Lead',         '#3B82F6', 'lead_novo',         0),
    (v_user_id, v_pipeline_seguros, 'Em Contato',        '#F59E0B', 'em_contato',        1),
    (v_user_id, v_pipeline_seguros, 'Proposta Enviada',  '#8B5CF6', 'proposta_enviada',  2),
    (v_user_id, v_pipeline_seguros, 'Negociação',        '#EC4899', 'negociacao',        3),
    (v_user_id, v_pipeline_seguros, 'Fechado Ganho',     '#10B981', 'fechado_ganho',     4),
    (v_user_id, v_pipeline_seguros, 'Perdido',           '#EF4444', 'perdido',           5);

  -- 12. Stages for "Sinistros e Assistência"
  INSERT INTO crm_stages (user_id, pipeline_id, name, color, chatwoot_label, position) VALUES
    (v_user_id, v_pipeline_sinistros, 'Abertura',       '#3B82F6', 'sinistro_abertura',     0),
    (v_user_id, v_pipeline_sinistros, 'Documentação',   '#F59E0B', 'sinistro_documentacao', 1),
    (v_user_id, v_pipeline_sinistros, 'Em Análise',     '#8B5CF6', 'sinistro_analise',      2),
    (v_user_id, v_pipeline_sinistros, 'Aprovado',       '#10B981', 'sinistro_aprovado',     3),
    (v_user_id, v_pipeline_sinistros, 'Negado',         '#EF4444', 'sinistro_negado',       4),
    (v_user_id, v_pipeline_sinistros, 'Concluído',      '#6B7280', 'sinistro_concluido',    5);

  -- 13. Insert standard products
  INSERT INTO crm_products (user_id, name, description, is_active) VALUES
    (v_user_id, 'Seguro Auto',         'Seguro para veículos automotores',    true),
    (v_user_id, 'Seguro Vida',         'Seguro de vida individual ou grupo',  true),
    (v_user_id, 'Seguro Residencial',  'Proteção para imóveis residenciais',  true),
    (v_user_id, 'Consórcio',           'Consórcio de bens e imóveis',         true),
    (v_user_id, 'Fiança Locatícia',    'Seguro fiança para locação',          true);
END $$;
