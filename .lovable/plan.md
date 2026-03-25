

# Plano: Corrigir OCR que crasha com PDFs grandes + melhorar logs

## Problema raiz

O `extract-document` crasha com `RangeError: Maximum call stack size exceeded` na linha 24:

```javascript
const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))
```

O spread `...new Uint8Array(fileBuffer)` tenta passar milhões de bytes como argumentos individuais para `String.fromCharCode`, estourando a stack com arquivos maiores que ~100KB. O PDF de 1MB da screenshot causa esse crash.

## Mudanças

### 1. `supabase/functions/extract-document/index.ts` — Corrigir conversão base64

Substituir a conversão base64 por uma versão chunked que processa em blocos de 8KB:

```typescript
// ANTES (crasha com arquivos grandes):
const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))

// DEPOIS (funciona com qualquer tamanho):
const bytes = new Uint8Array(fileBuffer)
let binary = ''
const chunkSize = 8192
for (let i = 0; i < bytes.length; i += chunkSize) {
  binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
}
const base64Data = btoa(binary)
```

### 2. Adicionar log de tamanho antes da conversão

Logar o tamanho do arquivo para facilitar debug futuro:

```typescript
console.log(`📄 Converting ${(fileBuffer.byteLength / 1024).toFixed(1)}KB to base64...`)
```

### 3. Adicionar limite de 5MB com mensagem clara

Se o arquivo for maior que 5MB, retornar erro informativo em vez de tentar processar:

```typescript
if (fileBuffer.byteLength > 5 * 1024 * 1024) {
  return new Response(JSON.stringify({ error: 'Arquivo excede 5MB' }), { status: 400 })
}
```

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `supabase/functions/extract-document/index.ts` | Corrigir conversão base64, adicionar limite e logs |

## Resultado

- PDFs de 1MB+ serão processados corretamente via OCR
- O admin-dispatcher receberá o `extractedText` e injetará no system prompt
- Arquivos acima de 5MB serão rejeitados com mensagem clara

