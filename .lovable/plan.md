

# Plano: Progressive Scan - Escaneamento Progressivo por Fatias de Páginas

## Status da Arquitetura Atual

### O que já está implementado (v2.1)
O sistema atual já possui uma arquitetura sólida com zero dependência de IA:

```text
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: analyze-policy                      │
│                                                                 │
│  1. Recebe PDF base64                                          │
│  2. Trim para 2 páginas (máx 512KB)                            │
│  3. Extração LOCAL (regex em PDF streams)                      │
│  4. Se qualidade < 30% → OCR.space Engine 2                    │
│  5. Retorna { rawText, source, stats }                         │
└───────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: universalPolicyParser (v2.1)             │
│                                                                 │
│  - Anchor Search com raio de 150 caracteres                    │
│  - Inferência de Ramo via keywords                             │
│  - Normalização de Seguradora via aliases                      │
│  - Cálculo de confiança baseado em campos                      │
└───────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              SERVICE: upsertClientByDocument                    │
│                                                                 │
│  - Valida CPF (11) ou CNPJ (14)                                │
│  - Busca existente → retorna ID                                │
│  - Não existe → cria com dados extraídos                       │
│  - Tratamento de conflito unique constraint                    │
└───────────────────────────────────────────────────────────────┘
```

### Banco de Dados: Índices já existentes
```sql
-- ÚNICO para upsert (já criado)
idx_clientes_cpf_cnpj_user_unique  (user_id, cpf_cnpj) WHERE cpf_cnpj IS NOT NULL
idx_clientes_doc_user              (user_id, cpf_cnpj) WHERE cpf_cnpj IS NOT NULL
```

## Problema Identificado

O limite de **2 páginas** na função atual pode perder dados importantes em PDFs onde:
- Dados de veículo estão na página 3 (comum na Tokio Marine)
- Prêmio líquido aparece na página 4 (comum em propostas)
- CPF do segurado está na página 2 mas vigência na página 3

### Solução: Progressive Scan

```text
┌─────────────────────────────────────────────────────────────────┐
│                FRONTEND: Progressive Scan Loop                  │
│                                                                 │
│  accumulatedText = ''                                          │
│  for page = 1 to MAX_PAGES step 2:                             │
│    1. Chama Edge Function (startPage, endPage)                 │
│    2. accumulatedText += rawText                               │
│    3. parsedData = universalPolicyParser(accumulatedText)      │
│    4. SE confidenceScore >= 80 → PARA                          │
│    5. SENÃO → continua próximas páginas                        │
└───────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `supabase/functions/analyze-policy/index.ts` | Adicionar parâmetros `startPage` e `endPage` para extração seletiva |
| `src/utils/universalPolicyParser.ts` | Adicionar Sliding Window v3.0 com correção de ruído OCR |
| `src/components/policies/ImportPoliciesModal.tsx` | Implementar loop progressivo com threshold de confiança |

---

## Seção Técnica

### 1. Edge Function: Parâmetros de Paginação

Modificar `analyze-policy` para aceitar `startPage` e `endPage`:

```typescript
// Novos parâmetros opcionais
const startPage = body.startPage || 1;
const endPage = body.endPage || 2;

