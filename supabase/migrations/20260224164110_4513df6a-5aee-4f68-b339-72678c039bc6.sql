
-- Drop and recreate get_portal_cards_hybrid with carteirinha_url
DROP FUNCTION IF EXISTS public.get_portal_cards_hybrid(uuid, uuid, text, text);

CREATE FUNCTION public.get_portal_cards_hybrid(
  p_user_id uuid,
  p_client_id uuid,
  p_cpf text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  insured_asset text,
  expiration_date date,
  start_date date,
  policy_number text,
  insurance_company uuid,
  type text,
  status text,
  carteirinha_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_cpf text;
BEGIN
  v_normalized_cpf := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');

  RETURN QUERY
  SELECT DISTINCT 
    a.id,
    a.insured_asset,
    a.expiration_date,
    a.start_date,
    a.policy_number,
    a.insurance_company,
    COALESCE(r.nome, a.type) AS type,
    a.status,
    a.carteirinha_url
  FROM apolices a
  INNER JOIN clientes c ON a.client_id = c.id
  LEFT JOIN ramos r ON r.id::text = a.type
  WHERE c.user_id = p_user_id
    AND a.status = 'Ativa'
    AND a.expiration_date >= CURRENT_DATE
    AND (
      a.client_id = p_client_id
      OR (
        v_normalized_cpf != '' 
        AND length(v_normalized_cpf) >= 11
        AND regexp_replace(COALESCE(c.cpf_cnpj, ''), '\D', '', 'g') = v_normalized_cpf
      )
      OR (
        p_email IS NOT NULL 
        AND p_email != ''
        AND lower(trim(c.email)) = lower(trim(p_email))
      )
    )
  ORDER BY a.expiration_date DESC;
END;
$$;

-- Recreate get_portal_policies_hybrid with ramos JOIN
CREATE OR REPLACE FUNCTION public.get_portal_policies_hybrid(
  p_user_id uuid,
  p_client_id uuid,
  p_cpf text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  insured_asset text,
  expiration_date date,
  start_date date,
  policy_number text,
  insurance_company uuid,
  type text,
  status text,
  premium_value numeric,
  pdf_url text,
  pdf_attached_data text,
  pdf_attached_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_cpf text;
BEGIN
  v_normalized_cpf := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');

  RETURN QUERY
  SELECT DISTINCT 
    a.id,
    a.insured_asset,
    a.expiration_date,
    a.start_date,
    a.policy_number,
    a.insurance_company,
    COALESCE(r.nome, a.type) AS type,
    a.status,
    a.premium_value,
    a.pdf_url,
    a.pdf_attached_data,
    a.pdf_attached_name
  FROM apolices a
  INNER JOIN clientes c ON a.client_id = c.id
  LEFT JOIN ramos r ON r.id::text = a.type
  WHERE c.user_id = p_user_id
    AND (
      a.client_id = p_client_id
      OR (
        v_normalized_cpf != '' 
        AND length(v_normalized_cpf) >= 11
        AND regexp_replace(COALESCE(c.cpf_cnpj, ''), '\D', '', 'g') = v_normalized_cpf
      )
      OR (
        p_email IS NOT NULL 
        AND p_email != ''
        AND lower(trim(c.email)) = lower(trim(p_email))
      )
    )
  ORDER BY a.expiration_date DESC;
END;
$$;
