# Plano: Pure OCR Proxy v5.0 - "THE CLEANER" ✅ IMPLEMENTADO

## Status: CONCLUÍDO

A implementação v5.0 está completa e resolve os problemas de lixo binário no OCR.

---

## O Que Foi Implementado

### 1. Edge Function "THE CLEANER" (supabase/functions/analyze-policy/index.ts)

- **Proxy OCR Puro**: Removida toda tentativa de extração local de texto
- **Sempre OCR.space**: Engine 2 com `isTable=true`, `scale=true`, `detectOrientation=true`
- **Limpeza de Caracteres**: Função `cleanOcrText()` remove lixo binário mantendo apenas ASCII printable + acentos brasileiros

```typescript
const cleanText = rawText.replace(/[^\x20-\x7E\u00C0-\u00FF\n\r\t]/g, ' ');
```

### 2. Parser v5.0 "Alpha Window Strategy" (src/utils/universalPolicyParser.ts)

- **`createAlphaText()`**: Versão só com A-Z e 0-9 + mapeamento de índices
- **`alphaWindowExtract()`**: Busca âncora no texto alfa e extrai do original
- **Regex tolerantes**: Aceitam espaços/pontos entre dígitos
- **Detecção de seguradoras**: Busca direta de marcas no texto alfa
- **Inferência de ramo**: Se encontrar "PLACA", ramo = Automóvel

### 3. Frontend Debug Logs (ImportPoliciesModal.tsx)

- **Log de texto limpo**: `console.log('--- TEXTO LIMPO START ---', text)`
- **Produtor padrão**: Fallback para primeiro produtor se nenhum selecionado

---

## Fluxo Completo

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PURE OCR PROXY FLOW v5.0                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. FRONTEND: Upload PDF                                         │
│     └─> Base64 → supabase.functions.invoke('analyze-policy')     │
│                                                                  │
│  2. EDGE FUNCTION: "THE CLEANER"                                 │
│     └─> extractPageRange() → OCR.space → cleanOcrText()          │
│     └─> Return { rawText, pageRange, hasMorePages }              │
│                                                                  │
│  3. FRONTEND: Parser Local                                       │
│     └─> createAlphaText() → alphaWindowExtract()                 │
│     └─> Se confiança >= 80%, para o loop                         │
│                                                                  │
│  4. FRONTEND: Upsert Cliente                                     │
│     └─> CPF extraído → upsertClientByDocument()                  │
│                                                                  │
│  5. FRONTEND: Tabela de Conferência                              │
│     └─> CPF, Seguradora, Ramo preenchidos                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Console Logs Esperados

```
📄 [1/1] Processando: APOLICE MARINA.pdf
📄 [PROGRESSIVE] páginas 1-2
🔍 Chamando OCR.space Engine 2 (modo visual puro)...
✅ OCR.space: 45000 caracteres extraídos
✅ Extração OCR: 45000 → 42000 chars (limpo)
--- TEXTO LIMPO START ---
TOKIO MARINE SEGURADORA S A
SEGURADO MARINA DA SILVA SANTOS
CPF 123 456 789 00
PLACA ABC1D23
--- TEXTO LIMPO END ---
🔍 [PARSER v5.0] Original: 42000 chars, Alpha: 28000 chars
🔍 [PARSER v5.0] Confiança: 85%, Campos: cpf, placa, seguradora, ramo
✅ [PROGRESSIVE] Threshold atingido!
✅ [UPSERT] Cliente vinculado: abc-123-def
```

---

## Validação e Testes

| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Upload PDF que tinha lixo binário | Texto limpo no console |
| 2 | Verificar `--- TEXTO LIMPO START ---` | Sem caracteres estranhos |
| 3 | Verificar tabela | CPF e Seguradora preenchidos |
| 4 | Ramo automático | Se tem PLACA, Ramo = Automóvel |
| 5 | Salvar apólice | Cliente vinculado, produtor padrão aplicado |

---

## Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `supabase/functions/analyze-policy/index.ts` | Proxy OCR puro com limpeza de caracteres |
| `src/utils/universalPolicyParser.ts` | Alpha Window Strategy v5.0 |
| `src/components/policies/ImportPoliciesModal.tsx` | Debug logs + produtor padrão |

---

## Vantagens

1. **Zero lixo binário**: Limpeza de caracteres não-printáveis
2. **OCR visual puro**: Sem dependência de extração local falha
3. **Determinístico**: Mesmo PDF sempre produz mesmo resultado
4. **Zero IA**: Nenhum token de modelo consumido
5. **Debug facilitado**: Log mostra texto limpo para diagnóstico
