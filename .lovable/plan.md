

# Plano: Client-Side PDF Slicing + Gemini Vision OCR

## Análise da Arquitetura Atual

### O que já está implementado (v5.0)
```text
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: ImportPoliciesModal                      │
│  - Loop progressivo (páginas 1-2, 3-4, 5-6)                    │
│  - Envia PDF COMPLETO para Edge Function                        │
│  - Edge Function faz o fatiamento com pdf-lib                   │
└───────────────┬─────────────────────────────────────────────────┘
                │ (PDF completo ~2-5MB)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: analyze-policy (v5.0)               │
│  - Recebe PDF completo + startPage/endPage                      │
│  - Usa pdf-lib para extrair páginas solicitadas                 │
│  - Chama OCR.space Engine 2                                     │
│  - Aplica cleanOcrText() para remover lixo binário              │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: universalPolicyParser (v5.0)             │
│  - Alpha Window Strategy                                        │
│  - Regex tolerantes para OCR ruidoso                           │
│  - Threshold de confiança (80%)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Problema Identificado
O PDF completo (~2-5MB) é enviado a cada iteração do loop progressivo. Isso causa:
- Alto consumo de banda
- Potencial timeout em conexões lentas
- Processamento redundante de pdf-lib no servidor

---

## Arquitetura Proposta (v6.0 - "Client-Side Slicer")

```text
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: Client-Side PDF Slicer                   │
│                                                                 │
│  1. Carrega PDF com pdf-lib                                    │
│  2. Extrai páginas 1-2 → Base64 (~100-200KB)                   │
│  3. Envia APENAS o slice para Edge Function                    │
│  4. Se confiança < 80% → Extrai páginas 3-4 → Envia            │
│  5. Repeat até confiança OK ou limite de páginas               │
└───────────────┬─────────────────────────────────────────────────┘
                │ (Slice ~100-200KB)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: "SUPER OCR" (v6.0)                  │
│                                                                 │
│  ENGINE 1 (Primária): Gemini 2.0 Flash Vision                   │
│  - Prompt: "Transcreva todo o texto desta página de seguro"    │
│  - Modelo: gemini-2.0-flash-exp                                 │
│                                                                 │
│  ENGINE 2 (Fallback): OCR.space Engine 2                        │
│  - Só se Gemini falhar ou retornar vazio                        │
│                                                                 │
│  LIMPEZA: cleanOcrText() para remover caracteres não-ASCII      │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: universalPolicyParser (v5.0)             │
│  (Sem alterações - já funciona bem)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/policies/ImportPoliciesModal.tsx` | Adicionar Client-Side PDF Slicer com `pdf-lib` |
| `supabase/functions/analyze-policy/index.ts` | Adicionar Gemini Vision como ENGINE 1, OCR.space como fallback |

**Nota**: O `universalPolicyParser.ts` e `policyImportService.ts` já estão corretos e não precisam de alterações.

---

## Dependências

O projeto já possui `pdf-lib` como dependência no frontend (não precisa instalar):
- O pacote já está disponível no `package.json` (verificar)

Se não estiver, precisará adicionar:
```bash
npm install pdf-lib
```

---

## Seção Técnica

### 1. Client-Side PDF Slicer (Frontend)

Nova função `slicePdfPages()` no `ImportPoliciesModal.tsx`:

```typescript
import { PDFDocument } from 'pdf-lib';

/**
 * Extrai um range de páginas do PDF no cliente
 * Retorna: { sliceBase64, totalPages, hasMore }
 */
