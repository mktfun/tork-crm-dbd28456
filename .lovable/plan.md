

# Plano: Resposta imediata 200 + processamento em background

## Problema

O dispatcher processa tudo (resolve user, classifica lead, cria deal, chama n8n, etc.) **antes** de retornar o `200 OK` na linha 1140. O Chatwoot tem timeout curto (~15s) e se o processamento demora, ele considera falha e pode reenviar o webhook.

## Solução

Usar o padrão **"respond first, process later"** com `waitUntil` do Deno Edge Runtime. O `Deno.serve` suporta retornar a Response imediatamente enquanto uma Promise continua executando em background.

A mudança é estrutural mas simples: extrair todo o processamento para uma função `processWebhook(body)` e usar `event.waitUntil()` (ou `setTimeout` com promise) para rodar em background.

**Abordagem com `EdgeRuntime.waitUntil`:**

```typescript
Deno.serve(async (req) => {
  const body = await req.json()
  console.log('📥 Dispatcher v2 — Event:', body.event)

  // Validate minimally
  if (body.event !== 'message_created' || body.message_type !== 'incoming') {
    return new Response(JSON.stringify({ message: 'Ignored event' }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Fire-and-forget: process in background
  const processing = processWebhook(body).catch(err => {
    console.error('❌ Background processing error:', err)
  })

  // Use EdgeRuntime.waitUntil to keep the function alive
  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    EdgeRuntime.waitUntil(processing)
  }

  // Return 200 immediately
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
})
```

Todo o corpo atual do `try` (linhas 752-1140) vai para dentro de `async function processWebhook(body)`, exceto a leitura do body e o return final.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `supabase/functions/chatwoot-dispatcher/index.ts` | Extrair processamento para `processWebhook()`, retornar 200 imediatamente, usar `EdgeRuntime.waitUntil` |

Sem migration. Sem mudança de frontend.

