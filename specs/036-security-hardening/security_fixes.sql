-- Migração SQL: Resolvendo Vulnerabilidades Apontadas pelo Supabase Security Scanner
-- Aplique usando o comando: supabase db push ou rodando no SQL Editor do Supabase.

-- 1. EXTENSÕES & SEARCH PATH (Warning: Extension in Public)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2. PROTEÇÃO DE SENHAS DO PORTAL EM TEXTO PLANO (Error: Portal passwords stored in plaintext)
-- Encriptando senhas existentes
UPDATE public.clientes 
SET portal_password = public.crypt(portal_password, public.gen_salt('bf'))
WHERE portal_password IS NOT NULL 
AND portal_password NOT LIKE '$2a$%'; 

-- Adicionando restrição para impedir senhas plaintext no futuro
ALTER TABLE public.clientes ADD CONSTRAINT portal_pass_not_plaintext CHECK (portal_password IS NULL OR portal_password LIKE '$2a$%');

-- 3. CHAT ADMINISTRATIVO (Error: Admin chat history publicly readable)
DROP POLICY IF EXISTS "Enable read access for all users" ON admin_chat_history;
CREATE POLICY "Apenas usuários autenticados e donos do chat podem ler" 
ON admin_chat_history FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 4. BUCKET FINANCEIRO (Error: Private financial receipts bucket is publicly readable)
UPDATE storage.buckets
SET public = false
WHERE id = 'comprovantes';

-- 5. STORAGE POLICY (Public receipts access)
-- Restringindo o acesso de leitura ao bucket de comprovantes
DROP POLICY IF EXISTS "Public receipts access" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público aos comprovantes" ON storage.objects;

CREATE POLICY "Acesso privado aos comprovantes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'comprovantes' AND (auth.uid() = owner));
