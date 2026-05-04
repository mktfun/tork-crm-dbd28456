# Fix de Deleção de Transações e Bancos

O usuário relatou três problemas críticos (bugs visuais e estruturais) relacionados a ações de exclusão no módulo financeiro. O objetivo deste spec é detalhar a causa raiz e a solução para os 3 erros.

## User Stories / Problemas Relatados

1. **Bug 1: "Sumiu o botão de apagar os selecionados" (Gestão Financeira)**
   - **Causa:** Na nova barra de ação flutuante (`ReconciliationPage.tsx`), quando o usuário seleciona vários itens (extratos bancários), só existe o botão "Conciliar N". Foi esquecido o botão de exclusão em massa.
   - **Solução:** Adicionar um botão de "Excluir N" na `Floating Action Bar` quando itens estiverem selecionados. E criar a respectiva chamada na API (`useDeleteFinancialTransactions` / `useDeleteStatementEntries` em massa) que irá apagar as pendências inúteis selecionadas.

2. **Bug 2: Erro ao Excluir Banco em Configurações (`migrate_and_delete_bank`)**
   - **Causa:** Ao tentar apagar uma conta bancária inativa, o painel aciona a função Supabase RPC `migrate_and_delete_bank`. Porém, este procedimento (`function`) não existe no banco de dados (provavelmente não foi incluso na migration final).
   - **Solução:** Criar o procedimento `migrate_and_delete_bank` via script/migration. A função deve atualizar as transações associadas ao banco (migrando-as para outro ou deixando nulo) e então deletar o banco com segurança.

3. **Bug 3: Erro ao excluir extrato OFX inteiro (Restrição de Chave Estrangeira)**
   - **Causa:** Na tela de "Histórico de Importações", tentar excluir um lote (OFX) que já tem transações parcialmente conciliadas gera um erro de ForeignKey (`financial_transactions_reconciled_statement_id_fkey`). O banco de dados impede deletar a linha pai de `bank_statement_entries` porque ela está sendo usada em `financial_transactions`.
   - **Solução:** Modificar a restrição de FK no banco de dados (`ALTER TABLE financial_transactions ...`) para incluir a cláusula `ON DELETE SET NULL`. Assim, ao deletar o lote OFX, as transações no sistema perdem a associação (voltam a ficar pendentes) ao invés de quebrarem e travarem o processo.

## Proposed Changes

### Componentes de UI

#### [MODIFY] src/features/finance/components/reconciliation/ReconciliationPage.tsx
- Adicionar o ícone de lixeira (Trash2) e a lógica de botão "Excluir N selecionados" ao lado de "Conciliar N".
- Incorporar a mutação respectiva e `AlertDialog` de confirmação.

### Backend & Migrations

#### [NEW] supabase/migrations/20260504193000_fix_finance_deletions.sql
- Cria a RPC `migrate_and_delete_bank(p_source_bank_id uuid, p_target_bank_id uuid)` para repassar saldo e transações (ou apagar) e deletar o banco.
- Executa o `ALTER TABLE` na foreign key do OFX para adicionar `ON DELETE SET NULL`.

## Verification Plan

### Testes Manuais
- Acessar a tela do Extrato, marcar registros avulsos e clicar em "Excluir" na barra inferior.
- Tentar deletar uma importação de OFX pela tela de histórico que contém reconciliações (deverá deletar o OFX sem erro e apenas desvincular o item).
- Tentar deletar um banco pela interface.
