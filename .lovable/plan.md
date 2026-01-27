

# Plano: Correção do Erro 422 - Migração para Arquitetura de Upload Mistral

## Resumo do Problema

O erro **422 Schema Invalid** ocorre porque o payload atual usa `type: "document_content"` que **não existe** na API Mistral OCR. A API aceita apenas:
- `type: "document_url"` com URL pública de PDF
- `type: "file"` com `file_id` de arquivo pré-carregado
- `type: "image_url"` para imagens (suporta base64 data URL)

## Solução Proposta

Implementar um fluxo de **Upload Temporário** na Edge Function:
1. Recebe base64 do PDF
2. Faz upload para Mistral Files API (`/v1/files`)
3. Obtém URL assinada (`/v1/files/{id}/url`)
4. Processa OCR com a URL
5. Deleta o arquivo temporário

## Implementação Técnica

### 1. Edge Function (`analyze-policy-mistral/index.ts`)

**Alterações:**
- Adicionar função `uploadToMistralFiles()` que converte base64 para File e envia para `/v1/files`
- Adicionar função `getSignedUrl()` para obter URL temporária do arquivo
- Modificar `callMistralOCR()` para usar `type: "document_url"` com a signed URL
- Adicionar cleanup com `deleteFile()` após processamento

**Fluxo completo:**
```
Base64 → Upload Files API → Get Signed URL → OCR /v1/ocr → Delete File → Retorna JSON
```

**Payload correto do OCR:**
```json
{
  "model": "mistral-ocr-latest",
  "document": {
    "type": "document_url",
    "document_url": "https://files.mistral.ai/..."
  },
  "include_image_base64": false
}
```

### 2. Tratamento de Imagens

Para arquivos de imagem (PNG/JPEG), usar data URL base64 diretamente:
```json
{
  "model": "mistral-ocr-latest",
  "document": {
    "type": "image_url",
    "image_url": "data:image/jpeg;base64,/9j/4AAQ..."
  }
}
```

### 3. Lógica de Retry com Rate Limiting

Implementar retry automático com exponential backoff para erros 429 (Rate Limit):
- 1ª tentativa: 2 segundos
- 2ª tentativa: 4 segundos
- 3ª tentativa: 8 segundos

### 4. Migração de Dados (SQL)

Executar limpeza preventiva de dados corrompidos anteriores:
```sql
-- Limpeza de apólices com lixo de OCR
DELETE FROM apolices 
WHERE policy_number ILIKE '%man%ual%' 
   OR insured_asset ILIKE '%man%ual%';

-- Garantir coluna pdf_url existe
ALTER TABLE apolices ADD COLUMN IF NOT EXISTS pdf_url TEXT;
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/analyze-policy-mistral/index.ts` | Refatorar para usar Files API + Signed URL |
| `src/components/policies/ImportPoliciesModal.tsx` | Atualizar labels de processamento |

## Dependências

- Nenhuma nova dependência necessária
- Usa APIs existentes do Mistral

## Testes de Validação

1. **Upload de PDF de 2 páginas**
   - Verificar logs: `Mistral Files Upload: 200`, `Mistral OCR: 200`
   - Confirmar que `nome_cliente` e `cpf_cnpj` são extraídos

2. **Upload de imagem**
   - Confirmar que usa data URL base64 diretamente
   - Verificar extração sem erro 422

3. **Rate Limit (429)**
   - Simular múltiplos uploads rápidos
   - Verificar que retry automático funciona

4. **Verificação de Cleanup**
   - Confirmar que arquivos temporários são deletados após OCR

