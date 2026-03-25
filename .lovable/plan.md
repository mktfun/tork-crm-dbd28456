

# Plano: Batch dispatch como mensagem normal

## Problema

O `processBatchSession` envia para n8n com `message_type: 'batch_analysis'`, que o n8n não reconhece. O n8n retorna 200 mas não processa/responde. O conteúdo extraído já está no system prompt — só precisa despachar como uma mensagem normal para o n8n tratar igual.

## Mudança

### `supabase/functions/admin-dispatcher/index.ts` — `processBatchSession`

Alterar o dispatch do batch para usar `message_type: 'text'` em vez de `'batch_analysis'`, e colocar um `content` descritivo que instrua a IA a analisar o conteúdo acumulado (que já está no system prompt via `<batch_analysis_content>`):

```typescript
// ANTES:
mediaResult: { messageType: 'batch_analysis', attachmentUrls: [] },
content: batchBody.content,

// DEPOIS:
mediaResult: { messageType: 'text', attachmentUrls: [] },
content: 'Analise todo o conteúdo acumulado que está no contexto.',
```

Também ajustar o `batchBody.content` para ser uma mensagem simples:

```typescript
// ANTES:
content: `[ANÁLISE BATCH] ${allTexts.length} mensagens, ...`

// DEPOIS:  
content: `Analise todo o conteúdo dos documentos, áudios e mensagens que enviei.`
```

Isso faz o n8n tratar exatamente como uma mensagem normal do admin, usando o system prompt (que já contém todo o conteúdo extraído dentro da tag `<batch_analysis_content>`).

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `supabase/functions/admin-dispatcher/index.ts` | Alterar `processBatchSession` — message_type para 'text' |

