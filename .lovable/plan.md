
# Auditoria dos KPIs da Tela de Conciliacao

## Discrepancias Identificadas (com evidencia SQL)

### BUG 1 (CRITICO): Contagem "Registros Encontrados" vs "Progresso" Divergentes

**Evidencia no screenshot**: O header da lista mostra **488 registros encontrados** mas o card de Progresso mostra **298 de 388 conciliados**. Sao duas fontes diferentes:
- "488 registros" vem da RPC `get_bank_statement_paginated` (campo `total_count` via `COUNT(*) OVER()`)
- "388 total / 298 conciliados" vem da RPC `get_reconciliation_kpis` (campo `total_count`)

Ambas as RPCs usam os mesmos filtros base (user_id, banco, datas, is_void). Porem a lista aplica `p_status` e `p_type` como filtros adicionais (mesmo quando "todas/todos" deveria ser identico). A divergencia de 100 itens (488 vs 388) indica que uma das RPCs tem um filtro extra ou diferente.

**Causa provavel**: A RPC paginada faz LEFT JOIN com `bank_statement_entries` e `profiles` que pode gerar duplicatas via `string_agg` no ledger. Ou a KPI RPC nao filtra por `status IN ('confirmed','completed')` enquanto a lista nao filtra por isso tambem -- porem alguma diferenca sutil no WHERE causa a divergencia.

**Correcao**: Unificar: a KPI RPC deve usar EXATAMENTE a mesma CTE/WHERE da lista paginada (sem os filtros de status/type). Alternativamente, adicionar um campo `kpi_total_count` na propria RPC paginada para garantir fonte unica.

---

### BUG 2 (ALTO): Periodo Anterior Removido -- Trends Sempre Nulos

**Diagnostico**: A versao mais recente de `get_reconciliation_kpis` (migration `20260219141008`) removeu completamente o calculo do periodo anterior. O JSON retornado so tem `current`, sem `previous`. No frontend (linhas 293-300), `calcTrend` sempre retorna `null` porque `previousKpis` esta vazio.

**Impacto**: Os badges de tendencia ("+X% vs periodo anterior") nunca aparecem. A comparacao temporal esta desabilitada silenciosamente.

**Correcao**: Restaurar o bloco de periodo anterior na RPC, calculando `v_prev_start` e `v_prev_end` da mesma forma que `get_financial_summary` faz (subtraindo a duracao do periodo).

---

### BUG 3 (MEDIO): Modo Consolidado Infla KPIs com Transacoes Sem Banco

**Evidencia SQL**: Existem **170 transacoes sem bank_account_id** no periodo Dec-Feb, sendo 105 delas marcadas como `reconciled = true`. Quando filtrado para "Consolidado (Todos)", tanto a KPI quanto a lista incluem essas 170 transacoes.

```text
Scope               | Total | Reconciled | Pending
all_transactions     |  497  |    432     |   65
with_bank_only       |  327  |    327     |    0
```

Todos os 65 pendentes sao transacoes SEM banco! Elas aparecem como "aguardando conciliacao" mas nao podem ser conciliadas porque nao estao vinculadas a nenhum banco. O progresso (77%) e artificialmente baixo.

**Correcao**: No modo consolidado, filtrar apenas transacoes COM `bank_account_id IS NOT NULL` na RPC de KPIs e na lista paginada. Alternativamente, separar os KPIs em "Com banco" vs "Sem banco" para dar visibilidade sem distorcer o progresso.

---

### BUG 4 (MEDIO): Type Variants Inconsistentes Entre RPCs

**Diagnostico**: A RPC `get_reconciliation_kpis` verifica `type = 'revenue'` e `type = 'expense'` (exato). Mas `get_financial_summary` e `get_bank_statement_paginated` verificam `type IN ('revenue', 'income', 'Entrada')` e `type IN ('expense', 'despesa', 'Saida')`.

**Status atual**: Nao ha dados com tipos legados (validado por query). Mas e uma brecha: se qualquer fluxo criar transacao com tipo diferente, a KPI de conciliacao vai ignorar.

**Correcao**: Alinhar o `get_reconciliation_kpis` para usar os mesmos IN-lists de tipo que as demais RPCs.

---

## Plano de Execucao

### Passo 1: Reescrever `get_reconciliation_kpis` (Migration SQL)
- Adicionar filtro `bank_account_id IS NOT NULL` quando em modo consolidado
- Restaurar calculo de periodo anterior (previous period)
- Alinhar type checks para `IN ('revenue', 'income', 'Entrada')` / `IN ('expense', 'despesa', 'Saida')`
- Manter assinatura identica (4 params)

### Passo 2: Alinhar "registros encontrados" com KPI total
- No `ReconciliationPage.tsx`, substituir `{totalCount} registros encontrados` por `{kpis.totalCount} registros encontrados` para usar a mesma fonte dos KPI cards
- Ou melhor: manter `totalCount` da lista paginada para refletir filtros ativos (status/tipo), e exibir separadamente "X de Y" nos KPIs

### Passo 3: Corrigir lista paginada para modo consolidado
- Na RPC `get_bank_statement_paginated`, quando `v_bank_uuid IS NULL`, adicionar `AND t.bank_account_id IS NOT NULL` para excluir transacoes sem banco da tela de conciliacao bancaria

### Passo 4: Validacao cruzada pos-correcao
- Query SQL comparando `total_count` do KPI vs `COUNT(*)` da lista com mesmos filtros
- Verificar que `reconciled_count + pending_count + ignored_count = total_count`
- Confirmar que progresso 100% quando todos os itens com banco estao conciliados
