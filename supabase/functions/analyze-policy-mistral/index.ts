import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// MISTRAL INTELLIGENCE V11 - OCR + LLM Pipeline
// 
// Fluxo: PDF Base64 → Mistral OCR → Markdown → Mistral Large → JSON
// ============================================================

const MISTRAL_API_URL = 'https://api.mistral.ai/v1';

// System prompt para extração estruturada
const EXTRACTION_PROMPT = `Você é um especialista em extração de dados de documentos de seguros brasileiros.

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

4. **VALORES (PRÊMIOS)**:
   - Retorne como NUMBER (float), não string
   - R$ 1.234,56 → 1234.56
   - Se não encontrar prêmio líquido, calcule: premio_total / 1.0738

5. **DATAS**: Formato YYYY-MM-DD (ex: 2024-03-15)

6. **RAMO DO SEGURO**: 
   - AUTO, RESIDENCIAL, VIDA, EMPRESARIAL, SAUDE, etc
   - Palavras-chave: "veículo", "placa" → AUTO; "residência" → RESIDENCIAL

7. **OBJETO SEGURADO**:
   - Para AUTO: "[Marca] [Modelo] [Ano] - Placa: [XXX-0000]"
   - Para RESIDENCIAL: Endereço do imóvel
   - Para VIDA: Nome do beneficiário ou "Vida Individual/Grupo"

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

Se campos CRÍTICOS (nome, cpf_cnpj, numero da apolice) estiverem faltando, retorne status: "INCOMPLETO".`;

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

// Chama Mistral OCR para extrair Markdown do PDF
// FORMATO CORRETO: type: "base64", source_base64, source_type (para dados inline)
async function callMistralOCR(base64: string, mimeType: string, apiKey: string): Promise<string> {
  console.log('📖 [OCR] Iniciando extração de texto via Mistral OCR...');
  
  // Remove prefixo data:application/pdf;base64, se presente
  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
  
  // Payload oficial para Mistral OCR com document inline (base64)
  const payload = {
    model: 'mistral-ocr-latest',
    document: {
      type: 'document_content',
      content: cleanBase64,
    },
    include_image_base64: false,
  };
  
  console.log(`📤 [OCR] Enviando ${(cleanBase64.length / 1024).toFixed(0)}KB para Mistral OCR...`);
  
  const response = await fetch(`${MISTRAL_API_URL}/ocr`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [OCR] Erro ${response.status}:`, errorText);
    throw new Error(`Mistral OCR error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ [OCR] Resposta recebida do Mistral');
  
  // Extrai o Markdown de todas as páginas
  const pages = result.pages || [];
  const markdownParts: string[] = [];
  
  for (const page of pages) {
    if (page.markdown) {
      markdownParts.push(page.markdown);
    }
  }
  
  const fullMarkdown = markdownParts.join('\n\n---\n\n');
  console.log(`✅ [OCR] ${pages.length} página(s) extraídas (${(fullMarkdown.length / 1024).toFixed(1)}KB Markdown)`);
  
  return fullMarkdown;
}

// Chama Mistral LLM para extrair dados estruturados
async function callMistralLLM(markdown: string, apiKey: string): Promise<any> {
  console.log('🧠 [LLM] Processando extração estruturada...');
  
  const response = await fetch(`${MISTRAL_API_URL}/chat/completions`, {
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
    console.error('❌ [LLM] Erro:', response.status, errorText);
    throw new Error(`Mistral LLM error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Mistral LLM não retornou conteúdo');
  }
  
  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('❌ [LLM] JSON inválido:', content);
    throw new Error('Resposta do LLM não é JSON válido');
  }
  
  console.log(`✅ [LLM] Status: ${parsed.status || 'UNKNOWN'}`);
  return parsed;
}

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
      console.error('❌ MISTRAL_API_KEY não configurada');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'MISTRAL_API_KEY não configurada' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📄 [V11 MISTRAL] Processando: ${fileName} (${(fileBase64.length / 1024).toFixed(0)}KB)`);
    
    const startTime = Date.now();
    
    // ========== PASSO 1: OCR ==========
    const ocrStart = Date.now();
    const markdown = await callMistralOCR(fileBase64, mimeType, MISTRAL_API_KEY);
    const ocrDuration = Date.now() - ocrStart;
    
    if (!markdown || markdown.trim().length < 50) {
      console.warn('⚠️ [OCR] Markdown muito curto ou vazio');
      return new Response(JSON.stringify({ 
        success: true,
        data: { status: 'INCOMPLETO' },
        source: 'MISTRAL',
        fileName,
        durationMs: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // ========== PASSO 2: LLM ==========
    const llmStart = Date.now();
    const extracted = await callMistralLLM(markdown, MISTRAL_API_KEY);
    const llmDuration = Date.now() - llmStart;
    
    const totalDuration = Date.now() - startTime;
    
    // ========== PASSO 3: Limpeza e validação ==========
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

    // Fallback: calcula prêmio líquido se só tiver total
    if (!cleaned.premio_liquido && cleaned.premio_total) {
      cleaned.premio_liquido = cleaned.premio_total / 1.0738;
      console.log(`📊 [FALLBACK] Prêmio líquido calculado: ${cleaned.premio_liquido.toFixed(2)}`);
    }

    // Valida CPF/CNPJ (deve ter 11 ou 14 dígitos)
    if (cleaned.cpf_cnpj && cleaned.cpf_cnpj.length !== 11 && cleaned.cpf_cnpj.length !== 14) {
      console.log(`🧹 [INVALID CPF] ${cleaned.cpf_cnpj} (${cleaned.cpf_cnpj.length} dígitos)`);
      cleaned.cpf_cnpj = null;
    }

    console.log(`✅ [V11] Extração concluída em ${totalDuration}ms (OCR: ${ocrDuration}ms, LLM: ${llmDuration}ms)`);
    console.log(`   Status: ${cleaned.status}`);
    console.log(`   Cliente: ${cleaned.nome_cliente || 'N/A'}`);
    console.log(`   CPF/CNPJ: ${cleaned.cpf_cnpj || 'N/A'}`);
    console.log(`   Apólice: ${cleaned.numero_apolice || 'N/A'}`);
    console.log(`   Prêmio: R$ ${cleaned.premio_liquido?.toFixed(2) || 'N/A'}`);

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
