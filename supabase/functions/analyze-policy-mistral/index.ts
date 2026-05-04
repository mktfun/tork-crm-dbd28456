import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// MISTRAL INTELLIGENCE V12 - Files API Upload Workflow
// 
// Fluxo: PDF Base64 → Upload Files API → Signed URL → OCR → LLM → Delete File
// 
// A API de OCR do Mistral NÃO aceita base64 inline para PDFs.
// Apenas aceita:
// - type: "document_url" com URL pública
// - type: "file" com file_id de arquivo pré-carregado
// - type: "image_url" para imagens (suporta base64 data URL)
// ============================================================

const MISTRAL_API_URL = 'https://api.mistral.ai/v1';

// System prompt para extração estruturada - v12.4 with enhanced premium extraction
const EXTRACTION_PROMPT = `Você é um perito especialista em extração de dados de documentos de seguros brasileiros.

## INSTRUÇÕES CRÍTICAS:

Analise o Markdown fornecido e extraia os dados estruturados. Retorne APENAS JSON válido.

## REGRAS DE EXTRAÇÃO:

1. **CPF/CNPJ**: APENAS DÍGITOS (11 para CPF, 14 para CNPJ). Se não encontrar, retorne null.

2. **NOME DO CLIENTE**: 
   - Extraia da seção "Dados do Segurado" ou "Segurado"
   - REMOVA prefixos de OCR: RA, RG, CP, NR, NO, SEQ, COD, REF, ID, PROP
   - REMOVA termos de veículo: MODELO, VERSAO, FLEX, AUT, MANUAL, TURBO, TSI
   - Aplique Title Case (primeira letra maiúscula)
   - Se parecer lixo (ex: "man ual", "modelo"), retorne null

3. **NÚMERO DA APÓLICE**: 
   - Procure por "Apólice", "Proposta", "Nº", "Número"
   - Números válidos geralmente têm 6+ dígitos
   - NÃO confunda com "Manual" (transmissão de veículo)

4. **VALORES (PRÊMIOS)** - ⚠️ REGRA FINANCEIRA CRÍTICA (BASE DA COMISSÃO):

   ### PRIORIDADE ABSOLUTA: PRÊMIO LÍQUIDO
   
   O valor mais importante é o **PRÊMIO LÍQUIDO** - é o valor BASE do seguro que será usado para calcular comissão.
   
   **SINÔNIMOS ACEITOS PARA PRÊMIO LÍQUIDO** (buscar nesta ordem):
   - "Prêmio Líquido"
   - "Premio Liquido"
   - "Importe Líquido"
   - "Valor Líquido"
   - "Prêmio Comercial"
   - "Prêmio Tarifário"
   - "Prêmio Individual"
   - "Prêmio Puro"
   - "Líquido do Seguro"
   - Geralmente aparece em seção de resumo financeiro ou demonstrativo de prêmio
   
   **SINÔNIMOS ACEITOS PARA PRÊMIO TOTAL**:
   - "Prêmio Total"
   - "Premio Total"
   - "Valor Total"
   - "Total a Pagar"
   - "Custo Total"
   - "Prêmio com IOF"
   - "Total do Seguro"
   - "Valor Final"
   
   ### ⛔ VALORES A IGNORAR (NÃO são o prêmio principal):
   - "Prêmio de Cobertura" ou "Prêmio de Coberturas" (soma de coberturas individuais)
   - "IOF" (imposto)
   - "Custo de Apólice" (taxa administrativa)
   - "Prêmio Adicional" (adicionais opcionais)
   - "Adicional de Fracionamento" (juros de parcelamento)
   - Valores individuais de tabelas de coberturas (ex: "Colisão: R$ X")
   
   ### REGRA DE FALLBACK:
   1. Se encontrar Prêmio Líquido → use diretamente
   2. Se NÃO encontrar Líquido mas encontrar Total → calcule: premio_total / 1.0738
   3. Se encontrar parcelas → multiplique: valor_parcela × num_parcelas
   
   ### FORMATAÇÃO OBRIGATÓRIA:
   - Retorne como NUMBER (float puro), não string
   - R$ 1.234,56 → 1234.56
   - Sem símbolos de moeda (R$, $)
   - Sem separadores de milhar
   - Use ponto como separador decimal

5. **DATAS (VIGÊNCIA)** - BUSCA EXAUSTIVA:
   - Formato OBRIGATÓRIO: YYYY-MM-DD (ex: 2024-03-15)
   - SINÔNIMOS ACEITOS PARA DATA INÍCIO:
     * "Vigência", "Início da Vigência", "Data Inicial"
     * "Início", "Válido de", "A partir de"
     * "Data de Início", "Vigência Início"
   - SINÔNIMOS ACEITOS PARA DATA FIM:
     * "Término", "Fim da Vigência", "Data Final"
     * "Válido até", "Até", "Vencimento"
     * "Data de Término", "Vigência Fim"
   - PADRÕES DE DATA ACEITOS: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
   - NUNCA retorne null se houver qualquer indício de data no documento
   - Se encontrar apenas UMA data, assuma vigência de 1 ano (some 365 dias)

6. **RAMO DO SEGURO**: 
   - AUTO, RESIDENCIAL, VIDA, EMPRESARIAL, SAUDE, etc
   - Palavras-chave: "veículo", "placa" → AUTO; "residência" → RESIDENCIAL

7. **OBJETO SEGURADO**:
   - Para AUTO: "[Marca] [Modelo] [Ano] - Placa: [XXX-0000]"
   - Para RESIDENCIAL: Endereço do imóvel
   - Para VIDA: Nome do beneficiário ou "Vida Individual/Grupo"

8. **PLACA/CHASSI** (para AUTO):
   - Extraia separadamente para o campo "placa"
   - Formato: ABC-1D23 ou ABC1D23

## FORMATO DE SAÍDA (JSON):

{
  "status": "COMPLETO" | "INCOMPLETO",
  "cliente": {
    "nome": string | null,
    "cpf_cnpj": string | null,
    "email": string | null,
    "telefone": string | null,
    "endereco_completo": string | null
  },
  "apolice": {
    "numero": string | null,
    "numero_proposta": string | null,
    "vigencia_inicio": string | null,
    "vigencia_fim": string | null,
    "ramo": string | null,
    "objeto_segurado": string | null,
    "placa": string | null,
    "premio_liquido": number | null,
    "premio_total": number | null,
    "seguradora": string | null
  }
}

## REGRA DE STATUS (OBRIGATÓRIO):
- Retorne status: "COMPLETO" APENAS se TODOS os seguintes campos forem extraídos com valores válidos:
  * nome do cliente (não vazio)
  * cpf_cnpj (exatamente 11 ou 14 dígitos)
  * numero da apólice (não vazio)
  * premio_liquido OU premio_total (valor numérico > 0)
  * data_inicio E data_fim (formato YYYY-MM-DD)
- Se QUALQUER um desses campos estiver faltando, vazio ou nulo, OBRIGATORIAMENTE retorne status: "INCOMPLETO"
- NUNCA retorne status: "COMPLETO" se prêmio for 0 ou nulo!`;

