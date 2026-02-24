-- Migration for adding service_phone and seeding top companies

-- 1. Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'service_phone'
    ) THEN
        ALTER TABLE public.companies
        ADD COLUMN service_phone text;
    END IF;
END $$;

-- 2. Seed top companies via UPSERT (ON CONFLICT on name if supported, else simple insert if missing)
-- Wait, the companies table might not have an ON CONFLICT constraint on 'name'. 
-- Let's do a safe insert using WHERE NOT EXISTS.

INSERT INTO public.companies (name, service_phone, created_at, updated_at)
SELECT * FROM (VALUES
    ('Porto Seguro', '333 76786'),
    ('Bradesco Seguros', '4004 2757'),
    ('SulAmérica', '4004 4100'),
    ('Allianz', '08000 115 215'),
    ('Tokio Marine', '0800 30 86546'),
    ('HDI', '0800 434 4340'),
    ('Mapfre', '0800 775 4545'),
    ('Azul Seguros', '0800 703 1280'),
    ('Mitsui Sumitomo', '0800 773 6767'),
    ('Suhai', '3003-0335'),
    ('Sura', '0800 775 4400'),
    ('Yelum', '0800 000 0000'),
    ('Zurich', '0800 284 4848'),
    ('Itaú Seguros', '0800 722 2424')
) AS v(name, service_phone)
WHERE NOT EXISTS (
    SELECT 1 FROM public.companies c WHERE c.name ILIKE v.name
);

-- Update existing companies with the service phone if they exist but don't have it
UPDATE public.companies c
SET service_phone = v.service_phone
FROM (VALUES
    ('Porto Seguro', '333 76786'),
    ('Bradesco Seguros', '4004 2757'),
    ('SulAmérica', '4004 4100'),
    ('Allianz', '08000 115 215'),
    ('Tokio Marine', '0800 30 86546'),
    ('HDI', '0800 434 4340'),
    ('Mapfre', '0800 775 4545'),
    ('Azul Seguros', '0800 703 1280'),
    ('Mitsui Sumitomo', '0800 773 6767'),
    ('Suhai', '3003-0335'),
    ('Sura', '0800 775 4400'),
    ('Yelum', '0800 000 0000'),
    ('Zurich', '0800 284 4848'),
    ('Itaú Seguros', '0800 722 2424')
) AS v(name, service_phone)
WHERE c.name ILIKE v.name AND c.service_phone IS NULL;
