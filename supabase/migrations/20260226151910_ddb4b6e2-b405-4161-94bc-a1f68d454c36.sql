CREATE OR REPLACE FUNCTION public.get_public_brokerages()
RETURNS TABLE(id bigint, name text, logo_url text, slug text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT b.id, b.name, b.logo_url, b.slug
  FROM public.brokerages b
  WHERE b.portal_enabled = true
  ORDER BY b.name;
$$;