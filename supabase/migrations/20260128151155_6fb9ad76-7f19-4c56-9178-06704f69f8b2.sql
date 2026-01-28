-- Função para identificar cliente no portal (login simplificado sem senha)
CREATE OR REPLACE FUNCTION public.identify_portal_client(p_identifier TEXT, p_brokerage_slug TEXT)
RETURNS TABLE (id UUID, name TEXT, email TEXT, cpf_cnpj TEXT, user_id UUID) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Remove formatação do CPF/CNPJ se fornecido
    DECLARE
        clean_identifier TEXT := regexp_replace(p_identifier, '[^0-9a-zA-Z@.\s]', '', 'g');
    BEGIN
        RETURN QUERY 
        SELECT c.id, c.name, c.email, c.cpf_cnpj, c.user_id
        FROM clientes c
        JOIN brokerages b ON b.user_id = c.user_id
        WHERE (
            -- Match por CPF/CNPJ (apenas dígitos)
            regexp_replace(c.cpf_cnpj, '[^0-9]', '', 'g') = regexp_replace(clean_identifier, '[^0-9]', '', 'g')
            -- Ou match por nome (case insensitive)
            OR UPPER(TRIM(c.name)) = UPPER(TRIM(p_identifier))
            -- Ou match por email (case insensitive)
            OR LOWER(TRIM(c.email)) = LOWER(TRIM(p_identifier))
        )
        AND b.slug = p_brokerage_slug
        AND c.status = 'active';
    END;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.identify_portal_client IS 'Identifica cliente no portal por CPF, nome ou email para login simplificado sem senha';