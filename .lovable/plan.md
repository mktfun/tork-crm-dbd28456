

# Plano: Silenciar sync desnecessário e melhorar logs

## Problema

Quando um deal não tem conversa no Chatwoot (`chatwoot_conversation_id` é null), o frontend mesmo assim tenta sincronizar via `chatwoot-sync`, que retorna 404 com a mensagem "Nenhuma conversa ativa encontrada". Isso gera:
1. Toast de erro desnecessário para o usuário
2. Erro no console que parece bug de build

## Mudança

### `src/hooks/useCRMDeals.ts`

Adicionar guards antes de cada chamada ao `chatwoot-sync` para verificar se o deal tem `chatwoot_conversation_id`:

1. **`updateDeal.onSuccess`** (linha ~366): Guard no sync de stage change — só sincroniza se `data.chatwoot_conversation_id` existe
2. **`updateDeal.onSuccess`** (linha ~386): Guard no sync de attributes — já checa `client_id`, adicionar check de `chatwoot_conversation_id`
3. **`moveDeal.onSuccess`** (linha ~471): Guard no sync de stage via drag — só sincroniza se `data.chatwoot_conversation_id` existe
4. **`deleteDeal.onSuccess`** (linha ~417): Guard no sync de delete — adicionar check de `chatwoot_conversation_id` do deal deletado

Para os casos sem conversa, logar silenciosamente: `console.log('⏭️ Sem conversa Tork vinculada, sync ignorado')`

## Resultado

- Deals sem conversa no Chatwoot não geram mais erros visuais nem toasts de falha
- Deals COM conversa continuam sincronizando normalmente
- Log limpo e informativo no console