// Patterns de lixo para filtrar
const GARBAGE_PATTERNS = [
  /^man\s*ual$/i,
  /^aut(omatico|o)?$/i,
  /^modelo$/i,
  /^segurado$/i,
  /^ramo$/i,
  /^n[°º]?$/i,
  /^[a-z]{1,4}\s+[a-z]{1,4}$/i,
  /^\d{1,3}$/,
];

function cleanGarbageValue(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 3) return null;
  if (GARBAGE_PATTERNS.some(p => p.test(trimmed))) {
    console.log(`🧹 [GARBAGE] Removido: "${trimmed}"`);
    return null;
  }
  return trimmed;
}

// ============================================================
// MISTRAL FILES API HELPERS
// ============================================================

interface MistralFile {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
}

/**
 * Upload arquivo para Mistral Files API
 * Retorna o file_id para uso posterior
 */
async function uploadToMistralFiles(
  base64: string, 
  fileName: string, 
  apiKey: string
): Promise<MistralFile> {
  console.log(`📤 [FILES] Uploading ${fileName} to Mistral Files API...`);
  
  // Converte base64 para Blob
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'application/pdf' });
  
  // Cria FormData para upload
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('purpose', 'ocr');
  
  const response = await fetch(`${MISTRAL_API_URL}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [FILES] Upload failed ${response.status}:`, errorText);
    throw new Error(`Mistral Files upload failed: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`✅ [FILES] Upload OK: ${result.id} (${(result.bytes / 1024).toFixed(0)}KB)`);
  return result;
}

/**
 * Obtém URL assinada temporária para o arquivo
 */
async function getSignedUrl(fileId: string, apiKey: string): Promise<string> {
  console.log(`🔗 [FILES] Getting signed URL for ${fileId}...`);
  
  const response = await fetch(`${MISTRAL_API_URL}/files/${fileId}/url?expiry=60`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [FILES] Signed URL failed ${response.status}:`, errorText);
    throw new Error(`Mistral signed URL failed: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`✅ [FILES] Signed URL obtained (expires in 60s)`);
  return result.url;
}

/**
 * Deleta arquivo temporário após processamento
 */
async function deleteFile(fileId: string, apiKey: string): Promise<void> {
  console.log(`🗑️ [FILES] Deleting temporary file ${fileId}...`);
  
  try {
    const response = await fetch(`${MISTRAL_API_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (response.ok) {
      console.log(`✅ [FILES] File ${fileId} deleted`);
    } else {
      console.warn(`⚠️ [FILES] Delete failed (non-critical): ${response.status}`);
    }
  } catch (e) {
    console.warn(`⚠️ [FILES] Delete error (non-critical):`, e);
  }
}

