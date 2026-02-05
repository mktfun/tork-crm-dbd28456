-- =====================================================
-- TORK CRM - Script para Popular Dados de Teste
-- Conta: teste@teste.com
-- Data: 2026-02-04
-- =====================================================

-- Primeiro, buscar o user_id do usuário teste@teste.com
DO $$
DECLARE
    v_user_id UUID;
    v_brokerage_id INT;
    v_company_id UUID;
    v_company_id_2 UUID;
    v_ramo_auto_id UUID;
    v_ramo_residencial_id UUID;
    v_ramo_vida_id UUID;
    v_ramo_empresarial_id UUID;
    v_producer_id UUID;
    v_client_id_1 UUID;
    v_client_id_2 UUID;
    v_client_id_3 UUID;
    v_client_id_4 UUID;
    v_client_id_5 UUID;
    v_policy_id_1 UUID;
    v_policy_id_2 UUID;
    v_policy_id_3 UUID;
    v_policy_id_4 UUID;
    v_policy_id_5 UUID;
    v_bank_account_id_1 UUID;
    v_bank_account_id_2 UUID;
    v_fin_account_receita UUID;
    v_fin_account_despesa UUID;
    v_fin_account_banco UUID;
    v_fin_account_a_receber UUID;
    v_fin_account_a_pagar UUID;
    v_transaction_id UUID;
