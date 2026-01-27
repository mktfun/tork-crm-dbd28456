

# Plano: Migração para Processamento Individual de Arquivos

## Diagnóstico do Sistema Atual

### Arquitetura Atual (Batch Processing)
```text
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND                                     │
│  ImportPoliciesModal.tsx                                        │
│  ─────────────────────────────────────────────────────────────  │
│  processBulkOCR():                                              │
│    1. Converte TODOS os arquivos para Base64                   │
│    2. Envia array único para ocr-bulk-analyze                  │
│    3. Aguarda resposta única com TODAS as apólices             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ 1 requisição com N arquivos
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: ocr-bulk-analyze                    │
│  ─────────────────────────────────────────────────────────────  │
│  1. Recebe array de arquivos (files[])                         │
│  2. Loop: PDF trimming + OCR.space (Engine 2 + isTable)        │
│  3. Envia texto agregado para IA (Lovable Gateway)             │
│  4. Retorna array de apólices extraídas                        │
│                                                                 │
│  🔴 PROBLEMA: Se 1 arquivo falhar ou usar muita RAM,           │
│     toda a requisição falha (WORKER_LIMIT)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Problema Identificado
- A edge function `ocr-bulk-analyze` processa todos os arquivos em uma única execução
- Um PDF grande ou corrompido pode causar falha total
- Uso de memória acumulativo: 4 PDFs × 5MB = 20MB+ na mesma instância

---

## Arquitetura Proposta (Individual Processing)

```text
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Orquestrador)                     │
│  ImportPoliciesModal.tsx                                        │
│  ─────────────────────────────────────────────────────────────  │
│  processFilesIndividually():                                    │
│    for (file of selectedFiles) {                               │
│      try {                                                      │
│        const result = await supabase.functions.invoke(...)     │
│        results.push(result)     // ✅ Sucesso isolado          │
│      } catch (err) {                                           │
│        errors.push(file.name)   // ❌ Falha isolada            │
│      }                                                          │
│    }                                                            │
│    // Continua com os que deram certo                          │
│    await reconcileAll(results)                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ N requisições (1 por arquivo)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: analyze-policy-single               │
│  ─────────────────────────────────────────────────────────────  │
│  1. Recebe UM arquivo (base64, fileName, mimeType)             │
│  2. PDF trimming (páginas 1-2 apenas)                          │
│  3. OCR.space com Engine 2 + isTable                           │
│  4. IA via Lovable Gateway (mesmo prompt da bulk)              │
│  5. Retorna dados de 1 apólice                                 │
│                                                                 │
│  ✅ Isolamento total: falha de 1 não afeta outros              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Detalhadas

### 1. Nova Edge Function: `analyze-policy-single`
**Arquivo**: `supabase/functions/analyze-policy-single/index.ts`

Por que criar nova função em vez de modificar `analyze-policy`:
- A função `analyze-policy` existente usa **Gemini direto** com schema diferente
- A `ocr-bulk-analyze` tem pipeline mais robusto (OCR.space + Lovable Gateway)
- Melhor isolar a nova lógica para não quebrar funcionalidades existentes

**Estrutura**:
```typescript
serve(async (req) => {
  const { base64, fileName, mimeType } = await req.json();
  
  // 1. PDF Trimming (páginas 1-2) - código reutilizado de ocr-bulk-analyze
  const miniPdfBytes = await trimPdf(base64);
  
  // 2. OCR.space (Engine 2, isTable=true)
  const extractedText = await callOcrSpace(miniPdfBytes);
  
  // 3. IA via Lovable Gateway (mesmo prompt robusto)
  const policy = await extractWithAI(extractedText, fileName);
  
  // 4. Retorna dados da apólice única
  return Response.json({
    success: true,
    data: policy,
    fileName: fileName
  });
});
```

### 2. Refatoração do Frontend
**Arquivo**: `src/components/policies/ImportPoliciesModal.tsx`

**Substituir `processBulkOCR` por `processFilesIndividually`**:

