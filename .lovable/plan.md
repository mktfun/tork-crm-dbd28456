

# Limpar Financeiro + Corrigir "undefined" + Tesouraria independente de período

## Diagnóstico

1. **249 transações sem banco vinculado**: São 246 `paid`+`confirmed`+`reconciled` (134 despesas + 112 receitas) + 3 `commission_settlement` + 1 `completed`. Todas já estão 100% processadas -- devem ser arquivadas para sumir do banner e do sistema.

2. **"undefined" na tesouraria**: A RPC `get_payable_receivable_transactions` faz `COALESCE(... a.insurance_company::TEXT ...)` onde `a.insurance_company` é um UUID (FK para `companies`), não o nome. Resultado: mostra o UUID como fallback ou "undefined" quando o join com `transactions` legado também falha. Além disso, há 4 registros PENDENTES na tabela legada `transactions` (3 sem `client_id`) com descrição "Comissão da apólice undefined".

3. **Tesouraria dependente de período**: Os KPIs de "Próx. Vencimentos" (`useUpcomingReceivables`) e "Aging Report" já são independentes de `dateRange` (não recebem esse parâmetro). Mas o `useReceivablesBySeguradora` consulta `financial_transactions` com filtro `is_confirmed = false AND reconciled = false`, que atualmente retorna 0 registros porque todas as txns desse usuário já estão confirmadas. O problema real é que as comissões pendentes vivem na tabela legada `transactions`, não em `financial_transactions`.

## Plano de Implementação

### 1. Migration SQL: Arquivar os 249+1 unbanked e limpar legado

```sql
-- Arquivar transações sem banco que já estão 100% processadas
UPDATE financial_transactions SET archived = true
WHERE user_id = '65b85549-c928-4513-8d56-a3ef41512dc8'
  AND bank_account_id IS NULL
  AND COALESCE(archived, false) = false;

-- Limpar as 4 transações legadas PENDENTES órfãs (duplicatas + "undefined")
DELETE FROM transactions
WHERE user_id = '65b85549-c928-4513-8d56-a3ef41512dc8'
  AND status = 'PENDENTE'
  AND nature = 'RECEITA'
  AND (description ILIKE '%undefined%' OR client_id IS NULL);
```

### 2. Migration SQL: Corrigir RPC `get_payable_receivable_transactions`

Substituir `a.insurance_company::TEXT` por um JOIN correto com `companies` para pegar o nome:
```sql
LEFT JOIN companies comp ON comp.id = a.insurance_company
-- No COALESCE:
COALESCE(c_trans.name, c_apolice.name, comp.name, fa.name, 'Não especificado')
```

Também adicionar filtro `AND COALESCE(ft.archived, false) = false` que está faltando nessa RPC.

### 3. Migration SQL: Corrigir RPC `get_upcoming_receivables`

Mesmo problema: falta `archived` filter e o entity_name pode retornar "undefined" pelo mesmo motivo. Adicionar filtro `AND COALESCE(ft.archived, false) = false` e corrigir o JOIN para resolver o nome via `companies`.

### 4. Frontend: Sem mudanças

Todos os componentes (`UpcomingTransactionsList`, `ReceivablesBySeguradora`, `AccountsPayableReceivableTable`, `ReconciliationPage`) já consomem os dados corretos. Após as correções nas RPCs + limpeza de dados, tudo ficará limpo.

## Resumo
- **1 migration**: Arquivar 250 unbanked txns + deletar 4 legadas órfãs + fix 2 RPCs (entity_name + archived filter)
- **0 mudanças frontend**

