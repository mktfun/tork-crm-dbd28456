

# Plano: Auditoria DRE completa e funcional

## Problemas identificados

1. **Valores não batem** — a query de auditoria não filtra `archived` (a view DRE usa `COALESCE(ft.archived, false) = false`), incluindo transações arquivadas que inflam o total
2. **Links de apólice não funcionam** — transações migradas têm `related_entity_type = 'legacy_transaction'` mas possuem `related_entity_id` apontando para a apólice. O código só verifica `origin === 'policy'`, ignorando as migradas
3. **Descrição crua** — registros legados mostram "Comissão da apólice 19-14201594" ao invés do nome do segurado

## Mudanças

### 1. `src/services/financialService.ts` — corrigir query

- Adicionar filtro `archived`: `.or('archived.is.null,archived.eq.false', { referencedTable: 'financial_transactions' })` para alinhar com a view DRE (`COALESCE(ft.archived, false) = false`)
- Manter `is_void = false` (ja existe)
- Resultado: valores da auditoria passam a bater com o DRE

### 2. `src/components/financeiro/DreAuditSheet.tsx` — links e UX

- **Expandir detecção de apólice**: considerar clicável quando `related_entity_id` existe E (`origin === 'policy'` OU `origin === 'legacy_transaction'`), pois ambos referenciam apólices
- **Badge de origem com cor**: colorir por tipo (verde para apólice, azul para extrato, cinza para manual, amarelo para migração)
- **Tooltip na linha**: mostrar "Clique para ver a apólice" nas linhas clicáveis

### 3. Descrição amigável (opcional, sem query extra)

- Para transações de migração com descrição tipo "Comissão da apólice XXXXX", manter como está (o nome do segurado não está disponível no registro legado sem query adicional)
- As transações novas já têm formato correto "Cliente (Ramo) - Seguradora"

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/services/financialService.ts` | Adicionar filtro `archived` na query |
| `src/components/financeiro/DreAuditSheet.tsx` | Links para apólice em transações legadas, melhorias visuais |

