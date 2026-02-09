import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// AGENTE 2: CLASSIFICADOR FINANCEIRO
// 
// Responsabilidade: Extrair APENAS valores financeiros com confiança
// Entrada: Markdown estruturado do Agente 1
// Saída: JSON com premio_liquido, premio_total, confidence score
// ============================================================

// System prompt ENXUTO (25 linhas) - focado em valores financeiros
const FINANCIAL_CLASSIFIER_PROMPT = `Você é um auditor financeiro especialista em apólices de seguros.

TAREFA: Extrair APENAS valores financeiros da seção "=== VALORES FINANCEIROS ===" ou similar.

HIERARQUIA DE PRIORIDADE (retorne o PRIMEIRO que encontrar):
1. "Prêmio Líquido" ou "Prêmio Comercial" ou "Valor Base" ou "Líquido do Seguro"
2. Se NÃO encontrar líquido mas houver "Prêmio Total": calcule liquido = total / 1.0738
3. Se houver "Parcelas" (ex: "4x R$ 500,00"): calcule liquido = (valor_parcela × qtd_parcelas) × 0.93

⚠️ IGNORE COMPLETAMENTE (não são o prêmio-base):
- "Prêmio de Cobertura" ou "Prêmio de Coberturas" (soma de itens)
- "IOF" (imposto, não prêmio)
- "Custo de Apólice" ou "Taxa" (administrativa)
- "Adicional" (opcional, não base)
- Valores individuais de tabelas de coberturas

REGRAS DE CONFIANÇA:
- confidence = 100: se encontrar "Prêmio Líquido" explícito com valor claro
- confidence = 80: se calcular de "Prêmio Total"
- confidence = 60: se calcular de parcelas
- confidence = 30: se valor ambíguo ou múltiplos candidatos

RETORNE JSON:
{
  "premio_liquido": number | null,
  "premio_total": number | null,
  "confidence": 0-100,
  "source_field": string
}`;

async function callGeminiClassifier(markdown: string): Promise<any> {
    console.log('🧠 [AGENT-2] Analyzing financial values with Gemini Flash Thinking...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.0-flash-thinking-exp',
            messages: [
                { role: 'system', content: FINANCIAL_CLASSIFIER_PROMPT },
                { role: 'user', content: `Analise este documento:\n\n${markdown}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Classifier error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('No content from Gemini');
    }

    const parsed = JSON.parse(content);
    console.log(`✅ [AGENT-2] Confidence: ${parsed.confidence}% | Source: ${parsed.source_field}`);

    return parsed;
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const startTime = Date.now();

    try {
        const body = await req.json();

        const markdown = body.markdown;
        const fileName = body.fileName || 'unknown';

        if (!markdown) {
            return new Response(JSON.stringify({
                success: false,
                error: 'markdown is required'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`💰 [AGENT-2] Classifying financial values for: ${fileName}`);

        const classification = await callGeminiClassifier(markdown);

        const duration = Date.now() - startTime;

        console.log(`✅ [AGENT-2] Completed in ${duration}ms`);

        return new Response(JSON.stringify({
            success: true,
            ...classification,
            fileName,
            durationMs: duration,
            agent: 'AGENT-2-CLASSIFIER',
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ [AGENT-2] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            agent: 'AGENT-2-CLASSIFIER',
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
