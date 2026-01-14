-- 1. Adicionar coluna ramo_id na tabela transactions
ALTER TABLE public.transactions 
ADD COLUMN ramo_id uuid REFERENCES public.ramos(id);

-- 2. Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_transactions_ramo_id ON public.transactions(ramo_id);

-- 3. Criar função RPC para vincular transações aos ramos
CREATE OR REPLACE FUNCTION public.link_manual_transactions(p_user_id uuid)
RETURNS text AS $$
DECLARE
    updated_count integer := 0;
    rec record;
    ramo_rec record;
BEGIN
    -- Itera sobre transações do usuário que não têm ramo vinculado
    FOR rec IN 
        SELECT id, description, user_id 
        FROM public.transactions 
        WHERE user_id = p_user_id 
        AND ramo_id IS NULL 
    LOOP
        -- Tenta encontrar um ramo do mesmo usuário cujo nome esteja na descrição
        SELECT id, nome INTO ramo_rec
        FROM public.ramos
        WHERE user_id = p_user_id
        AND lower(rec.description) LIKE '%' || lower(ramos.nome) || '%'
        LIMIT 1;

        -- Se encontrou correspondência, atualiza a transação
        IF FOUND THEN
            UPDATE public.transactions
            SET ramo_id = ramo_rec.id
            WHERE id = rec.id
            AND user_id = p_user_id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RETURN updated_count || ' transações foram vinculadas com sucesso.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;