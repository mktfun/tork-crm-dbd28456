

# Plano: Modelos Corretos + Vincular Config + Limpar OCR Morto

## 1. Atualizar MODEL_OPTIONS com versoes corretas

Em `AutomationConfigTab.tsx` (linhas 49-80), substituir por:

```ts
const MODEL_OPTIONS = {
  gemini: [
    { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro (Alta Inteligência)" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Alta Velocidade)" },
  ],
  openai: [
    { value: "gpt-4.1", label: "GPT-4.1 (Alta Inteligência)" },
    { value: "o3", label: "o3 (Raciocínio)" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini (Alta Velocidade)" },
  ],
  grok: [
    { value: "grok-4.20", label: "Grok 4.20 (Alta Inteligência)" },
    { value: "grok-3-mini", label: "Grok 3 Mini (Alta Velocidade)" },
  ],
  anthropic: [
    { value: "claude-sonnet-4.6", label: "Claude Sonnet 4.6 (Alta Inteligência)" },
    { value: "claude-3.5-haiku", label: "Claude 3.5 Haiku (Alta Velocidade)" },
  ],
  deepseek: [
    { value: "deepseek-r1", label: "DeepSeek R1 (Alta Inteligência)" },
    { value: "deepseek-vl2", label: "DeepSeek VL2 (Alta Velocidade)" },
  ],
};
```

## 2. Vincular config global ao `ai-assistant` e `generate-summary`

Ambas as edge functions usam modelos hardcoded. Vou fazer cada uma buscar `ai_model` e `ai_provider` do `crm_ai_global_config` do usuario autenticado.

**Mapeamento UI → Gateway** (o Lovable AI Gateway aceita `google/*` e `openai/*`):

| UI value | Gateway model |
|---|---|
| `gemini-3.1-pro` | `google/gemini-3.1-pro` |
| `gemini-2.5-flash` | `google/gemini-2.5-flash` |
| `gpt-4.1` | `openai/gpt-4.1` |
| `gpt-4.1-mini` | `openai/gpt-4.1-mini` |
| `o3` | `openai/o3` |
| Outros (grok, anthropic, deepseek) | Fallback → `google/gemini-2.5-flash` (gateway nao suporta ainda) |

### `ai-assistant/index.ts`
- Adicionar funcao helper `getUserModel(userId, supabase)` que consulta `crm_ai_global_config` e retorna o modelo no formato gateway
- Substituir as 5 ocorrencias de `'google/gemini-2.5-flash'` (linhas 2155, 2211, 2237, 2329, 2387) pelo modelo dinamico
- Substituir tambem em `tools-inspector.ts` (linha 90)

### `generate-summary/index.ts`
- Buscar config do usuario autenticado (ja temos `user.id`)
- Substituir `'google/gemini-3-flash-preview'` (linha 251) pelo modelo dinamico
- Fallback: `google/gemini-2.5-flash`

### O que NAO muda
- `analyze-policy-mistral` — usa Mistral OCR dedicado, nao se vincula a config global
- OCR permanece independente com seu proprio modelo (Mistral Large)

## 3. Deletar Edge Functions OCR mortas

O frontend so usa `analyze-policy-mistral`. As seguintes functions sao codigo morto (nenhuma referencia no `src/`):

| Function | Status |
|---|---|
| `ocr-agent-1-extractor/` | Morta — so chamada pelo orchestrator |
| `ocr-agent-2-classifier/` | Morta — so chamada pelo orchestrator |
| `ocr-agent-3-validator/` | Morta — so chamada pelo orchestrator |
| `ocr-orchestrator/` | Morta — nunca chamada pelo frontend |
| `ocr-bulk-analyze/` | Morta — nunca chamada (so tipo referenciado) |
| `analyze-policy/` | Morta — substituida por `analyze-policy-mistral` |

Deletar todas as 6. Limpar o tipo `BulkOCRResponse` de `src/types/policyImport.ts` (referencia orfã).

## Arquivos Afetados

| Arquivo | Mudanca |
|---|---|
| `AutomationConfigTab.tsx` | Atualizar MODEL_OPTIONS com versoes corretas |
| `ai-assistant/index.ts` | Ler config global, usar modelo dinamico |
| `ai-assistant/tools-inspector.ts` | Usar modelo dinamico |
| `generate-summary/index.ts` | Ler config global, usar modelo dinamico |
| `src/types/policyImport.ts` | Remover `BulkOCRResponse` orfao |
| 6 pastas de functions OCR | Deletar |

