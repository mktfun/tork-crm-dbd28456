import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Modelos do Gemini a tentar
const MODELS_TO_TRY = ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];

async function downloadPdfAsBase64(supabaseAdmin: any, fileUrl: string): Promise<string> {
  const urlParts = new URL(fileUrl);
  const filePath = urlParts.pathname.split('/object/public/quote-uploads/')[1];

  if (!filePath) {
    throw new Error('Caminho do arquivo inválido na URL');
  }

  const { data: pdfBlob, error } = await supabaseAdmin.storage
    .from('quote-uploads')
    .download(filePath);

  if (error || !pdfBlob) {
    throw new Error(`Erro ao baixar PDF: ${error?.message}`);
  }

  const arrayBuffer = await pdfBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const base64 = btoa(bytes.reduce((data, byte) => data + String.fromCharCode(byte), ''));
  return base64;
}

const PROMPT = `Você é um assistente de IA especialista em extrair dados de ORÇAMENTOS (Propostas) de seguro em PDF.

Sua tarefa é ler o PDF fornecido e extrair as DIFERENTES OPÇÕES de orçamento disponíveis. Você DEVE retornar sua resposta APENAS como um objeto JSON válido, sem nenhum outro texto ou marcadores.

**REGRAS IMPORTANTES:**
1. **JSON ESTRITO:** Retorne APENAS o objeto JSON.
2. **MÚLTIPLAS OPÇÕES:** Orçamentos geralmente têm de 1 a 4 opções de seguradoras ou planos. Extraia TODAS as opções principais encontradas.
3. **COBERTURAS:** Liste os nomes das coberturas principais (ex: Danos Morais, Colisão).
4. **VALORES:** Retorne apenas números para os preços.
`;

async function extractWithModel(
  modelName: string,
  pdfBase64: string,
  apiKey: string
) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            client_name: { type: 'string', nullable: true },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  insurer_name: { type: 'string', nullable: true },
                  plan_name: { type: 'string', nullable: true },
                  price_annual: { type: 'number', nullable: true },
                  price_monthly: { type: 'number', nullable: true },
                  deductible: { type: 'string', nullable: true },
                  coverage_items: {
                    type: 'array',
                    items: { type: 'string' },
                    nullable: true
                  },
                  is_recommended: { type: 'boolean', nullable: true }
                }
              }
            }
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${modelName}): ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!extractedText) {
    throw new Error('Gemini não retornou dados');
  }

  return JSON.parse(extractedText);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY não configurada');
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Authorization header não encontrado');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const reqBody = await req.json();
    const { fileUrl } = reqBody;
    if (!fileUrl) throw new Error('fileUrl é obrigatório');

    console.log('📄 Processando PDF Proposal:', fileUrl);
    const pdfBase64 = await downloadPdfAsBase64(supabaseAdmin, fileUrl);

    let finalData = null;
    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(\`🤖 Tentando modelo: \${modelName}\`);
        finalData = await extractWithModel(modelName, pdfBase64, GOOGLE_AI_API_KEY);
        console.log(\`✅ Sucesso com: \${modelName}\`);
        break;
      } catch (error: unknown) {
        console.error(\`⚠️ Falha com \${modelName}:\`, error);
        lastError = error;
      }
    }

    if (!finalData) {
      throw new Error(\`Falha após tentar todos os modelos. Último erro: \${lastError}\`);
    }

    return new Response(
      JSON.stringify({ success: true, data: finalData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
