

# Limpar importações duplicadas e corrigir visibilidade no Workbench

## Problema

Dois problemas encontrados:

1. **4 importações duplicadas** do mesmo arquivo OFX (`Bradesco_26022026_142747.OFX`), totalizando 776 entries (194 x 4). Mais 4 importações manuais antigas de teste.

2. **Filtro de data escondendo os dados**: O workbench usa `dateRange` que por padrão é o mês atual (março 2026), mas todas as entries do extrato são de **janeiro-fevereiro 2026**. Resultado: nada aparece.

## Plano

### Etapa 1 — Limpar banco de dados

Manter apenas o batch mais recente (`8eb8b8e7`) e deletar os outros 7 batches (3 duplicados do OFX + 4 manuais de teste):

- Deletar entries de `bank_statement_entries` dos batches removidos
- Deletar registros de `bank_import_history` correspondentes

### Etapa 2 — Corrigir filtro de data no Workbench consolidado

No modo consolidado (sem banco selecionado), **remover o filtro de data** da query de `bank_statement_entries` para que todos os itens pendentes apareçam independente do período. A data é relevante para a lista paginada, mas no workbench o objetivo é conciliar tudo que está pendente.

**Arquivo**: `src/features/finance/api/useReconciliation.ts` (~linhas 156-160)

Alterar a lógica para não aplicar filtro de data quando em modo consolidado:

```typescript
if (startDate && endDate && !isConsolidated) {
    statementQuery = statementQuery
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);
}
```

Isso garante que no workbench consolidado, todos os extratos pendentes (de qualquer data) apareçam para conciliação.

