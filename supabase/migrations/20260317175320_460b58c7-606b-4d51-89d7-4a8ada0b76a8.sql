ALTER TABLE public.brokerages ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;