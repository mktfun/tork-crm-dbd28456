# Spec 019 — Financeiro: Correção de KPIs, Filtros e Gráficos

## Contexto e Diagnóstico

O usuário identificou três problemas críticos no módulo financeiro do Tork CRM:

1. **KPI "Recebido no Período" sempre mostra R$71.733,76** — independente de filtrar Janeiro, Fevereiro, Março ou o trimestre inteiro. Isso não é coerente pois a conciliação Jan-Mar deveria mostrar ~R$200k considerando todas as entradas bancárias conciliadas.

2. **DRE exibe dados de Janeiro ao filtrar Março** — a coluna "Mar" está zerada no DRE mas os R$71k aparecem em "Jan", enquanto o cabeçalho da página exibe "01 mar - 31 mar". O DRE não respeita o filtro de data da página.

3. **Gráfico de Fluxo de Caixa quebrado** — o gráfico mostra "Nenhum dado disponível para o período" mesmo com dados existentes no banco. Isso aconteceu após atualizações do Lovable.

---

## Diagnóstico Técnico (Root Cause)

### Bug 1 — KPI com filtro de data incoerente

**Causa raiz provável:** Existem duas fontes de dados desconexas:

| Fonte | Tabelas | Quem usa | Valor |
|-------|---------|----------|-------|
| ERP Financeiro | `financial_transactions` + `financial_ledger` | KPIs, DRE, Fluxo | R$71k (só Jan) |
| Conciliação Bancária | `bank_accounts` + `bank_transactions` | Tela de Bancos | R$136k (correto) |

A conciliação importa registros para `bank_transactions` com `reconciled = true`, mas **NÃO cria os lançamentos correspondentes em `financial_transactions` + `financial_ledger`**. Assim os R$71k que aparecem no KPI são apenas as comissões de Janeiro lançadas manualmente via a tabela `transactions` legada, enquanto todas as entradas bancárias conciliadas (de Fev e Mar) ficam invisíveis para o ERP.

Isso explica por que: mudar o filtro para qualquer período sempre retorna os mesmos R$71k — porque todas as `financial_transactions` existem apenas em Janeiro.

### Bug 2 — DRE ignorando filtro de data

**Causa:** No `FinanceiroERP.tsx`, o `DreTab` é renderizado como `<DreTab />` sem receber as props `startDate`/`endDate`. Internamente, `<DreTable />` chama `getDreData(year)` com apenas o **ano** como parâmetro e retorna os 12 meses fixos. O filtro do cabeçalho não chega ao DRE.

### Bug 3 — Gráficos vazios

**Causa:** O `get_cash_flow_data` busca dados do `financial_ledger`. Como o ledger está incompleto (só tem Jan), ao filtrar Março o gráfico não tem dados para exibir. Após correção do Bug 1, o gráfico deve funcionar automaticamente.

---

## O que JÁ EXISTE e será REUTILIZADO

| Artefato | Local | Papel |
|----------|-------|-------|
| `get_financial_summary` RPC | migração `20260218193000` | KPI — precisa de dados no ledger |
| `get_cash_flow_data` RPC | migration existente | Gráfico — idem |
| `get_dre_data` RPC | `financialService.ts` L463 | DRE — recebe só `year`, precisa extend |
| `DreTable` component | `src/components/financeiro/DreTable.tsx` | Existe, autônomo |
| `DreTab` function | `FinanceiroERP.tsx` L181 | Existe, não passa filtro |
| `CashFlowChart` | `src/components/financeiro/CashFlowChart.tsx` | OK visualmente |
| `useReconciliation` hook | `src/features/finance/api/useReconciliation.ts` | Principal candidato ao fix do Bug 1 |
| `financial_transactions` + `financial_ledger` | Banco | Estrutura OK, faltam dados |
| `bank_transactions` | Banco | Tem os dados reais |

---

## Plano de Execução

### Fase 1 — Diagnóstico SQL (sem código, confirma a hipótese)
Rodar via Supabase MCP:
- Count de `financial_transactions` no período Jan-Mar
- Count de `bank_transactions` reconciliados no período Jan-Mar
- Verificar se há link entre `bank_transactions` e `financial_transactions`

### Fase 2 — Sincronização Retroativa (Migration SQL)
Criar migration que:
- Busca todos os `bank_transactions` com `reconciled = true` que NÃO têm correspondente em `financial_transactions`
- Para cada um, cria o `financial_transaction` + `financial_ledger` entries corretos (crédito na conta de receita, débito no banco)

### Fase 3 — Fix do Pipeline da Conciliação (Migration RPC)
Garantir que a RPC/hook de conciliação **crie automaticamente** os lançamentos no ledger ao reconciliar.

### Fase 4 — Fix do DRE (Frontend + Backend)
- [MODIFY] `FinanceiroERP.tsx` — passar `startDate`/`endDate` para `DreTab`
- [MODIFY] `DreTable.tsx` — aceitar `startDate`/`endDate` opcionais
- [MODIFY] `financialService.ts` — `getDreData` aceitar range de datas

---

## User Review Required

> [!IMPORTANT]
> **Confirmação antes de prosseguir:** O diagnóstico acima (Bug 1) supõe que a conciliação bancária **NÃO está criando lançamentos no financial_ledger**. Precisamos rodar o diagnóstico SQL da Fase 1 para confirmar isso antes de criar a migration de sincronização.
>
> **Posso ir direto para a execução, começando pelos diagnósticos SQL no banco?**

> [!WARNING]  
> A **Fase 2** (sincronização retroativa) vai criar lançamentos no `financial_ledger` e mudar os KPIs de R$71k para o valor real (~R$200k+). Esta é uma mudança de dados irreversível. Confirme antes de executar.

---

## Critérios de Aceite

- ✅ Filtro Jan-Mar → KPI mostra valor real próximo de R$200k+
- ✅ Filtro só Março → KPI mostra apenas receitas de Março
- ✅ Filtro só Janeiro → KPI mostra apenas receitas de Janeiro  
- ✅ DRE com filtro Março → coluna "Mar" tem dados reais
- ✅ Gráfico de Fluxo de Caixa renderiza barras com dados
- ✅ Conciliações futuras alimentam automaticamente o financial_ledger
