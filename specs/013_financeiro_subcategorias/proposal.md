# Proposta: Correção de Gap no Extrato e Subcategorias (Plano de Contas)

## 1. Contexto e Problema
O usuário relatou dois problemas no módulo financeiro do CRM:
1. **Bug no Extrato:** Há um "gap" (transações ocultas/puladas) no mês de março no Extrato Bancário. Segundo o usuário, é um bug antigo que retornou.
2. **Feature de Subcategorias:** Necessidade de organizar as categorias financeiras de forma hierárquica (Categoria > Subcategoria) no Plano de Contas.

## 2. Diagnóstico Preliminar
- **Bug de Março:** O `get_bank_transactions` ordena por `transaction_date DESC`. O gap pode estar ocorrendo devido a transações não possuírem `bank_account_id` associado, filtragem indevida de status, ou problemas de cálculo de paginação que excluem março se as datas de fevereiro passarem num limite de offset bizarro. Também validaremos o estado `is_void` e `reconciled`.
- **Subcategorias:** A tabela `financial_accounts` já possui suporte no modelo de dados (`parentId?: string | null` referenciando ela mesma). O desafio é essencialmente de **Frontend**: adicionar suporte de árvores/hierarquia nos seletores, na tabela de categorias e no formulário de criação/edição.

## 3. Solução Proposta (Feature-Sliced)

### Fase 1: Diagnóstico e Fix do Gap de Março
- **Ação:** Realizar uma query exploratória no banco para verificar as transações de março e suas flags (`is_void`, `bank_account_id`, `status`).
- **Fix:** Ajustar a query ou os dados pelo backend (Supabase SQL) para retornar corretamente o fluxo de data cronológica no extrato mensal, garantindo a visibilidade.

### Fase 2: Implementar Views de Subcategorias
- **Tabela/Lista:** Atualizar a visualização em "Configurações > Categorias" (Plano de Contas) para exibir subcategorias de forma identada/agrupada sob a categoria "mãe".
- **Nova Categoria:** Adicionar campo opcional "Categoria Pai" no modal de criação (`Nova Categoria Modal`).
- **Seletores de Transação:** Em `NovaDespesaModal` e `NovaReceitaModal`, atualizar o `<Select>` de categorias para apresentar com hierarquia (identação visual - ex: `Despesa Administrativa > Material de Escritório`).

## 4. O que NÂO será feito (Escopo Negativo)
- Não criaremos uma tabela `subcategorias` nova no banco (iremos usar a coluna `parent_id` existente para manter a estrutura oficial do Ledger).
- Não faremos refatoração massiva da contabilidade de Partidas Dobradas.
