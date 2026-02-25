CREATE OR REPLACE FUNCTION get_portal_requests_by_client(
  p_client_id UUID,
  p_brokerage_user_id UUID
)
RETURNS TABLE (
  id UUID,
  request_type TEXT,
  insurance_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  is_qualified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM clientes
    WHERE clientes.id = p_client_id
      AND clientes.user_id = p_brokerage_user_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pr.id, pr.request_type, pr.insurance_type,
         pr.status, pr.created_at, pr.is_qualified
  FROM portal_requests pr
  WHERE pr.client_id = p_client_id
  ORDER BY pr.created_at DESC;
END;
$$;