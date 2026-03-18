

# Plano: Melhorar tratamento de erro no teste de API Key

## Problema

A Gemini retorna status **400** (não 401/403) quando a chave é inválida. O código atual só trata 401 e 403 como "chave inválida", e o 400 cai no branch genérico que mostra o JSON cru truncado: `Erro 400: {"error":{"code":400,"message":"API key not valid...","status":"INVALID`.

## Correção em `supabase/functions/test-ai-apikey/index.ts`

1. Expandir a detecção de chave inválida: incluir status 400 e também parsear o corpo do erro para detectar mensagens como "API key not valid"
2. Melhorar a mensagem de erro para todos os provedores, mostrando uma mensagem amigável em PT-BR
3. Adicionar CORS headers (está faltando no arquivo atual)

## Correção no frontend `AutomationConfigTab.tsx`

Nenhuma alteração necessária - o frontend já exibe `data.message`, basta que a mensagem venha legível.

## Arquivo afetado

| Arquivo | Acao |
|---|---|
| `supabase/functions/test-ai-apikey/index.ts` | Tratar 400 como chave inválida, parsear erro, mensagem amigável |

