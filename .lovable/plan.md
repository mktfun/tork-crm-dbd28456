

# Plano: Fix telefone null no payload do n8n

## Problema

O payload que chega no n8n tem `telefone: null` porque nenhum dos dispatchers (client nem admin) inclui o telefone do contato no `derived_data`. O telefone existe no body do Chatwoot como `body.sender.phone_number` (nested), mas o n8n provavelmente mapeia campos de `derived_data` — e lá não tem nenhum campo de telefone.

Além disso, o payload mostra `tipo: "outgoing"` — o que significa que o n8n pode estar recebendo a resposta do bot em vez da mensagem do cliente, ou o mapeamento do n8n está errado.

## Solução

Adicionar campos explícitos de telefone e dados do contato no `derived_data` de ambos os dispatchers:

### 1. `supabase/functions/chatwoot-dispatcher/modules/dispatchToN8n.ts`

Adicionar no `derived_data`:
```typescript
contact_phone: body?.sender?.phone_number || null,
contact_name: body?.sender?.name || null,
contact_email: body?.sender?.email || null,
conversation_id: body?.conversation?.id || null,
```

### 2. `supabase/functions/admin-dispatcher/index.ts` (função `dispatchAdminToN8n`)

Adicionar no `derived_data` (linha ~244-261):
```typescript
contact_phone: body?.sender?.phone_number || null,
contact_name: body?.sender?.name || null,
contact_email: body?.sender?.email || null,
conversation_id: body?.conversation?.id || null,
```

### 3. Deploy ambas as edge functions

## Resultado

- O n8n recebe `derived_data.contact_phone` com o telefone do contato
- Basta mapear `derived_data.contact_phone` no n8n em vez de `sender.phone_number`
- Dados do contato ficam explícitos e fáceis de acessar no workflow

