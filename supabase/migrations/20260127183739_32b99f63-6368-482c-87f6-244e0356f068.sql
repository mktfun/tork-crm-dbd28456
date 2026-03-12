-- =====================================================
-- INTELLIGENCE V10: Storage Setup + RLS Policies
-- =====================================================

-- 1. Criar bucket 'policy-docs' para armazenar PDFs das apólices
INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-docs', 'policy-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas RLS para o bucket policy-docs (dropar e recriar)
DROP POLICY IF EXISTS "Users can upload their policy docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own policy docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own policy docs" ON storage.objects;

-- Permitir que usuários autenticados façam upload de seus próprios documentos
CREATE POLICY "Users can upload their policy docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'policy-docs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir que usuários vejam apenas seus próprios documentos
CREATE POLICY "Users can view their own policy docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'policy-docs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir que usuários deletem seus próprios documentos
CREATE POLICY "Users can delete their own policy docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'policy-docs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Garantia de unicidade por CPF
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj_unique 
ON clientes (cpf_cnpj, user_id) 
WHERE cpf_cnpj IS NOT NULL;