// Nova função de trim com range
async function extractPageRange(base64: string, startPage: number, endPage: number): Promise<string> {
  const pdfBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();
  
  // Ajusta range para não exceder total
  const actualEnd = Math.min(endPage, pageCount);
  const actualStart = Math.max(1, startPage);
  
  if (actualStart > pageCount) {
    return ''; // Páginas solicitadas não existem
  }
  
  // Cria novo PDF apenas com as páginas solicitadas
  const newDoc = await PDFDocument.create();
  for (let i = actualStart - 1; i < actualEnd; i++) {
    const [page] = await newDoc.copyPages(pdfDoc, [i]);
    newDoc.addPage(page);
  }
  
  const newBytes = await newDoc.save();
  return uint8ArrayToBase64(new Uint8Array(newBytes));
}
```

A resposta incluirá metadados:
```typescript
return {
  success: true,
  rawText: rawText,
  source: source,
  pageRange: { start: startPage, end: actualEnd, total: pageCount },
  hasMorePages: actualEnd < pageCount,
};
```

### 2. Parser v3.0: Sliding Window + Correção de Ruído

Melhorias no `universalPolicyParser.ts`:

```typescript
// NOVA função de normalização v3.0
export function normalizeOcrText(rawText: string): string {
  let text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\t+/g, ' ')
    .toUpperCase();
  
  // NOVO: Remove espaços entre dígitos (OCR noise)
  // "1 2 3 . 4 5 6 . 7 8 9 - 0 0" → "123.456.789-00"
  text = text.replace(/(\d)\s+(?=\d)/g, '$1');
  
  // NOVO: Corrige O→0 e l→1 em contexto numérico (OCR noise)
  // "CPF: 123.456.789-O0" → "CPF: 123.456.789-00"
  text = text.replace(/(\d)[O](\d)/g, '$10$2');
  text = text.replace(/(\d)[O]$/g, '$10');    // Final O
  text = text.replace(/^[O](\d)/g, '0$1');    // Inicial O
  text = text.replace(/(\d)[lI](\d)/gi, '$11$2');
  
  // Remove múltiplos espaços
  text = text.replace(/[ ]{2,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

// NOVA função de extração por janela deslizante
function extractByAnchor(
  text: string,
  anchors: string[],
  regex: RegExp,
  windowSize: number = 100
): string | null {
  const results: { value: string; confidence: number }[] = [];
  
  for (const anchor of anchors) {
    let searchIdx = 0;
    while (true) {
      const anchorIdx = text.indexOf(anchor.toUpperCase(), searchIdx);
      if (anchorIdx === -1) break;
      
      const windowStart = anchorIdx + anchor.length;
      const window = text.substring(windowStart, windowStart + windowSize);
      
      const match = window.match(regex);
      if (match?.[1]) {
        const value = match[1].trim();
        const confidence = 100 - (match.index || 0);
        results.push({ value, confidence });
      }
      
      searchIdx = anchorIdx + 1;
    }
  }
  
  if (results.length === 0) return null;
  results.sort((a, b) => b.confidence - a.confidence);
  return results[0].value;
}
```

Sistema de pesos para confiança:
```typescript
// Pesos para cálculo de confiança
const CONFIDENCE_WEIGHTS = {
  cpf_cnpj: 50,    // Crítico: identificação do cliente
  numero_apolice: 20,
  placa: 20,
  datas: 10,       // data_inicio + data_fim
  premio: 10,
  nome: 10,
  seguradora: 10,
  ramo: 5,
};

// Score mínimo para parar o progressive scan
const CONFIDENCE_THRESHOLD = 80;
```

### 3. Frontend: Loop Progressivo

Modificar `processFilesIndividually` em `ImportPoliciesModal.tsx`:

```typescript
const processFileProgressively = async (file: File): Promise<ParsedPolicy> => {
  let accumulatedText = '';
  let currentPage = 1;
  const MAX_PAGES = 6; // Limite de segurança
  let parsedData: ParsedPolicy | null = null;
  let lastPageRange = { total: 0, hasMore: true };
  
  const base64 = await fileToBase64(file);
  
  while (currentPage <= MAX_PAGES && lastPageRange.hasMore) {
    console.log(`📄 [PROGRESSIVE] ${file.name}: páginas ${currentPage}-${currentPage + 1}`);
    
    // 1. Chama Edge Function para fatia de páginas
    const { data, error } = await supabase.functions.invoke('analyze-policy', {
      body: { 
        base64, 
        fileName: file.name, 
        mimeType: file.type,
        startPage: currentPage,
        endPage: currentPage + 1
      }
    });
    
    if (error || !data?.success) {
      console.warn(`⚠️ [PROGRESSIVE] Erro nas páginas ${currentPage}-${currentPage + 1}`);
      break;
    }
    
    // 2. Acumula texto
    accumulatedText += ' ' + data.rawText;
    lastPageRange = {
      total: data.pageRange?.total || 0,
      hasMore: data.hasMorePages || false
    };
    
    // 3. Parser no texto acumulado
    parsedData = parsePolicy(accumulatedText, file.name);
    
    console.log(`🔍 [PROGRESSIVE] Confiança: ${parsedData.confidence}%, Campos: ${parsedData.matched_fields.length}`);
    
    // 4. Se confiança >= 80, para
    if (parsedData.confidence >= 80) {
      console.log(`✅ [PROGRESSIVE] Threshold atingido! Parando na página ${currentPage + 1}`);
      break;
    }
    
    // 5. Próximas páginas
    currentPage += 2;
  }
  
  return parsedData || parsePolicy(accumulatedText, file.name);
};
```

---

## Fluxo Completo: Diagrama

```text
┌──────────────────────────────────────────────────────────────────────┐
│                        PROGRESSIVE SCAN FLOW                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. UPLOAD: PDF da Tokio Marine (8 páginas)                         │
│                                                                      │
│  2. LOOP PROGRESSIVO:                                                │
│     ┌─────────────────────────────────────────────────────────────┐  │
│     │ Iteração 1: Páginas 1-2                                     │  │
│     │ → rawText: 15k chars                                        │  │
│     │ → Parser: confiança 35% (só seguradora encontrada)          │  │
│     │ → CONTINUA                                                  │  │
│     └─────────────────────────────────────────────────────────────┘  │
│     ┌─────────────────────────────────────────────────────────────┐  │
│     │ Iteração 2: Páginas 3-4                                     │  │
│     │ → rawText acumulado: 30k chars                              │  │
│     │ → Parser: confiança 85% (CPF+Placa+Prêmio+Datas)            │  │
│     │ → PARA! Threshold atingido                                  │  │
│     └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  3. UPSERT: Cliente criado/vinculado via CPF                        │
│                                                                      │
│  4. TABELA: Campos preenchidos automaticamente                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

### Console Logs
```
📄 [1/1] Processando: APOLICE TOKIO MARINE.pdf
📄 [PROGRESSIVE] páginas 1-2
📝 [OCR] 15k caracteres (via LOCAL)
🔍 [PROGRESSIVE] Confiança: 35%, Campos: 2
📄 [PROGRESSIVE] páginas 3-4
📝 [OCR] 18k caracteres (via OCR)
🔍 [PROGRESSIVE] Confiança: 85%, Campos: 8
✅ [PROGRESSIVE] Threshold atingido! Parando na página 4
🔍 [PARSER] CPF: 12345678900, Apólice: 987654321, Ramo: AUTOMÓVEL
✅ [UPSERT] Cliente criado: abc-123-def
```

### Tabela de Conferência
- CPF preenchido e limpo (sem pontos/espaços)
- Placa detectada automaticamente
- Ramo = AUTOMÓVEL (inferido por keywords)
- Cliente vinculado ou criado

---

## Validação e Testes

| Passo | Ação | Resultado |
|-------|------|-----------|
| 1 | Upload PDF Tokio Marine (dados na pág 3) | Loop dispara 2 iterações |
| 2 | Verificar console | Log mostra confiança crescente |
| 3 | Verificar tabela | CPF limpo, placa formatada |
| 4 | Salvar apólice | Cliente criado/vinculado |
| 5 | Upload mesmo PDF | Cliente NÃO duplicado |

---

## Complexidade e Estimativas

| Tarefa | Complexidade | Linhas |
|--------|--------------|--------|
| Edge Function: `extractPageRange()` | Média | ~50 |
| Parser v3.0: `normalizeOcrText()` | Baixa | ~30 |
| Parser v3.0: `extractByAnchor()` | Média | ~40 |
| Frontend: `processFileProgressively()` | Média | ~60 |

**Total**: ~180 linhas de código

---

## Vantagens da Abordagem

1. **Economia de OCR**: Para PDFs onde dados estão nas primeiras 2 páginas, não processa mais
2. **Cobertura completa**: Para PDFs complexos, processa até encontrar dados essenciais
3. **Limite de segurança**: Máximo 6 páginas evita estouro de memória
4. **Determinístico**: Mesmo PDF sempre produz mesmo resultado
5. **Zero IA**: Nenhum token de modelo de linguagem consumido

