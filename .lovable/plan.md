

# Plano: Corrigir constraint violation no auto-create deal

## Problema

O dispatcher insere deals com `last_sync_source: 'dispatcher'`, mas a tabela `crm_deals` tem um check constraint (`crm_deals_last_sync_source_check`) que só aceita `'crm'`, `'chatwoot'`, ou `null`.

Erro exato: `new row for relation "crm_deals" violates check constraint "crm_deals_last_sync_source_check"`

## Correção

Trocar `'dispatcher'` por `'crm'` nos 2 pontos do dispatcher:
- Linha 251: insert do deal (`last_sync_source: 'dispatcher'` → `'crm'`)
- Linha 387: update de stage (`last_sync_source: 'dispatcher'` → `'crm'`)

| Arquivo | Ação |
|---|---|
| `supabase/functions/chatwoot-dispatcher/index.ts` | Substituir `'dispatcher'` por `'crm'` em 2 linhas |

Sem migration. Sem mudança de frontend. Apenas 2 strings no dispatcher.

