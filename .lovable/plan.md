

# Fix: Dispatcher usando URL antiga do n8n

## Problema raiz

Na linha 267 do `chatwoot-dispatcher/index.ts`, o código usa a variável `userId` (que vem do webhook e geralmente é `null` para chats não-atribuídos) em vez de `resolvedUserId` (que foi corretamente resolvido via inbox mapping na linha 155).

Como `userId` é `null`, a query no `crm_settings` não roda, e o fallback global `N8N_WEBHOOK_URL` (env var com a URL antiga `https://n8n.davicode.me/webhook/corretora1`) é usado.

## Correção

**Arquivo:** `supabase/functions/chatwoot-dispatcher/index.ts`

**Linha 264-278** — trocar `userId` por `resolvedUserId`:

```typescript
// 6. Send to n8n
let finalN8nUrl = N8N_WEBHOOK_URL;

// Fetch user-specific N8n configuration if available
if (resolvedUserId) {                          // <-- ERA: userId
    const { data: crmSettings } = await supabase
        .from('crm_settings')
        .select('n8n_webhook_url')
        .eq('user_id', resolvedUserId)          // <-- ERA: userId
        .maybeSingle();
        
    if (crmSettings?.n8n_webhook_url && crmSettings.n8n_webhook_url.trim().length > 0) {
        finalN8nUrl = crmSettings.n8n_webhook_url.trim();
        console.log(`✅ Using custom N8N Webhook URL for user ${resolvedUserId}`);
    }
}
```

Também adicionar log para debug:
```typescript
console.log(`🔗 Final N8N URL: ${finalN8nUrl?.substring(0, 50)}...`);
```

Depois: deploy automático da edge function.