async function slicePdfPages(
  file: File, 
  startPage: number, 
  endPage: number
): Promise<{ 
  sliceBase64: string; 
  totalPages: number; 
  hasMore: boolean;
  actualStart: number;
  actualEnd: number;
}> {
  // 1. Lê arquivo como ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // 2. Carrega PDF
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();
  
  // 3. Ajusta range
  const actualStart = Math.max(1, startPage);
  const actualEnd = Math.min(endPage, totalPages);
  
  if (actualStart > totalPages) {
    return { 
      sliceBase64: '', 
      totalPages, 
      hasMore: false,
      actualStart,
      actualEnd: 0
    };
  }
  
  // 4. Cria novo PDF com apenas as páginas solicitadas
  const newDoc = await PDFDocument.create();
  for (let i = actualStart - 1; i < actualEnd; i++) {
    const [page] = await newDoc.copyPages(pdfDoc, [i]);
    newDoc.addPage(page);
  }
  
  // 5. Converte para Base64
  const pdfBytes = await newDoc.save();
  const sliceBase64 = btoa(
    String.fromCharCode(...new Uint8Array(pdfBytes))
  );
  
  console.log(`✂️ [SLICER] Páginas ${actualStart}-${actualEnd} de ${totalPages} (${(sliceBase64.length / 1024).toFixed(0)}KB)`);
  
  return {
    sliceBase64,
    totalPages,
    hasMore: actualEnd < totalPages,
    actualStart,
    actualEnd
  };
}
```

### 2. Loop Progressivo Refatorado

Atualização do `processFilesIndividually`:

```typescript
// Para cada arquivo
for (let idx = 0; idx < files.length; idx++) {
  const file = files[idx];
  
  // Imagens: envia diretamente
  if (file.type.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    const { data } = await supabase.functions.invoke('analyze-policy', {
      body: { base64, fileName: file.name, mimeType: file.type }
    });
    // ... processa resultado
    continue;
  }
  
  // PDFs: usa Client-Side Slicer
  let accumulatedText = '';
  let currentPage = 1;
  let hasMore = true;
  let parsed = null;
  
  while (currentPage <= MAX_PAGES && hasMore) {
    console.log(`📄 [SLICER] ${file.name}: páginas ${currentPage}-${currentPage + 1}`);
    
    // 1. FATIA NO CLIENTE (não envia PDF completo!)
    const slice = await slicePdfPages(file, currentPage, currentPage + 1);
    hasMore = slice.hasMore;
    
    if (!slice.sliceBase64) {
      console.log(`📄 [SLICER] Sem mais páginas`);
      break;
    }
    
    // 2. Envia APENAS o slice para Edge Function
    const { data, error } = await supabase.functions.invoke('analyze-policy', {
      body: { 
        base64: slice.sliceBase64,
        fileName: file.name,
        mimeType: 'application/pdf',
        // Não precisa mais de startPage/endPage - já vem fatiado!
      }
    });
    
    // ... resto do loop (acumula texto, roda parser, checa threshold)
  }
}
```

### 3. Edge Function "SUPER OCR" (v6.0)

Refatoração do `analyze-policy/index.ts`:

```typescript
// ENGINE 1: Gemini 2.0 Flash Vision
async function transcribeWithGemini(base64: string, mimeType: string): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY not configured');
  }
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: 'Transcreva todo o texto visível nesta página de documento de seguro. Retorne apenas o texto bruto, sem formatação, comentários ou explicações. Inclua todos os números, nomes, datas e valores que você conseguir ler.',
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', response.status, error);
    throw new Error(`Gemini API error: ${response.status}`);
  }
  
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  console.log(`✅ [GEMINI] ${text.length} caracteres extraídos`);
  return text;
}

// ENGINE 2: OCR.space (fallback)
async function transcribeWithOcrSpace(base64: string, mimeType: string): Promise<string> {
  // ... código existente de callOcrSpace()
}

