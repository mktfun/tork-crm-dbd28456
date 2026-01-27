import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// PROMPT OTIMIZADO PARA EXTRAÇÃO DE APÓLICES (v3.0 Veicular)
// ============================================================
const EXTRACTION_PROMPT = `Você é um especialista em extração de dados de apólices de seguro brasileiras.
Analise TODAS as páginas (1-4) deste documento e extraia os dados com MÁXIMA PRECISÃO.

🔴 REGRAS DE OURO:

1. **RAMO DO SEGURO**:
   - Se houver PLACA, CHASSI, MARCA, MODELO de veículo → Ramo = "AUTOMÓVEL"
   - Se houver endereço residencial como objeto → Ramo = "RESIDENCIAL"
   - Se houver nome de pessoa como beneficiário → Ramo = "VIDA"
   - Se houver empresa/CNPJ como segurado → Ramo = "EMPRESARIAL"

2. **OBJETO SEGURADO** (FORMATO EXATO):
   - Para AUTOMÓVEL: "MARCA MODELO ANO - Placa: XXX-0000"
     Exemplo: "VW GOLF GTI 2024 - Placa: ABC-1234"
   - Para RESIDENCIAL: "Tipo Imóvel - Endereço Resumido"
     Exemplo: "Apartamento - Rua das Flores, 123"
   - Para VIDA: "Seguro de Vida - Nome do Titular"

3. **CLIENTE (SEGURADO)**:
   - Priorize dados que aparecem na seção "DADOS DO SEGURADO" ou "PROPONENTE"
   - CPF/CNPJ: Extraia e remova pontos/traços (apenas números)
   - IGNORE nomes de corretores, produtores ou representantes

4. **VALORES MONETÁRIOS**:
   - Extraia como NÚMEROS puros (sem R$, sem pontos de milhar)
   - Use ponto como separador decimal: 1234.56
   - Premio líquido é a base para comissão

5. **VIGÊNCIA**:
   - Busque nas 4 primeiras páginas por datas de início e fim
   - Formato obrigatório: YYYY-MM-DD

6. **IDENTIFICAÇÃO ADICIONAL**:
   - Para veículos: Placa + Chassi (se disponível)
   - Para imóveis: CEP + Número

Retorne APENAS um JSON válido com os campos especificados.`;

// Schema para carteirinha (mantido para compatibilidade)
const CARD_PROMPT = `Você é um extrator de dados especialista em carteirinhas de seguro brasileiras.
Analise esta imagem de carteirinha de seguro e extraia as seguintes informações:

**DADOS DA CARTEIRINHA:**
- nome_segurado (string) - Nome completo do titular/segurado
- numero_carteirinha (string | null) - Número da carteirinha ou apólice
- seguradora (string) - Nome da seguradora
- tipo_seguro (string) - Tipo do seguro (Auto, Saúde, Vida, Residencial, etc.)
- vigencia_inicio (string | null) - Data início da vigência no formato YYYY-MM-DD
- vigencia_fim (string | null) - Data fim da vigência no formato YYYY-MM-DD
- telefone_assistencia (string | null) - Telefone de assistência 24h
- placa (string | null) - Placa do veículo (se for seguro auto)
- chassi (string | null) - Número do chassi (se houver)
- cpf_cnpj (string | null) - CPF ou CNPJ do segurado

REGRAS:
1. Se não encontrar um campo, retorne null
2. Datas DEVEM estar no formato YYYY-MM-DD
3. Telefones: mantenha a formatação original
4. Para tipo_seguro, normalize para: "Auto", "Residencial", "Vida", "Empresarial", "Saúde", "Viagem", ou "Outros"

Retorne APENAS um objeto JSON válido, sem texto adicional.`;

// ============================================================
// UTILITÁRIOS
// ============================================================

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, [...chunk]);
  }
  return btoa(binary);
}