BEGIN
    -- Buscar user_id pelo email
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'teste@teste.com';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário teste@teste.com não encontrado!';
    END IF;
    
    RAISE NOTICE 'User ID encontrado: %', v_user_id;

    -- =====================================================
    -- LIMPEZA DE DADOS EXISTENTES (Para evitar conflitos e lixo)
    -- =====================================================
    RAISE NOTICE 'Limpando dados existentes...';
    -- Desabilitar trigger de imutabilidade para limpeza de teste
    ALTER TABLE financial_ledger DISABLE TRIGGER USER;
    DELETE FROM financial_ledger WHERE transaction_id IN (SELECT id FROM financial_transactions WHERE user_id = v_user_id);
    ALTER TABLE financial_ledger ENABLE TRIGGER USER;
    
    -- Desabilitar trigger de imutabilidade para transações
    ALTER TABLE financial_transactions DISABLE TRIGGER USER;
    DELETE FROM financial_transactions WHERE user_id = v_user_id;
    ALTER TABLE financial_transactions ENABLE TRIGGER USER;

    DELETE FROM financial_accounts WHERE user_id = v_user_id;
    DELETE FROM bank_accounts WHERE user_id = v_user_id;
    DELETE FROM appointments WHERE user_id = v_user_id;
    DELETE FROM apolices WHERE user_id = v_user_id;
    DELETE FROM apolices WHERE user_id = v_user_id;
    DELETE FROM daily_metrics WHERE user_id = v_user_id;
    DELETE FROM financial_goals WHERE user_id = v_user_id;
    -- Clientes e Producers podem ter vínculos externos, mas no teste isolado ok.
    -- Manteremos Clientes, Producers, Ramos, Companies e Brokerages se já existirem (ON CONFLICT lida com eles), 
    -- mas para garantir IDs frescos nas variáveis, o ideal seria buscar ou deletar.
    -- O script já tem lógica de busca (SELECT id INTO...) para esses.
    DELETE FROM notifications WHERE user_id = v_user_id;
    DELETE FROM crm_deals WHERE client_id IN (SELECT id FROM clientes WHERE user_id = v_user_id); -- Deals deletados via cliente ou user_id
    DELETE FROM clientes WHERE user_id = v_user_id;
    
    -- O problema crítico era financial_accounts e transações.
    
    -- =====================================================
    -- 1. CORRETORA (BROKERAGE)
    -- =====================================================
    INSERT INTO brokerages (name, susep_code, cnpj, logo_url, slug, user_id)
    VALUES (
        'Corretora Teste LTDA',
        'SUSEP-123456',
        '12.345.678/0001-90',
        NULL,
        'corretora-teste',
        v_user_id
    )
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_brokerage_id;
    
    IF v_brokerage_id IS NULL THEN
        SELECT id INTO v_brokerage_id FROM brokerages WHERE user_id = v_user_id LIMIT 1;
    END IF;
    
    RAISE NOTICE 'Brokerage ID: %', v_brokerage_id;
    
    -- =====================================================
    -- 2. SEGURADORAS (COMPANIES)
    -- =====================================================
    INSERT INTO companies (id, name, assistance_phone, user_id)
    VALUES 
        (gen_random_uuid(), 'Porto Seguro', '0800 727 2726', v_user_id),
        (gen_random_uuid(), 'Bradesco Seguros', '0800 770 1000', v_user_id),
        (gen_random_uuid(), 'SulAmérica', '0800 722 0099', v_user_id),
        (gen_random_uuid(), 'Allianz', '0800 770 5000', v_user_id)
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO v_company_id FROM companies WHERE name = 'Porto Seguro' AND user_id = v_user_id LIMIT 1;
    SELECT id INTO v_company_id_2 FROM companies WHERE name = 'Bradesco Seguros' AND user_id = v_user_id LIMIT 1;
    
    -- =====================================================
    -- 3. RAMOS DE SEGURO
    -- =====================================================
    -- Tabela ramos só tem: id, nome, user_id, created_at
    INSERT INTO ramos (id, nome, user_id)
    VALUES 
        (gen_random_uuid(), 'Automóvel', v_user_id),
        (gen_random_uuid(), 'Residencial', v_user_id),
        (gen_random_uuid(), 'Vida', v_user_id),
        (gen_random_uuid(), 'Empresarial', v_user_id)
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO v_ramo_auto_id FROM ramos WHERE nome = 'Automóvel' AND user_id = v_user_id LIMIT 1;
    SELECT id INTO v_ramo_residencial_id FROM ramos WHERE nome = 'Residencial' AND user_id = v_user_id LIMIT 1;
    SELECT id INTO v_ramo_vida_id FROM ramos WHERE nome = 'Vida' AND user_id = v_user_id LIMIT 1;
    SELECT id INTO v_ramo_empresarial_id FROM ramos WHERE nome = 'Empresarial' AND user_id = v_user_id LIMIT 1;
    
    -- =====================================================
    -- 4. PRODUTORES
    -- =====================================================
    INSERT INTO producers (id, name, email, phone, cpf_cnpj, brokerage_id, user_id)
    VALUES (gen_random_uuid(), 'João Silva', 'joao.silva@corretora.com', '(11) 98888-1111', '123.456.789-00', v_brokerage_id, v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_producer_id;
    
    IF v_producer_id IS NULL THEN
        SELECT id INTO v_producer_id FROM producers WHERE user_id = v_user_id LIMIT 1;
    END IF;
    
    -- =====================================================
    -- 5. CLIENTES
    -- =====================================================
    -- Cliente 1
    SELECT id INTO v_client_id_1 FROM clientes WHERE cpf_cnpj = '111.222.333-44' AND user_id = v_user_id;
    IF v_client_id_1 IS NULL THEN
        INSERT INTO clientes (id, name, email, phone, cpf_cnpj, birth_date, address, city, state, cep, status, user_id)
        VALUES (gen_random_uuid(), 'Maria Santos', 'maria.santos@email.com', '(11) 97777-1111', '111.222.333-44', '1985-03-15', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100', 'Ativo', v_user_id)
        RETURNING id INTO v_client_id_1;
    END IF;
    
    -- Cliente 2
    SELECT id INTO v_client_id_2 FROM clientes WHERE cpf_cnpj = '222.333.444-55' AND user_id = v_user_id;
    IF v_client_id_2 IS NULL THEN
        INSERT INTO clientes (id, name, email, phone, cpf_cnpj, birth_date, address, city, state, cep, status, user_id)
        VALUES (gen_random_uuid(), 'Carlos Oliveira', 'carlos.oliveira@email.com', '(11) 97777-2222', '222.333.444-55', '1990-07-22', 'Rua Augusta, 500', 'São Paulo', 'SP', '01305-000', 'Ativo', v_user_id)
        RETURNING id INTO v_client_id_2;
    END IF;
    
    -- Cliente 3
    SELECT id INTO v_client_id_3 FROM clientes WHERE cpf_cnpj = '333.444.555-66' AND user_id = v_user_id;
    IF v_client_id_3 IS NULL THEN
        INSERT INTO clientes (id, name, email, phone, cpf_cnpj, birth_date, address, city, state, cep, status, user_id)
        VALUES (gen_random_uuid(), 'Ana Costa', 'ana.costa@email.com', '(11) 97777-3333', '333.444.555-66', '1978-11-08', 'Rua Oscar Freire, 200', 'São Paulo', 'SP', '01426-000', 'Ativo', v_user_id)
        RETURNING id INTO v_client_id_3;
    END IF;
    
    -- Cliente 4
    SELECT id INTO v_client_id_4 FROM clientes WHERE cpf_cnpj = '444.555.666-77' AND user_id = v_user_id;
    IF v_client_id_4 IS NULL THEN
        INSERT INTO clientes (id, name, email, phone, cpf_cnpj, birth_date, address, city, state, cep, status, user_id)
        VALUES (gen_random_uuid(), 'Pedro Ferreira', 'pedro.ferreira@email.com', '(11) 97777-4444', '444.555.666-77', '1982-05-30', 'Av. Faria Lima, 3000', 'São Paulo', 'SP', '04538-132', 'Ativo', v_user_id)
        RETURNING id INTO v_client_id_4;
    END IF;
    
    -- Cliente 5
    SELECT id INTO v_client_id_5 FROM clientes WHERE cpf_cnpj = '11.222.333/0001-44' AND user_id = v_user_id;
    IF v_client_id_5 IS NULL THEN
        INSERT INTO clientes (id, name, email, phone, cpf_cnpj, birth_date, address, city, state, cep, status, user_id)
        VALUES (gen_random_uuid(), 'Empresa ABC LTDA', 'contato@empresaabc.com', '(11) 3333-4444', '11.222.333/0001-44', NULL, 'Av. Brigadeiro, 1500', 'São Paulo', 'SP', '01452-000', 'Ativo', v_user_id)
        RETURNING id INTO v_client_id_5;
    END IF;
    
    -- =====================================================
    -- 6. APÓLICES
    -- =====================================================
    -- Apólice 1 - Auto (Vigente)
    INSERT INTO apolices (id, policy_number, client_id, insurance_company, ramo_id, producer_id, brokerage_id, premium_value, commission_rate, start_date, expiration_date, status, renewal_status, user_id)
    VALUES (gen_random_uuid(), 'AUTO-2024-001', v_client_id_1, v_company_id, v_ramo_auto_id, v_producer_id, v_brokerage_id, 3500.00, 15.00, '2026-01-01', '2027-01-01', 'Ativa', 'Pendente', v_user_id)
    RETURNING id INTO v_policy_id_1;
    
    -- Apólice 2 - Residencial (Vigente)
    INSERT INTO apolices (id, policy_number, client_id, insurance_company, ramo_id, producer_id, brokerage_id, premium_value, commission_rate, start_date, expiration_date, status, renewal_status, user_id)
    VALUES (gen_random_uuid(), 'RES-2024-002', v_client_id_2, v_company_id_2, v_ramo_residencial_id, v_producer_id, v_brokerage_id, 1800.00, 20.00, '2026-02-01', '2027-02-01', 'Ativa', 'Pendente', v_user_id)
    RETURNING id INTO v_policy_id_2;
    
    -- Apólice 3 - Vida (Vigente, vence este mês)
    INSERT INTO apolices (id, policy_number, client_id, insurance_company, ramo_id, producer_id, brokerage_id, premium_value, commission_rate, start_date, expiration_date, status, renewal_status, user_id)
    VALUES (gen_random_uuid(), 'VIDA-2024-003', v_client_id_3, v_company_id, v_ramo_vida_id, v_producer_id, v_brokerage_id, 2200.00, 25.00, '2025-02-15', '2026-02-15', 'Ativa', 'Em Contato', v_user_id)
    RETURNING id INTO v_policy_id_3;
    
    -- Apólice 4 - Auto (Vencendo em 30 dias)
    INSERT INTO apolices (id, policy_number, client_id, insurance_company, ramo_id, producer_id, brokerage_id, premium_value, commission_rate, start_date, expiration_date, status, renewal_status, user_id)
    VALUES (gen_random_uuid(), 'AUTO-2024-004', v_client_id_4, v_company_id_2, v_ramo_auto_id, v_producer_id, v_brokerage_id, 4200.00, 15.00, '2025-03-06', '2026-03-06', 'Ativa', 'Pendente', v_user_id)
    RETURNING id INTO v_policy_id_4;
    
    -- Apólice 5 - Empresarial (Vigente)
    INSERT INTO apolices (id, policy_number, client_id, insurance_company, ramo_id, producer_id, brokerage_id, premium_value, commission_rate, start_date, expiration_date, status, renewal_status, user_id)
    VALUES (gen_random_uuid(), 'EMP-2024-005', v_client_id_5, v_company_id, v_ramo_empresarial_id, v_producer_id, v_brokerage_id, 15000.00, 18.00, '2026-01-15', '2027-01-15', 'Ativa', 'Pendente', v_user_id)
    RETURNING id INTO v_policy_id_5;
    
    -- =====================================================
    -- 7. CONTAS BANCÁRIAS
    -- =====================================================    -- Conta 1 - Banco do Brasil
    INSERT INTO bank_accounts (id, user_id, bank_name, account_number, agency, account_type, current_balance, created_at, updated_at, is_active)
    VALUES (gen_random_uuid(), v_user_id, 'Banco do Brasil', '12345-6', '0001', 'corrente', 45000.00, NOW(), NOW(), true)
    RETURNING id INTO v_bank_account_id_1;
    
    -- Conta 2 - Nubank
    INSERT INTO bank_accounts (id, user_id, bank_name, account_number, agency, account_type, current_balance, created_at, updated_at, is_active)
    VALUES (gen_random_uuid(), v_user_id, 'Nubank', '987654-1', '0001', 'corrente', 12500.50, NOW(), NOW(), true)
    RETURNING id INTO v_bank_account_id_2;
    
    -- =====================================================
    -- 8. CONTAS FINANCEIRAS (PLANO DE CONTAS)
    -- =====================================================
    -- Conta de Receitas
    INSERT INTO financial_accounts (id, code, name, type, description, user_id)
    VALUES (gen_random_uuid(), '3.1', 'Comissões Recebidas', 'revenue', 'Receitas de comissões de seguros', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_fin_account_receita;
    
    IF v_fin_account_receita IS NULL THEN
        SELECT id INTO v_fin_account_receita FROM financial_accounts WHERE code = '3.1' AND user_id = v_user_id LIMIT 1;
    END IF;
    
    -- Conta de Despesas
    INSERT INTO financial_accounts (id, code, name, type, description, user_id)
    VALUES (gen_random_uuid(), '4.1', 'Despesas Operacionais', 'expense', 'Despesas gerais da operação', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_fin_account_despesa;
    
    IF v_fin_account_despesa IS NULL THEN
        SELECT id INTO v_fin_account_despesa FROM financial_accounts WHERE code = '4.1' AND user_id = v_user_id LIMIT 1;
    END IF;
    
    -- Conta Bancária (Ativo)
    INSERT INTO financial_accounts (id, code, name, type, description, user_id)
    VALUES (gen_random_uuid(), '1.1.01', 'Caixa Banco do Brasil', 'asset', 'Conta corrente BB', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_fin_account_banco;
    
    IF v_fin_account_banco IS NULL THEN
        SELECT id INTO v_fin_account_banco FROM financial_accounts WHERE code = '1.1.01' AND user_id = v_user_id LIMIT 1;
    END IF;

    -- Contas a Receber
    INSERT INTO financial_accounts (id, code, name, type, description, user_id)
    VALUES (gen_random_uuid(), '1.1.02', 'Contas a Receber', 'asset', 'Valores a receber de clientes/seguradoras', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_fin_account_a_receber;
    
    IF v_fin_account_a_receber IS NULL THEN
        SELECT id INTO v_fin_account_a_receber FROM financial_accounts WHERE code = '1.1.02' AND user_id = v_user_id LIMIT 1;
    END IF;

    -- Contas a Pagar
    INSERT INTO financial_accounts (id, code, name, type, description, user_id)
    VALUES (gen_random_uuid(), '2.1.01', 'Contas a Pagar', 'liability', 'Obrigações a pagar', v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_fin_account_a_pagar;

    IF v_fin_account_a_pagar IS NULL THEN
        SELECT id INTO v_fin_account_a_pagar FROM financial_accounts WHERE code = '2.1.01' AND user_id = v_user_id LIMIT 1;
    END IF;
    
    -- =====================================================
    -- 9. TRANSAÇÕES FINANCEIRAS (RECEITAS)
    -- =====================================================
    -- Comissão recebida - Apólice 1
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, related_entity_type, related_entity_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Comissão - AUTO-2024-001 (Maria Santos)', '2026-01-15', 'completed', v_bank_account_id_1, 'policy', v_policy_id_1, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_banco, 525.00, 'D - Entrada em caixa'),
        (v_transaction_id, v_fin_account_receita, -525.00, 'C - Comissão 15% de R$3.500');
    
    -- Comissão recebida - Apólice 2
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, related_entity_type, related_entity_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Comissão - RES-2024-002 (Carlos Oliveira)', '2026-02-01', 'completed', v_bank_account_id_1, 'policy', v_policy_id_2, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_banco, 360.00, 'D - Entrada em caixa'),
        (v_transaction_id, v_fin_account_receita, -360.00, 'C - Comissão 20% de R$1.800');
    
    -- Comissão recebida - Apólice 5 (Empresarial)
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, related_entity_type, related_entity_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Comissão - EMP-2024-005 (Empresa ABC)', '2026-01-20', 'completed', v_bank_account_id_2, 'policy', v_policy_id_5, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_banco, 2700.00, 'D - Entrada em caixa'),
        (v_transaction_id, v_fin_account_receita, -2700.00, 'C - Comissão 18% de R$15.000');
    
    -- =====================================================
    -- 10. TRANSAÇÕES FINANCEIRAS (PENDENTES - A RECEBER)
    -- =====================================================
    -- Comissão a receber - Apólice 3
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, related_entity_type, related_entity_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Comissão a Receber - VIDA-2024-003 (Ana Costa)', '2026-02-15', 'pending', NULL, 'policy', v_policy_id_3, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_a_receber, 550.00, 'D - Valores a Receber'),
        (v_transaction_id, v_fin_account_receita, -550.00, 'C - Receita Diferida');
    
    -- Comissão a receber - Apólice 4 (parcela 1)
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, related_entity_type, related_entity_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Comissão a Receber (1/3) - AUTO-2024-004 (Pedro Ferreira)', '2026-03-06', 'pending', NULL, 'policy', v_policy_id_4, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_a_receber, 210.00, 'D - Parc 1 a Receber'),
        (v_transaction_id, v_fin_account_receita, -210.00, 'C - Receita Parc 1');
    
    -- Comissão a receber - Apólice 4 (parcela 2)
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, related_entity_type, related_entity_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Comissão a Receber (2/3) - AUTO-2024-004 (Pedro Ferreira)', '2026-04-06', 'pending', NULL, 'policy', v_policy_id_4, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_a_receber, 210.00, 'D - Parc 2 a Receber'),
        (v_transaction_id, v_fin_account_receita, -210.00, 'C - Receita Parc 2');
    
    -- Comissão a receber - Apólice 4 (parcela 3)
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, related_entity_type, related_entity_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Comissão a Receber (3/3) - AUTO-2024-004 (Pedro Ferreira)', '2026-05-06', 'pending', NULL, 'policy', v_policy_id_4, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_a_receber, 210.00, 'D - Parc 3 a Receber'),
        (v_transaction_id, v_fin_account_receita, -210.00, 'C - Receita Parc 3');
    
    -- =====================================================
    -- 11. TRANSAÇÕES FINANCEIRAS (DESPESAS)
    -- =====================================================
    -- Aluguel do escritório
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Aluguel Escritório - Janeiro/2026', '2026-01-05', 'completed', v_bank_account_id_1, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_banco, -3200.00, 'D - Saída de caixa'),
        (v_transaction_id, v_fin_account_despesa, 3200.00, 'C - Despesa com aluguel');
    
    -- Aluguel do escritório - Fevereiro (pendente)
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Aluguel Escritório - Fevereiro/2026', '2026-02-05', 'pending', NULL, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_despesa, 3200.00, 'D - Despesa de Aluguel'),
        (v_transaction_id, v_fin_account_a_pagar, -3200.00, 'C - Contas a Pagar');
    
    -- Internet e Telefone
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Internet e Telefone - Janeiro/2026', '2026-01-10', 'completed', v_bank_account_id_1, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_banco, -450.00, 'D - Saída de caixa'),
        (v_transaction_id, v_fin_account_despesa, 450.00, 'C - Despesa telecom');
    
    -- Contador
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Serviços Contábeis - Janeiro/2026', '2026-01-15', 'completed', v_bank_account_id_2, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_banco, -800.00, 'D - Saída de caixa'),
        (v_transaction_id, v_fin_account_despesa, 800.00, 'C - Despesa contador');
    
    -- Impostos DAS
    INSERT INTO financial_transactions (id, description, transaction_date, status, bank_account_id, user_id, created_by)
    VALUES (gen_random_uuid(), 'Impostos DAS - Janeiro/2026', '2026-01-20', 'completed', v_bank_account_id_1, v_user_id, v_user_id)
    RETURNING id INTO v_transaction_id;
    
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES 
        (v_transaction_id, v_fin_account_banco, -1850.00, 'D - Saída de caixa'),
        (v_transaction_id, v_fin_account_despesa, 1850.00, 'C - Impostos');
    
    -- =====================================================
    -- 12. AGENDAMENTOS/COMPROMISSOS
    -- =====================================================
    INSERT INTO appointments (id, title, date, time, status, priority, notes, client_id, policy_id, user_id)
    VALUES 
        (gen_random_uuid(), 'Renovação apólice Maria Santos', '2026-02-10', '10:00', 'Pendente', 'Alta', 'Ligar para confirmar interesse na renovação', v_client_id_1, v_policy_id_1, v_user_id),
        (gen_random_uuid(), 'Visita cliente Carlos Oliveira', '2026-02-12', '14:30', 'Pendente', 'Média', 'Apresentar novos produtos', v_client_id_2, NULL, v_user_id),
        (gen_random_uuid(), 'Cotação empresarial ABC', '2026-02-08', '09:00', 'Pendente', 'Alta', 'Ampliar cobertura', v_client_id_5, v_policy_id_5, v_user_id),
        (gen_random_uuid(), 'Reunião semanal equipe', '2026-02-07', '08:00', 'Pendente', 'Baixa', 'Pauta: metas do mês', NULL, NULL, v_user_id);
    
    -- =====================================================
    -- 13. MÉTRICAS DIÁRIAS (ÚLTIMOS 30 DIAS)
    -- =====================================================
    INSERT INTO daily_metrics (date, apolices_novas, apolices_perdidas, renovacoes, auto_value, residencial_value, saude_value, empresarial_value, outros_value, sync_status, user_id)
    VALUES 
        ('2026-01-05', 2, 0, 1, 3500.00, 0, 0, 0, 0, 'synced', v_user_id),
        ('2026-01-10', 1, 0, 0, 0, 1800.00, 0, 0, 0, 'synced', v_user_id),
        ('2026-01-15', 1, 0, 2, 0, 0, 2200.00, 0, 0, 'synced', v_user_id),
        ('2026-01-20', 2, 1, 1, 4200.00, 0, 0, 15000.00, 0, 'synced', v_user_id),
        ('2026-01-25', 0, 0, 3, 2800.00, 1500.00, 0, 0, 0, 'synced', v_user_id),
        ('2026-02-01', 1, 0, 1, 0, 2100.00, 0, 0, 1200.00, 'synced', v_user_id),
        ('2026-02-04', 0, 0, 0, 0, 0, 0, 0, 0, 'pending', v_user_id)
    ON CONFLICT DO NOTHING;
    
    -- =====================================================
    -- 14. METAS FINANCEIRAS
    -- =====================================================
    INSERT INTO financial_goals (id, user_id, month, year, goal_amount, goal_type, description, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), v_user_id, 2, 2026, 50000.00, 'revenue', 'Meta de faturamento Fevereiro', NOW(), NOW()),
        (gen_random_uuid(), v_user_id, 1, 2026, 45000.00, 'revenue', 'Meta de faturamento Janeiro', NOW(), NOW());

    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'DADOS DE TESTE CRIADOS COM SUCESSO!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Resumo:';
    RAISE NOTICE '  - 1 Corretora';
    RAISE NOTICE '  - 4 Seguradoras';
    RAISE NOTICE '  - 4 Ramos de Seguro';
    RAISE NOTICE '  - 1 Produtor';
    RAISE NOTICE '  - 5 Clientes';
    RAISE NOTICE '  - 5 Apólices';
    RAISE NOTICE '  - 2 Contas Bancárias';
    RAISE NOTICE '  - 3 Contas Financeiras';
    RAISE NOTICE '  - 3 Receitas Recebidas';
    RAISE NOTICE '  - 4 Receitas a Receber';
    RAISE NOTICE '  - 5 Despesas (4 pagas, 1 pendente)';
    RAISE NOTICE '  - 4 Agendamentos';
    RAISE NOTICE '  - Métricas dos últimos 30 dias';
    RAISE NOTICE '=====================================================';
    
END $$;
