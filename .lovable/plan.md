

# Plano: Link para apólice no audit do DRE

## O que muda

Quando uma transação no audit sheet do DRE veio de uma apólice (`origin === 'policy'`), a linha vira clicável e navega para `/dashboard/policies/{id}`.

## Mudanças

### 1. `src/services/financialService.ts` — incluir `related_entity_id` na query
- No select do `financial_transactions`, adicionar `related_entity_id`
- Mapear no retorno como `related_entity_id`

### 2. `src/components/financeiro/DreAuditSheet.tsx` — linha clicável
- Receber `related_entity_id` no tipo da transação
- Se `origin === 'policy'` e `related_entity_id` existe, envolver a linha (`TableRow`) com `onClick` que navega para `/dashboard/policies/${related_entity_id}`
- Adicionar ícone de link externo (`ExternalLink`) na linha para indicar que é clicável
- Estilo: `cursor-pointer hover:bg-muted/50` na row

| Arquivo | Ação |
|---|---|
| `src/services/financialService.ts` | Adicionar `related_entity_id` no select e retorno |
| `src/components/financeiro/DreAuditSheet.tsx` | Linhas de apólice clicáveis com navegação |

