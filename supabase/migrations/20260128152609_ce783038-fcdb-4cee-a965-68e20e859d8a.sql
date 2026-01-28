CREATE OR REPLACE FUNCTION public.identify_portal_client(p_identifier TEXT, p_brokerage_slug TEXT)
RETURNS TABLE (id UUID, name TEXT, email TEXT, cpf_cnpj TEXT, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_brokerage_user_id UUID;
BEGIN
  -- 1. Primeiro, tenta achar o dono da corretora pelo slug de forma isolada
  SELECT b.user_id
    INTO v_brokerage_user_id
  FROM public.brokerages b
  WHERE b.slug = p_brokerage_slug
  LIMIT 1;

  -- Log interno (visível nos logs do Supabase)
  RAISE NOTICE 'Buscando cliente para brokerage_user_id: % com identifier: %', v_brokerage_user_id, p_identifier;

  RETURN QUERY
  SELECT c.id, c.name, c.email, c.cpf_cnpj, c.user_id
  FROM public.clientes c
  WHERE c.user_id = v_brokerage_user_id
    AND (
      regexp_replace(coalesce(c.cpf_cnpj, ''), '\\D', '', 'g') = regexp_replace(coalesce(p_identifier, ''), '\\D', '', 'g')
      OR upper(coalesce(c.name, '')) = upper(coalesce(p_identifier, ''))
      OR lower(coalesce(c.email, '')) = lower(coalesce(p_identifier, ''))
    )
  LIMIT 1;
END;
$$;