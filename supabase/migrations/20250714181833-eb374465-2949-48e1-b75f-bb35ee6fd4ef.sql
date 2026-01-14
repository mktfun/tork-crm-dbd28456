
-- First, let's create the default transaction types that should exist for all users
-- We'll use specific UUIDs so we can reference them consistently

-- Create default transaction types for commission, expense, and income
INSERT INTO public.transaction_types (id, user_id, name, nature, created_at, updated_at)
SELECT 
    'commission-default'::uuid as id,
    id as user_id,
    'Comissão' as name,
    'GANHO' as nature,
    now() as created_at,
    now() as updated_at
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.transaction_types 
    WHERE user_id = auth.users.id AND name = 'Comissão' AND nature = 'GANHO'
);

INSERT INTO public.transaction_types (id, user_id, name, nature, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    id as user_id,
    'Despesa' as name,
    'PERDA' as nature,
    now() as created_at,
    now() as updated_at
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.transaction_types 
    WHERE user_id = auth.users.id AND name = 'Despesa' AND nature = 'PERDA'
);

INSERT INTO public.transaction_types (id, user_id, name, nature, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    id as user_id,
    'Receita' as name,
    'GANHO' as nature,
    now() as created_at,
    now() as updated_at
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.transaction_types 
    WHERE user_id = auth.users.id AND name = 'Receita' AND nature = 'GANHO'
);

-- Fix existing transactions that have 'commission-default' as type_id
-- We need to update the transactions table to change the type_id column from text to uuid
ALTER TABLE public.transactions ALTER COLUMN type_id TYPE uuid USING type_id::uuid;

-- Update existing commission transactions to use the correct commission type ID
UPDATE public.transactions 
SET type_id = (
    SELECT tt.id 
    FROM public.transaction_types tt 
    WHERE tt.user_id = transactions.user_id 
    AND tt.name = 'Comissão' 
    AND tt.nature = 'GANHO'
    LIMIT 1
)
WHERE type_id::text = 'commission-default' 
OR description ILIKE '%comissão%';

-- Ensure all transactions have a valid type_id by assigning default types
UPDATE public.transactions 
SET type_id = (
    SELECT tt.id 
    FROM public.transaction_types tt 
    WHERE tt.user_id = transactions.user_id 
    AND tt.nature = CASE 
        WHEN transactions.nature = 'RECEITA' THEN 'GANHO'
        WHEN transactions.nature = 'DESPESA' THEN 'PERDA'
        ELSE 'GANHO'
    END
    LIMIT 1
)
WHERE type_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.transaction_types tt WHERE tt.id = transactions.type_id
);