async function trimPdfTo4Pages(base64: string): Promise<string> {
  try {
    const pdfBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    if (pageCount <= 4) {
      console.log(`📄 PDF tem ${pageCount} páginas, mantendo todas`);
      return base64;
    }
    
    // Remove páginas excedentes (mantém apenas 1-4)
    const pagesToRemove = pageCount - 4;
    for (let i = 0; i < pagesToRemove; i++) {
      pdfDoc.removePage(4); // Sempre remove a página 5 (índice 4)
    }
    
    const trimmedBytes = await pdfDoc.save();
    console.log(`✂️ PDF cortado: ${pageCount} → 4 páginas`);
    return uint8ArrayToBase64(new Uint8Array(trimmedBytes));
  } catch (error) {
    console.error('Erro ao cortar PDF:', error);
    return base64;
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    
    // Suporta ambos os formatos: legado (fileBase64) e novo (base64)
    const fileBase64 = body.base64 || body.fileBase64;
    const mimeType = body.mimeType || 'application/pdf';
    const documentType = body.documentType || 'policy';
    const fileName = body.fileName || 'document.pdf';

    if (!fileBase64) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'base64 or fileBase64 is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📄 Processando: ${fileName}, tipo: ${documentType}, mimeType: ${mimeType}`);
    
    // Para PDFs, cortar para 4 páginas
    let processedBase64 = fileBase64;
    if (mimeType === 'application/pdf') {
      processedBase64 = await trimPdfTo4Pages(fileBase64);
    }

    // Selecionar prompt baseado no tipo de documento
    const selectedPrompt = documentType === 'card' ? CARD_PROMPT : EXTRACTION_PROMPT;

    // Schema para carteirinha
    const cardSchema = {
      type: 'object',
      properties: {
        nome_segurado: { type: 'string' },
        numero_carteirinha: { type: 'string', nullable: true },
        seguradora: { type: 'string' },
        tipo_seguro: { type: 'string' },
        vigencia_inicio: { type: 'string', nullable: true },
        vigencia_fim: { type: 'string', nullable: true },
        telefone_assistencia: { type: 'string', nullable: true },
        placa: { type: 'string', nullable: true },
        chassi: { type: 'string', nullable: true },
        cpf_cnpj: { type: 'string', nullable: true },
      },
      required: ['nome_segurado', 'seguradora', 'tipo_seguro'],
    };

    // Schema para apólice (v3.0 - com campos veiculares)
    const policySchema = {
      type: 'object',
      properties: {
        cliente: {
          type: 'object',
          properties: {
            nome_completo: { type: 'string' },
            cpf_cnpj: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            telefone: { type: 'string', nullable: true },
            endereco_completo: { type: 'string', nullable: true },
          },
          required: ['nome_completo'],
        },
        apolice: {
          type: 'object',
          properties: {
            numero_apolice: { type: 'string' },
            nome_seguradora: { type: 'string' },
            data_inicio: { type: 'string' },
            data_fim: { type: 'string' },
            ramo_seguro: { type: 'string' },
          },
          required: ['numero_apolice', 'nome_seguradora', 'data_inicio', 'data_fim', 'ramo_seguro'],
        },
        objeto_segurado: {
          type: 'object',
          properties: {
            descricao_bem: { type: 'string' },
            identificacao_adicional: { type: 'string', nullable: true },
          },
          required: ['descricao_bem'],
        },
        valores: {
          type: 'object',
          properties: {
            premio_liquido: { type: 'number' },
            premio_total: { type: 'number' },
          },
          required: ['premio_liquido', 'premio_total'],
        },
      },
      required: ['cliente', 'apolice', 'objeto_segurado', 'valores'],
    };

    const selectedSchema = documentType === 'card' ? cardSchema : policySchema;

    console.log(`🤖 Enviando para Gemini 2.0 Flash...`);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: selectedPrompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: processedBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: selectedSchema,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Gemini API error: ${response.status}` 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('Gemini response received');

    const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!extractedText) {
      console.error('No text in Gemini response');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No data extracted from document' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let extractedData;
    try {
      // Limpa blocos de código markdown que o Gemini 2.0 pode adicionar
      let cleanedText = extractedText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      extractedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON:', extractedText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to parse extracted data' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Para documentType === 'policy', converter para formato BulkOCRExtractedPolicy
    if (documentType === 'policy') {
      const policyData = extractedData;
      
      // Normalizar CPF/CNPJ (remover formatação)
      const cpfCnpjNormalized = policyData.cliente?.cpf_cnpj?.replace(/\D/g, '') || null;
      
      // Construir objeto segurado formatado
      let objetoFormatado = policyData.objeto_segurado?.descricao_bem || '';
      if (policyData.objeto_segurado?.identificacao_adicional) {
        objetoFormatado = objetoFormatado.includes(policyData.objeto_segurado.identificacao_adicional)
          ? objetoFormatado
          : `${objetoFormatado} - ${policyData.objeto_segurado.identificacao_adicional}`;
      }
      
      // Gerar título sugerido
      const nomeCliente = policyData.cliente?.nome_completo || 'Cliente';
      const ramo = policyData.apolice?.ramo_seguro || 'Seguro';
      const seguradora = policyData.apolice?.nome_seguradora || '';
      const tituloSugerido = `${nomeCliente} - ${ramo} (${seguradora})`.substring(0, 100);
      
      const bulkFormat = {
        nome_cliente: policyData.cliente?.nome_completo || '',
        cpf_cnpj: cpfCnpjNormalized,
        email: policyData.cliente?.email || null,
        telefone: policyData.cliente?.telefone || null,
        endereco_completo: policyData.cliente?.endereco_completo || null,
        tipo_documento: 'APOLICE' as const,
        numero_apolice: policyData.apolice?.numero_apolice || '',
        numero_proposta: null,
        tipo_operacao: null,
        endosso_motivo: null,
        nome_seguradora: policyData.apolice?.nome_seguradora || '',
        ramo_seguro: policyData.apolice?.ramo_seguro || '',
        data_inicio: policyData.apolice?.data_inicio || '',
        data_fim: policyData.apolice?.data_fim || '',
        descricao_bem: policyData.objeto_segurado?.descricao_bem || null,
        objeto_segurado: objetoFormatado,
        identificacao_adicional: policyData.objeto_segurado?.identificacao_adicional || null,
        premio_liquido: policyData.valores?.premio_liquido || 0,
        premio_total: policyData.valores?.premio_total || 0,
        titulo_sugerido: tituloSugerido,
        arquivo_origem: fileName,
      };
      
      console.log(`✅ Extração concluída: ${nomeCliente} - ${ramo}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: bulkFormat,
        documentType: 'policy',
        stats: {
          pages: 4,
          fileName: fileName,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Formato legado para carteirinhas
    console.log('Successfully extracted data:', JSON.stringify(extractedData, null, 2));

    return new Response(JSON.stringify({ 
      success: true, 
      data: extractedData,
      documentType: documentType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-policy function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
