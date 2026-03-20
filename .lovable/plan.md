

# Plano: Deal aparece sem F5 + etiqueta ao criar automático

## Bug 1 — Deal não aparece no Kanban sem F5

O Realtime está configurado corretamente em `useCRMDeals.ts` (linhas 284-308), filtrando por `user_id=eq.${user.id}`. O deal é inserido com o `user_id` correto pelo dispatcher.

**Possível causa**: O Realtime do Supabase exige que a tabela tenha `REPLICA IDENTITY FULL` para que mudanças via service_role (que bypassa RLS) sejam visíveis nos canais filtrados. Sem isso, o payload chega sem os valores das colunas e o filtro `user_id=eq.X` não bate.

**Correção**: Adicionar também invalidação periódica mais agressiva como fallback, e garantir que o `clientes` também invalide (pois o auto-register de cliente pode afetar). Além disso, invalidar `crm-deals` junto com `clients` no `useRealtimeClients.ts`.

**Alternativa mais robusta**: Após criar o deal no dispatcher, fazer um fetch direto do Supabase Realtime broadcast para forçar o update. Mas a solução mais simples é uma migration `ALTER TABLE crm_deals REPLICA IDENTITY FULL`.

## Bug 2 — Etiqueta não vai pro Chatwoot ao criar deal automático

**Causa raiz**: O dispatcher cria o deal (linha 242-254) mas:
1. **Não inclui `chatwoot_conversation_id`** no insert — esse campo fica `null`
2. **Não chama `chatwoot-sync`** para aplicar a etiqueta da stage

Quando o usuário move manualmente, o `useCRMDeals.ts` (linha 370) chama `chatwoot-sync` com `action: 'update_deal_stage'`, que aplica a label. Mas na criação automática ninguém faz essa chamada.

**Correção no dispatcher**: 
1. Adicionar `chatwoot_conversation_id: chatwootConversationId` no insert do deal
2. Após criar o deal, buscar a `chatwoot_label` da stage e aplicar direto na conversa via API do Chatwoot (o dispatcher já tem acesso às credenciais via brokerage)

## Mudanças

| Arquivo | Ação |
|---|---|
| `supabase/functions/chatwoot-dispatcher/index.ts` | (1) Adicionar `chatwoot_conversation_id` no insert do deal. (2) Após criar deal, aplicar label da stage na conversa do Chatwoot via API direta |
| Migration SQL | `ALTER TABLE crm_deals REPLICA IDENTITY FULL` para garantir que Realtime funcione com inserts via service_role |

## Detalhe — Aplicar label após criar deal

No `autoCreateDeal`, após o insert bem-sucedido (linha 261), buscar `chatwoot_label` da stage e chamar a API do Chatwoot:

```typescript
// After deal creation, apply stage label to Chatwoot conversation
if (chatwootConversationId && brokerageId) {
  const { data: stageLabel } = await supabase
    .from('crm_stages')
    .select('chatwoot_label')
    .eq('id', targetStageId)
    .single()

  if (stageLabel?.chatwoot_label) {
    // Get Chatwoot credentials
    const { data: brokerage } = await supabase
      .from('brokerages')
      .select('chatwoot_url, chatwoot_api_key, chatwoot_account_id')
      .eq('id', brokerageId)
      .single()

    if (brokerage?.chatwoot_url && brokerage?.chatwoot_api_key) {
      const url = `${brokerage.chatwoot_url}/api/v1/accounts/${brokerage.chatwoot_account_id}/conversations/${chatwootConversationId}/labels`
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', api_access_token: brokerage.chatwoot_api_key },
        body: JSON.stringify({ labels: [stageLabel.chatwoot_label] })
      })
      console.log('🏷️ Applied label to conversation:', stageLabel.chatwoot_label)
    }
  }
}
```

Sem mudança de frontend. Apenas dispatcher + 1 migration.

