

# Plano: 5 correções no CRM (Realtime, Badge IA, Histórico, Duplicatas, Layout)

## 1. Realtime ainda não atualiza (deal não aparece sem F5)

**Causa raiz**: O `REPLICA IDENTITY FULL` foi aplicado, mas o problema persiste. Investigando o código, o canal Realtime em `useCRMDeals.ts` (linha 289) usa `filter: user_id=eq.${user.id}`. Deals inseridos pelo dispatcher via `service_role` podem não emitir o payload completo mesmo com REPLICA IDENTITY FULL se o Realtime subscription foi criado antes da migration.

**Correção dupla (fallback robusto)**:
- Remover o filtro `filter` do canal Realtime em `useCRMDeals.ts` — ouvir todos os eventos de `crm_deals` e deixar o React Query filtrar no client-side. Isso garante que qualquer insert via service_role seja capturado.
- Adicionar também `crm-deals` ao `useRealtimeClients.ts` como fallback global (já invalida `clients` e `all-clients`, adicionar `crm-deals`).

## 2. Badge "IA" no DealCard

**O que**: Adicionar um badge pequeno no canto superior direito do card quando o deal foi criado pela IA (`last_sync_source === 'chatwoot'` e o deal não tem `notes` manual, ou melhor: usar a presença de `chatwoot_conversation_id` + verificar que `last_sync_source` é `'chatwoot'`).

**Correção**: No `DealCard.tsx`, adicionar um badge "IA" no header do card quando `deal.last_sync_source === 'chatwoot'`.

## 3. Evento de criação no histórico

**Causa raiz**: O dispatcher não insere um `crm_deal_events` ao criar o deal. Quando o usuário abre o histórico, não há registro de criação.

**Correção**: No dispatcher (`autoCreateDeal`), após criar o deal com sucesso, inserir um evento:
```
{ deal_id, event_type: 'creation', new_value: 'Criado pela IA | Produto: X | Funil: Y | Etapa: Z', source: 'ai_automation', created_by: null }
```

O `renderEventDescription` já trata `event_type === 'creation'` e `source === 'ai_automation'` mostra badge "IA". Só precisa enriquecer a mensagem de criação para incluir produto/funil/etapa.

## 4. IA cria 3 deals ao invés de 1 (duplicatas)

**Causa raiz**: O Chatwoot envia múltiplos webhooks rapidamente (message_created para cada mensagem, mais message_updated). O dispatcher recebe 3 webhooks quase simultâneos. Para cada um, a query de deals existentes (linha 948-954) retorna 0 resultados porque o primeiro insert ainda não commitou quando o segundo webhook chega.

**Correção**: Adicionar um check por `chatwoot_conversation_id` antes de criar o deal. Se já existe um deal aberto para aquela conversa, não criar outro:
```sql
-- Before autoCreateDeal insert:
SELECT id FROM crm_deals 
WHERE chatwoot_conversation_id = $conversationId 
AND status = 'open' LIMIT 1
```
Se existir, pular a criação. Isso é mais confiável que o check por `client_id` porque a conversation_id é única.

Além disso, adicionar um `UNIQUE` constraint (parcial) na tabela para garantir no nível do banco:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS crm_deals_unique_open_conversation 
ON crm_deals (chatwoot_conversation_id) 
WHERE status = 'open' AND chatwoot_conversation_id IS NOT NULL;
```

## 5. Layout — scrollbars excessivos e conteúdo cortado no zoom

**Causa raiz**: O `RootLayout.tsx` linha 47 tem `max-w-7xl mx-auto` (~80rem = 1280px). Quando o viewport é maior (ex: zoom out), o conteúdo fica centralizado e "cortado" nos lados. As colunas do Kanban com `overflow-y-auto` cada uma gera seu próprio scrollbar.

**Correção**:
- `RootLayout.tsx`: Trocar `max-w-7xl` por `max-w-[1600px]` ou remover completamente para a página de CRM usar a largura total
- `KanbanColumn.tsx` linha 129: Esconder scrollbar visual com `no-scrollbar` class (manter funcionalidade de scroll)
- `KanbanBoard.tsx` linha 443: No container horizontal, também aplicar `no-scrollbar` para esconder o scrollbar horizontal, ou deixar um scrollbar mais fino com classes personalizadas

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/hooks/useCRMDeals.ts` | Remover filtro do Realtime channel |
| `src/hooks/useRealtimeClients.ts` | Adicionar invalidação de `crm-deals` |
| `src/components/crm/DealCard.tsx` | Adicionar badge "IA" no canto superior direito |
| `src/components/crm/DealDetailsModal.tsx` | Enriquecer `renderEventDescription` para `creation` com detalhes (produto/funil/etapa) |
| `supabase/functions/chatwoot-dispatcher/index.ts` | (1) Check de conversa existente antes de criar deal. (2) Inserir `crm_deal_events` de criação |
| `src/layouts/RootLayout.tsx` | Aumentar `max-w` para `max-w-[1600px]` |
| `src/components/crm/KanbanColumn.tsx` | Adicionar `no-scrollbar` ao container de deals |
| `src/components/crm/KanbanBoard.tsx` | Adicionar `no-scrollbar` ao container horizontal |
| Migration SQL | Criar unique index parcial em `crm_deals(chatwoot_conversation_id) WHERE status='open'` |

