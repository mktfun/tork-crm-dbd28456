-- =====================================================
-- CRIAR TABELA bank_accounts
-- =====================================================
-- 
-- Propósito: Cadastro de contas bancárias reais do usuário
-- Usado por: ModuloMultiBancos, CaixaTab, Página /bancos
--
-- Data: 2026-01-30
-- =====================================================

-- Criar ENUM para tipo de conta bancária
CREATE TYPE bank_account_type AS ENUM ('corrente', 'poupanca', 'investimento', 'giro');

-- Criar tabela de contas bancárias
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identificação
  bank_name TEXT NOT NULL, -- Ex: 'Itaú Empresas', 'Bradesco', 'Nubank PJ'
  account_number TEXT,
  agency TEXT,
  account_type bank_account_type NOT NULL,
  
  -- Saldo
  current_balance DECIMAL NOT NULL DEFAULT 0,
  last_sync_date TIMESTAMPTZ,
  
  -- UI/UX
  color TEXT, -- Cor para UI (ex: '#FF6B00' para Itaú)
  icon TEXT, -- Nome do ícone (ex: 'building-2')
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_bank_accounts_user ON bank_accounts(user_id);
CREATE INDEX idx_bank_accounts_active ON bank_accounts(user_id, is_active);

-- RLS (Row Level Security)
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só veem suas próprias contas
CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Usuários podem inserir suas próprias contas
CREATE POLICY "Users can insert own bank accounts"
  ON bank_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem atualizar suas próprias contas
CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem deletar suas próprias contas
CREATE POLICY "Users can delete own bank accounts"
  ON bank_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE bank_accounts IS 'Cadastro de contas bancárias reais do usuário';
COMMENT ON COLUMN bank_accounts.bank_name IS 'Nome do banco (ex: Itaú Empresas, Bradesco)';
COMMENT ON COLUMN bank_accounts.current_balance IS 'Saldo atual da conta';
COMMENT ON COLUMN bank_accounts.last_sync_date IS 'Data da última sincronização de saldo';
COMMENT ON COLUMN bank_accounts.color IS 'Cor para exibição na UI (hex)';
COMMENT ON COLUMN bank_accounts.icon IS 'Nome do ícone lucide-react';
