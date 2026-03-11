-- Drop dependent function first, then view
DROP FUNCTION IF EXISTS public.get_user_companies_with_ramos();
DROP VIEW IF EXISTS public.companies_with_ramos_count;

-- Recreate view with phone columns
CREATE VIEW public.companies_with_ramos_count AS
SELECT 
  c.id, c.name, c.user_id, c.created_at, c.updated_at,
  c.service_phone, c.assistance_phone,
  COUNT(cr.ramo_id) as ramos_count
FROM public.companies c
LEFT JOIN public.company_ramos cr ON c.id = cr.company_id AND cr.user_id = c.user_id
WHERE c.user_id = auth.uid()
GROUP BY c.id, c.name, c.user_id, c.created_at, c.updated_at, c.service_phone, c.assistance_phone;

-- Recreate dependent function
CREATE OR REPLACE FUNCTION public.get_user_companies_with_ramos()
RETURNS SETOF companies_with_ramos_count
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT * FROM companies_with_ramos_count;
$function$;

-- CREATE SEED FUNCTION
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
BEGIN
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
END;
$$;

-- UPDATE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', 'Usuário'), NEW.email, 'corretor');
  
  PERFORM public.seed_user_defaults(NEW.id);
  RETURN NEW;
END;
$$;