// ============================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================================

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  const delays = [2000, 4000, 8000]; // 2s, 4s, 8s
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      if (attempt < maxRetries) {
        const delay = delays[attempt];
        console.warn(`⚠️ [RATE LIMIT] 429 received, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error(`❌ [RATE LIMIT] Max retries exceeded`);
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded for rate limiting');
}

// ============================================================
// OCR + LLM PIPELINE
// ============================================================

/**
 * Chama Mistral OCR usando document_url
 * Formato correto: { "type": "document_url", "document_url": "..." }
 */
async function callMistralOCR(signedUrl: string, apiKey: string): Promise<string> {
  console.log('📖 [OCR] Calling Mistral OCR with signed URL...');
  
  const payload = {
    model: 'mistral-ocr-latest',
    document: {
      type: 'document_url',
      document_url: signedUrl,
    },
    include_image_base64: false,
  };
  
  console.log('📤 [OCR] Payload:', JSON.stringify({ model: payload.model, document: { type: payload.document.type } }));
  
  const response = await fetchWithRetry(`${MISTRAL_API_URL}/ocr`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [OCR] Error ${response.status}:`, errorText);
    throw new Error(`Mistral OCR error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ [OCR] Response received from Mistral');
  
  // Extrai o Markdown de todas as páginas
  const pages = result.pages || [];
  const markdownParts: string[] = [];
  
  for (const page of pages) {
    if (page.markdown) {
      markdownParts.push(page.markdown);
    }
  }
  
  const fullMarkdown = markdownParts.join('\n\n---\n\n');
  console.log(`✅ [OCR] ${pages.length} page(s) extracted (${(fullMarkdown.length / 1024).toFixed(1)}KB Markdown)`);
  
  return fullMarkdown;
}

/**
 * Chama Mistral OCR para imagens usando image_url com data URL base64
 * Formato: { "type": "image_url", "image_url": "data:image/jpeg;base64,..." }
 */
async function callMistralOCRImage(base64: string, mimeType: string, apiKey: string): Promise<string> {
  console.log('🖼️ [OCR IMAGE] Processing image with Mistral OCR...');
  
  const dataUrl = `data:${mimeType};base64,${base64}`;
  
  const payload = {
    model: 'mistral-ocr-latest',
    document: {
      type: 'image_url',
      image_url: dataUrl,
    },
    include_image_base64: false,
  };
  
  const response = await fetchWithRetry(`${MISTRAL_API_URL}/ocr`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [OCR IMAGE] Error ${response.status}:`, errorText);
    throw new Error(`Mistral OCR image error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  const pages = result.pages || [];
  const markdownParts: string[] = [];
  
  for (const page of pages) {
    if (page.markdown) {
      markdownParts.push(page.markdown);
    }
  }
  
  const fullMarkdown = markdownParts.join('\n\n');
  console.log(`✅ [OCR IMAGE] Extracted ${(fullMarkdown.length / 1024).toFixed(1)}KB Markdown`);
  
  return fullMarkdown;
}

/**
 * Chama Mistral LLM para extrair dados estruturados
 */
async function callMistralLLM(markdown: string, apiKey: string): Promise<any> {
  console.log('🧠 [LLM] Processing structured extraction...');
  
  const response = await fetchWithRetry(`${MISTRAL_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Extraia os dados do seguinte documento:\n\n${markdown}` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [LLM] Error:', response.status, errorText);
    throw new Error(`Mistral LLM error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Mistral LLM returned no content');
  }
  
  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('❌ [LLM] Invalid JSON:', content);
    throw new Error('LLM response is not valid JSON');
  }
  
  console.log(`✅ [LLM] Status: ${parsed.status || 'UNKNOWN'}`);
  return parsed;
}