// MAIN HANDLER
serve(async (req) => {
  // ... CORS handling
  
  const body = await req.json();
  const fileBase64 = body.base64 || body.fileBase64;
  const mimeType = body.mimeType || 'application/pdf';
  
  // REMOVIDO: Não precisa mais de extractPageRange() - cliente já envia fatiado!
  
  let rawText = '';
  let source = 'GEMINI';
  
  // 1. Tenta Gemini Vision primeiro
  try {
    rawText = await transcribeWithGemini(fileBase64, mimeType);
  } catch (geminiError) {
    console.warn('⚠️ Gemini falhou, tentando OCR.space...', geminiError);
    source = 'OCR';
    
    // 2. Fallback para OCR.space
    try {
      rawText = await transcribeWithOcrSpace(fileBase64, mimeType);
    } catch (ocrError) {
      console.error('❌ Ambos OCR falharam');
      return errorResponse('Falha na extração de texto');
    }
  }
  
  // 3. Limpeza de caracteres
  const cleanText = cleanOcrText(rawText);
  
  return new Response(JSON.stringify({
    success: true,
    rawText: cleanText,
    source,
  }), { headers: corsHeaders });
});
```

---

## Fluxo Completo (v6.0)

```text
┌──────────────────────────────────────────────────────────────────────┐
│                  CLIENT-SIDE SLICER + SUPER OCR FLOW                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. UPLOAD: PDF da Marina (8 páginas, 3MB)                          │
│                                                                      │
│  2. CLIENT-SIDE SLICER:                                              │
│     ┌─────────────────────────────────────────────────────────────┐  │
│     │ Iteração 1: Extrai páginas 1-2 localmente                   │  │
│     │ → Slice: 180KB (vs 3MB original)                            │  │
│     │ → Envia para Edge Function                                   │  │
│     └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  3. SUPER OCR (Edge Function):                                       │
│     ┌─────────────────────────────────────────────────────────────┐  │
│     │ ENGINE 1: Gemini 2.0 Flash Vision                           │  │
│     │ → Transcrição visual de alta qualidade                      │  │
│     │ → Retorna texto limpo                                        │  │
│     └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  4. PARSER (Frontend):                                               │
│     ┌─────────────────────────────────────────────────────────────┐  │
│     │ universalPolicyParser v5.0                                  │  │
│     │ → Confiança: 45% (só seguradora encontrada)                 │  │
│     │ → Continua para próximas páginas                            │  │
│     └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  5. LOOP PROGRESSIVO:                                                │
│     ┌─────────────────────────────────────────────────────────────┐  │
│     │ Iteração 2: Extrai páginas 3-4 localmente                   │  │
│     │ → Slice: 220KB                                               │  │
│     │ → Gemini: Transcrição perfeita                              │  │
│     │ → Parser: Confiança 90% (CPF+Placa+Prêmio)                  │  │
│     │ → PARA! Threshold atingido                                  │  │
│     └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  6. UPSERT: Cliente Marina criado/vinculado                         │
│                                                                      │
│  7. TABELA: Todos os campos preenchidos automaticamente             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

### Console Logs
```
📄 [1/1] Processando: APOLICE MARINA.pdf
✂️ [SLICER] Páginas 1-2 de 8 (180KB)
✅ [GEMINI] 25000 caracteres extraídos
--- TEXTO LIMPO START ---
TOKIO MARINE SEGURADORA S.A.
CPF: 123.456.789-00
NOME: MARINA PEREIRA BISO
PLACA: ABC-1234
--- TEXTO LIMPO END ---
🔍 [PARSER v5.0] Confiança: 45%, Campos: seguradora
✂️ [SLICER] Páginas 3-4 de 8 (220KB)
✅ [GEMINI] 30000 caracteres extraídos
🔍 [PARSER v5.0] Confiança: 90%, Campos: cpf, placa, apolice, seguradora
✅ [PROGRESSIVE] Threshold atingido! Parando na página 4
✅ [UPSERT] Cliente criado: abc-123-def (MARINA PEREIRA BISO)
```

---

## Validação e Testes

| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Upload PDF Marina (3MB, 8 páginas) | Slice de ~200KB enviado |
| 2 | Verificar console | Log `[SLICER]` com tamanho < 300KB |
| 3 | Verificar log | `[GEMINI]` ou `[OCR]` como source |
| 4 | Verificar tabela | CPF, Placa, Seguradora preenchidos |
| 5 | Salvar apólice | Cliente criado/vinculado corretamente |

---

## Vantagens do Client-Side Slicer

| Métrica | Antes (v5.0) | Depois (v6.0) |
|---------|--------------|---------------|
| Payload por request | 2-5MB | 100-300KB |
| Processamento servidor | Trim PDF + OCR | Apenas OCR |
| Qualidade OCR | OCR.space | Gemini Vision (superior) |
| Fallback | Nenhum | OCR.space |
| Tempo de upload | 3-8s | < 1s |

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| pdf-lib não disponível no browser | Baixa | Biblioteca já testada no projeto |
| Gemini Vision fora do ar | Média | Fallback automático para OCR.space |
| Limite de tokens Gemini | Baixa | maxOutputTokens=8192, suficiente para 2 páginas |
| CPF fragmentado pelo OCR | Baixa | Parser v5.0 Alpha Window já trata |

---

## Ordem de Implementação

1. **`src/components/policies/ImportPoliciesModal.tsx`**: Adicionar função `slicePdfPages()` e refatorar loop progressivo
2. **`supabase/functions/analyze-policy/index.ts`**: Adicionar Gemini Vision como ENGINE 1, simplificar (remover extractPageRange)
3. **Testar**: Upload de PDF Marina que dava erro 500

---

## Configuração Necessária

O projeto já possui a secret `GOOGLE_AI_API_KEY` configurada, então o Gemini Vision estará disponível automaticamente.

