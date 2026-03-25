

# Plano: Criar Edge Functions de mídia (extract-document + transcribe-audio)

## Diagnóstico

Os logs mostram `hasOCR: false` e `hasTranscription: false` porque as Edge Functions que o dispatcher chama **não existem**:

- `extract-document` → **não existe** (nenhuma pasta em `supabase/functions/`)
- `transcribe-audio` → **não existe** (idem)

O `processAttachments` chama `supabase.functions.invoke('extract-document', ...)` e `supabase.functions.invoke('transcribe-audio', ...)`, mas os erros são engolidos silenciosamente pelo `catch`.

O resultado: PDFs, imagens e áudios são detectados corretamente (log mostra `type=document, urls=1`), mas o conteúdo nunca é extraído.

## Mudanças

### 1. Criar `supabase/functions/extract-document/index.ts`

Recebe `{ fileUrl, fileType }`, baixa o arquivo da URL do Chatwoot, e usa a API do Gemini (via Lovable Gateway ou API key do usuário) para extrair texto:

- **PDF**: Converte para base64 e envia como `inline_data` para o Gemini com prompt de extração
- **Imagem**: Mesma lógica, envia como `image_url` com base64
- Retorna `{ text: "conteúdo extraído" }`
- Usa `LOVABLE_API_KEY` como fallback, ou a API key configurada pelo usuário (Gemini)

### 2. Criar `supabase/functions/transcribe-audio/index.ts`

Recebe `{ audioUrl }`, baixa o áudio da URL do Chatwoot, e usa a API do Gemini para transcrever:

- Converte áudio para base64
- Envia para Gemini com prompt "Transcreva este áudio em português"
- Retorna `{ text: "transcrição" }`

### 3. Melhorar logs no `processAttachments` (index.ts)

Adicionar logs mais explícitos para debug:
```typescript
console.log('🔍 OCR result:', { hasText: !!data?.text, error: error?.message })
console.log('🎤 Transcription result:', { hasText: !!data?.text, error: error?.message })
```

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/extract-document/index.ts` | Criar — OCR via Gemini (PDF + imagem) |
| `supabase/functions/transcribe-audio/index.ts` | Criar — transcrição de áudio via Gemini |
| `supabase/functions/chatwoot-dispatcher/index.ts` | Melhorar logs do processAttachments |

## Resultado esperado

1. Admin manda PDF → dispatcher chama `extract-document` → extrai texto → `hasOCR: true`
2. Admin manda áudio → dispatcher chama `transcribe-audio` → transcreve → `hasTranscription: true`
3. Texto extraído e transcrição vão no `ai_system_prompt` (já implementado no `buildPrompt.ts`)
4. Payload chega no n8n com `extracted_text` e `transcription` preenchidos
5. Agente no n8n usa esses dados + RAG tool para gerar pitch de vendas

