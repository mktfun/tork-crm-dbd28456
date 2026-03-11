

# Plano: Arquivar Legado + Corrigir Fluxo de Conciliação

## 1. Arquivar ~447k de comissões legadas (arquivo morto)

**Migration SQL**: Adicionar coluna `archived boolean DEFAULT false` na tabela `financial_transactions` e marcar como `archived = true` todas as transações legadas dessa conta.

```sql
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
UPDATE financial_transactions SET archived = true 
WHERE user_id = '65b85549-c928-4513-8d56-a3ef41512dc8' 
AND related_entity_type = 'legacy_transaction';
```

Atualizar **todas as queries financeiras** (KPIs, DRE, gráficos, tesouraria, provisões) para filtrar `archived = false` (ou `archived IS NOT TRUE`), garantindo que essas 687 transações (~447k) não apareçam em lugar nenhum.

**Hooks afetados**: `useFinancialSummary`, `useCashFlowData`, RPCs de reconciliação (`get_reconciliation_kpis`, `get_pending_reconciliation`), views de KPI da tesouraria.

---

## 2. Corrigir fluxo de conciliação no Workbench

### Problema atual
O modal de "Criar Despesa/Receita" (`showCreateModal`) só pede categoria. Falta pedir **banco** e **nome do responsável**. A conciliação direta também não pede nome.

### Correções no `ReconciliationWorkbench.tsx`

**A) Ao clicar "Conciliar" (itens sem banco):**
O modal já existe (`showBankModal`), mas precisa incluir:
- Campo de **categoria** (receita/despesa) — já existe no create modal, precisa replicar
- Campo de **banco** — já existe
- Campo de **nome do responsável** (input text) — NOVO

**B) Ao clicar "Criar Despesa/Receita" (extrato sem match no sistema):**
O modal `showCreateModal` precisa incluir:
- Campo de **banco de destino** — NOVO (Select com bankAccounts)
- Campo de **nome do responsável** — NOVO (Input text)

**C) Ao confirmar qualquer conciliação:**
Registrar no `bank_import_history` ou nova tabela `reconciliation_audit_log` os detalhes:
- Quem conciliou (nome informado)
- IDs do extrato e da transação do sistema
- Valor conciliado
- Banco de destino
- Data/hora
- Tipo de ação (conciliação, criação, FIFO, parcial)

### Nova tabela: `reconciliation_audit_log`
```
id uuid PK
user_id uuid
action_type text (reconcile, create, partial, fifo, aggregate)
statement_entry_id uuid nullable
system_transaction_id uuid nullable
bank_account_id uuid nullable
amount numeric
operator_name text
details jsonb
created_at timestamptz
```

---

## 3. Importação de extrato — manter sem banco

O `StatementImporter` já suporta `bankAccountId = null` (Lazy Import). O fluxo atual está correto: quando importa sem banco selecionado, os entries ficam com `bank_account_id = NULL`. Verificar que na `ReconciliationPage` o botão "Nova Importação" passa `null` quando nenhum banco está selecionado.

---

## 4. Histórico detalhado

Na aba "Histórico" do `ReconciliationPage`, ao clicar "Ver Detalhes" de um batch, além das transações importadas, exibir os registros do `reconciliation_audit_log` relacionados (via `statement_entry_id` dos entries daquele batch), mostrando:
- Quem conciliou cada item
- Para qual banco foi
- Quando
- Valor

---

## Resumo de entregas
1. **1 migration**: coluna `archived` + arquivar legado + tabela `reconciliation_audit_log`
2. **Frontend**: Expandir modais de conciliação/criação com campo de banco + nome do responsável
3. **Frontend**: Filtrar `archived` em hooks/queries financeiros
4. **Frontend**: Exibir audit log no histórico de importação