const PROPOSAL_PROMPT = `Você é um assistente de IA especialista em extrair dados de ORÇAMENTOS (Propostas) de seguro em PDF.
Sua tarefa é extrair as DIFERENTES OPÇÕES de orçamento disponíveis a partir do OCR em Markdown.

Retorne APENAS um objeto JSON no formato exato:
{
  "client_name": "Nome do Cliente ou null",
  "options": [
    {
      "insurer_name": "Nome da Seguradora",
      "plan_name": "Nome do Plano",
      "price_annual": 1500.50,
      "price_monthly": 150.05,
      "deductible": "Franquia: R$ 2.000,00",
      "coverage_items": ["Danos Morais", "Colisão"],
      "is_recommended": true
    }
  ]
}

Regras:
1. price_annual e price_monthly devem ser NÚMEROS FLOAT sem R$ ou formatação (ex: 1500.50)
2. Extraia TODAS as opções principais encontradas (diferentes seguradoras ou planos).
3. Para cada opção, liste os nomes das coberturas em coverage_items.
4. is_recommended true para a primeira opção.
`;

async function callMistralLLMProposal(markdown: string, apiKey: string): Promise<any> {
  console.log('🧠 [LLM] Processing proposal extraction...');
  
  const response = await fetchWithRetry(`${MISTRAL_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: PROPOSAL_PROMPT },
        { role: 'user', content: `Extraia os dados de opções do orçamento:\n\n${markdown}` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral LLM Proposal error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error('Mistral LLM returned no content');
  
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error('LLM response is not valid JSON');
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    const fileBase64 = body.base64 || body.fileBase64;
    const mimeType = body.mimeType || 'application/pdf';
    const fileName = body.fileName || 'document.pdf';

    if (!fileBase64) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'base64 is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    if (!MISTRAL_API_KEY) {
      console.error('❌ MISTRAL_API_KEY not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'MISTRAL_API_KEY not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remove data URL prefix if present
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    
    console.log(`📄 [V12 MISTRAL] Processing: ${fileName} (${(cleanBase64.length / 1024).toFixed(0)}KB)`);
    
    const startTime = Date.now();
    const isImage = mimeType.startsWith('image/');
    
    let markdown: string;
    let fileId: string | null = null;
    let ocrDuration: number;
    
    if (isImage) {
      // ========== IMAGES: Direct base64 data URL ==========
      const ocrStart = Date.now();
      markdown = await callMistralOCRImage(cleanBase64, mimeType, MISTRAL_API_KEY);
      ocrDuration = Date.now() - ocrStart;
    } else {
      // ========== PDFs: Upload → Signed URL → OCR → Delete ==========
      
      // Step 1: Upload to Mistral Files
      const uploadStart = Date.now();
      const uploadedFile = await uploadToMistralFiles(cleanBase64, fileName, MISTRAL_API_KEY);
      fileId = uploadedFile.id;
      const uploadDuration = Date.now() - uploadStart;
      console.log(`📤 [UPLOAD] Completed in ${uploadDuration}ms`);
      
      try {
        // Step 2: Get signed URL
        const signedUrl = await getSignedUrl(fileId, MISTRAL_API_KEY);
        
        // Step 3: OCR with signed URL
        const ocrStart = Date.now();
        markdown = await callMistralOCR(signedUrl, MISTRAL_API_KEY);
        ocrDuration = Date.now() - ocrStart;
      } finally {
        // Step 4: Always delete temporary file
        if (fileId) {
          await deleteFile(fileId, MISTRAL_API_KEY);
        }
      }
    }
    
    if (!markdown || markdown.trim().length < 50) {
      console.warn('⚠️ [OCR] Markdown too short or empty');
      return new Response(JSON.stringify({ 
        success: true,
        data: body.mode === 'proposal' ? { options: [] } : { status: 'INCOMPLETO' },
        source: 'MISTRAL',
        fileName,
        durationMs: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // ========== LLM Extraction ==========
    const llmStart = Date.now();
    let extracted;
    let llmDuration;
    
    if (body.mode === 'proposal') {
      extracted = await callMistralLLMProposal(markdown, MISTRAL_API_KEY);
      llmDuration = Date.now() - llmStart;
      
      return new Response(JSON.stringify({
        success: true,
        data: extracted,
        source: 'MISTRAL',
        fileName,
        durationMs: Date.now() - startTime,
        _debug: { ocrDuration, llmDuration }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      extracted = await callMistralLLM(markdown, MISTRAL_API_KEY);
      llmDuration = Date.now() - llmStart;
    }
    
    const totalDuration = Date.now() - startTime;
    
    // ========== Cleanup and Validation ==========
    const cliente = extracted.cliente || {};
    const apolice = extracted.apolice || {};
    
    const cleaned = {
      status: extracted.status || 'INCOMPLETO',
      nome_cliente: cleanGarbageValue(cliente.nome),
      cpf_cnpj: cliente.cpf_cnpj ? cliente.cpf_cnpj.replace(/\D/g, '') : null,
      email: cliente.email || null,
      telefone: cliente.telefone || null,
      endereco_completo: cliente.endereco_completo || null,
      numero_apolice: cleanGarbageValue(apolice.numero),
      numero_proposta: cleanGarbageValue(apolice.numero_proposta),
      nome_seguradora: apolice.seguradora || null,
      ramo_seguro: apolice.ramo || null,
      data_inicio: apolice.vigencia_inicio || null,
      data_fim: apolice.vigencia_fim || null,
      objeto_segurado: apolice.objeto_segurado || null,
      placa: apolice.placa || null,
      premio_liquido: typeof apolice.premio_liquido === 'number' ? apolice.premio_liquido : null,
      premio_total: typeof apolice.premio_total === 'number' ? apolice.premio_total : null,
    };

    // Fallback: calculate net premium if only total is available
    if (!cleaned.premio_liquido && cleaned.premio_total) {
      cleaned.premio_liquido = cleaned.premio_total / 1.0738;
      console.log(`📊 [FALLBACK] Net premium calculated: ${cleaned.premio_liquido.toFixed(2)}`);
    }

    // Validate CPF/CNPJ (must be 11 or 14 digits)
    if (cleaned.cpf_cnpj && cleaned.cpf_cnpj.length !== 11 && cleaned.cpf_cnpj.length !== 14) {
      console.log(`🧹 [INVALID CPF] ${cleaned.cpf_cnpj} (${cleaned.cpf_cnpj.length} digits)`);
      cleaned.cpf_cnpj = null;
    }

    console.log(`✅ [V12] Extraction completed in ${totalDuration}ms (OCR: ${ocrDuration}ms, LLM: ${llmDuration}ms)`);
    console.log(`   Status: ${cleaned.status}`);
    console.log(`   Client: ${cleaned.nome_cliente || 'N/A'}`);
    console.log(`   CPF/CNPJ: ${cleaned.cpf_cnpj || 'N/A'}`);
    console.log(`   Policy: ${cleaned.numero_apolice || 'N/A'}`);
    console.log(`   Premium: R$ ${cleaned.premio_liquido?.toFixed(2) || 'N/A'}`);

    return new Response(JSON.stringify({ 
      success: true, 
      data: cleaned,
      source: 'MISTRAL',
      fileName,
      durationMs: totalDuration,
      metrics: {
        ocrMs: ocrDuration,
        llmMs: llmDuration,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-policy-mistral:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
