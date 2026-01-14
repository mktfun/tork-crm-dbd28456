-- Evolução da função link_manual_transactions para vincular Ramo, Seguradora e atualizar Status
CREATE OR REPLACE FUNCTION public.link_manual_transactions(p_user_id uuid)
RETURNS text AS $$
DECLARE
    updated_count integer := 0;
    rec record;
    ramo_rec record;
    company_rec record;
BEGIN
    -- Itera sobre transações do usuário que não têm ramo OU seguradora vinculados
    FOR rec IN 
        SELECT id, description, user_id 
        FROM public.transactions 
        WHERE user_id = p_user_id 
        AND (ramo_id IS NULL OR company_id IS NULL)
    LOOP
        -- Reinicia as variáveis para cada transação
        ramo_rec := NULL;
        company_rec := NULL;

        -- 1. Tenta vincular o RAMO (procura o nome do ramo na descrição)
        SELECT id, nome INTO ramo_rec
        FROM public.ramos
        WHERE user_id = p_user_id
        AND lower(rec.description) LIKE '%' || lower(ramos.nome) || '%'
        LIMIT 1;

        -- 2. Tenta vincular a SEGURADORA (tabela companies)
        SELECT id, name INTO company_rec
        FROM public.companies
        WHERE user_id = p_user_id
        AND lower(rec.description) LIKE '%' || lower(companies.name) || '%'
        LIMIT 1;
        
        -- 3. Se encontrou Ramo ou Seguradora para vincular...
        IF ramo_rec.id IS NOT NULL OR company_rec.id IS NOT NULL THEN
            UPDATE public.transactions
            SET 
                -- Usa COALESCE para não apagar um ID que já exista
                ramo_id = COALESCE(ramo_rec.id, ramo_id),
                company_id = COALESCE(company_rec.id::text, company_id),
                -- Atualiza o status para PAGO, já que a transação foi identificada e vinculada
                status = CASE 
                    WHEN status = 'PENDENTE' THEN 'PAGO'
                    ELSE status
                END
            WHERE id = rec.id
            AND user_id = p_user_id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RETURN updated_count || ' transações foram vinculadas com sucesso.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;