```typescript
const processFilesIndividually = async () => {
  if (!user || files.length === 0) return;
  
  setStep('processing');
  const results: BulkOCRExtractedPolicy[] = [];
  const errors: { fileName: string; error: string }[] = [];
  
  // Processa cada arquivo individualmente
  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    setProcessingStatus(prev => new Map(prev).set(idx, 'processing'));
    setOcrProgress(idx);
    
    try {
      const base64 = await fileToBase64(file);
      
      // 🔥 Chamada individual para cada arquivo
      const { data, error } = await supabase.functions.invoke('analyze-policy-single', {
        body: { 
          base64, 
          fileName: file.name, 
          mimeType: file.type 
        }
      });
      
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Extração falhou');
      
      results.push(data.data);
      setProcessingStatus(prev => new Map(prev).set(idx, 'success'));
      
    } catch (err: any) {
      console.error(`❌ Falha em ${file.name}:`, err.message);
      errors.push({ fileName: file.name, error: err.message });
      setProcessingStatus(prev => new Map(prev).set(idx, 'error'));
      // ✅ Continua com os próximos arquivos (não quebra o loop)
    }
  }
  
  setOcrProgress(files.length);
  
  if (results.length === 0) {
    toast.error('Nenhum arquivo processado com sucesso');
    setStep('upload');
    return;
  }
  
  // Mostra toast com estatísticas
  if (errors.length > 0) {
    toast.warning(`${results.length} processados, ${errors.length} com erro`);
  }
  
  // Continua com reconciliação dos que deram certo
  await reconcileResults(results);
};
```

### 3. Ajustes na Edge Function Existente
**Arquivo**: `supabase/functions/analyze-policy/index.ts`

Esta função **permanece inalterada** pois é usada para outros fluxos (carteirinhas, etc).

### 4. Atualizar Config.toml
**Arquivo**: `supabase/config.toml`

```toml
[functions.analyze-policy-single]
verify_jwt = false
```

---

## Reutilização de Código

Para evitar duplicação, a nova função `analyze-policy-single` irá:

1. **Reutilizar** a lógica de PDF trimming do `ocr-bulk-analyze`
2. **Reutilizar** o prompt do sistema já otimizado
3. **Simplificar** a resposta para retornar apenas 1 apólice

**Código compartilhado a ser extraído**:
- `uint8ArrayToBase64()` - conversão segura
- `trimPdf()` - corte de páginas 1-2
- `callOcrSpace()` - chamada OCR Engine 2
- `extractPolicyWithAI()` - chamada Lovable Gateway
- `generateSmartTitle()` - geração de título

---

## Fluxo de Processamento Comparativo

| Aspecto | Batch (Atual) | Individual (Novo) |
|---------|---------------|-------------------|
| Requisições | 1 (N arquivos) | N (1 por arquivo) |
| Isolamento de falhas | ❌ Total failure | ✅ Parcial |
| Uso de RAM | ❌ Acumulativo | ✅ Reset por req |
| Feedback visual | ⚠️ Tudo ou nada | ✅ Por arquivo |
| Network tab | 1 requisição | N requisições |
| Rate limit | ⚠️ 1 hit IA | ⚠️ N hits IA |

---

## Validação e Testes

1. **Teste de Isolamento**:
   - Subir 4 arquivos: 3 válidos + 1 corrompido
   - Esperado: 3 processados com sucesso, 1 erro isolado

2. **Teste de Network**:
   - Abrir DevTools > Network
   - Subir 3 arquivos
   - Esperado: 3 requisições separadas para `analyze-policy-single`

3. **Teste de Memória**:
   - Subir 5 PDFs de 4MB cada
   - Esperado: Sem erro WORKER_LIMIT (cada req < 50MB)

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/analyze-policy-single/index.ts` | **Criar** | Nova edge function para processamento individual |
| `supabase/config.toml` | **Modificar** | Adicionar config da nova função |
| `src/components/policies/ImportPoliciesModal.tsx` | **Modificar** | Substituir `processBulkOCR` por `processFilesIndividually` |

**Arquivos mantidos inalterados**:
- `supabase/functions/ocr-bulk-analyze/index.ts` - mantido para compatibilidade
- `supabase/functions/analyze-policy/index.ts` - usado para carteirinhas
- `src/services/policyImportService.ts` - já tem upsert implementado

---

## Considerações de Performance

### Latência
- **Batch**: 1 requisição de ~10s (todos os arquivos)
- **Individual**: N requisições de ~3-5s cada (paralelo possível no futuro)

### Rate Limiting
- **Lovable AI Gateway**: Verificar limites de requests/min
- **OCR.space**: 500 requests/dia no plano free

### Otimização Futura
Para reduzir latência total, podemos implementar **processamento paralelo controlado**:
```typescript
// Versão otimizada (fase 2)
const concurrency = 2; // 2 arquivos por vez
const results = await processInBatches(files, concurrency, processFile);
```

---

## Estimativa de Complexidade

| Tarefa | Complexidade | Linhas de Código |
|--------|--------------|------------------|
| Nova edge function | Alta | ~200 linhas |
| Refatorar frontend | Média | ~80 linhas modificadas |
| Config.toml | Baixa | 3 linhas |
| Testes | Baixa | Manual |

**Total: 1 novo arquivo, 2 modificações**

