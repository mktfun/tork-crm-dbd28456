
# Correcao: Regra de Baixa Parcial com Fallback por Descricao

## Problema

A funcao `hasManualSystemItems` (linha 306 do Workbench) bloqueia baixa parcial quando `related_entity_type` nao e `'policy'` nem `'legacy_transaction'`. Comissoes automaticas que chegam com `related_entity_type = null` (campo ausente ou nao preenchido) sao erroneamente tratadas como manuais.

## Solucao

Duas alteracoes cirurgicas:

### Arquivo 1: `src/hooks/useReconciliation.ts`

**Alteracao A** - Adicionar `is_automatic_commission` a interface `PendingReconciliationItem` (apos linha 44):

```typescript
is_automatic_commission?: boolean;
```

**Alteracao B** - No mapeamento dos system items (linhas 174-200), calcular o campo derivado:

```typescript
const entityType = item.related_entity_type ?? null;
const isKnownCommission = 
  entityType === 'policy' || 
  entityType === 'legacy_transaction' ||
  (item.description && (
    item.description.toLowerCase().startsWith('comissão') ||
    item.description.toLowerCase().startsWith('comissao')
  ));

return {
  // ... campos existentes ...
  related_entity_type: entityType,
  is_automatic_commission: !!isKnownCommission,
};
```

### Arquivo 2: `src/components/financeiro/reconciliation/ReconciliationWorkbench.tsx`

**Alteracao C** - Substituir a logica de `hasManualSystemItems` (linhas 299-308) para usar `is_automatic_commission`:

```typescript
const hasManualSystemItems = useMemo(() => {
  if (selectedSystemIds.length === 0) return false;
  return selectedSystemIds.some(id => {
    const item = systemItems.find(i => i.id === id);
    if (!item) return false;
    // Se e comissao automatica (por tipo OU por descricao), permite parcial
    if (item.is_automatic_commission) return false;
    // Caso contrario, e manual → bloqueia parcial
    return true;
  });
}, [selectedSystemIds, systemItems]);
```

## Resultado

| Cenario | Antes | Depois |
|---|---|---|
| "Comissao: Aleksandra - Auto" (entity_type=legacy) | Bloqueado | Permitido |
| "Comissao da apolice 0051883" (entity_type=null, descricao comeca com "Comissao") | Bloqueado | Permitido (fallback) |
| "TESTE123565" (entity_type=null, descricao manual) | Bloqueado | Bloqueado (correto) |
| Comissao com entity_type='policy' | Permitido | Permitido |

Nenhuma alteracao em RPCs, modal ou logica de partidas dobradas.
