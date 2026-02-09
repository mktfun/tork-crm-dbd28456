import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// AGENTE 3: VALIDADOR E CORRETOR
// 
// Responsabilidade: Extrair campos restantes + validar + limpar garbage
// Entrada: Markdown + dados financeiros do Agente 2
// Saída: Objeto final completo e validado
// ============================================================

// System prompt ENXUTO (30 linhas) - focado em validação
const VALIDATOR_PROMPT = `Você é um validador de dados de apólices de seguros.

DADOS FINANCEIROS JÁ EXTRAÍDOS:
{financial_data}

SUA TAREFA:
1. Extrair campos restantes: nome, cpf_cnpj, numero_apolice, datas, ramo, seguradora, objeto_segurado
2. Aplicar LIMPEZA AGRESSIVA:
   - REMOVER de nomes: "RA", "RG", "NR", "CP", "SEQ", "MODELO", "MANUAL", "AUT", "FLEX", "TURBO"
   - Nome DEVE ter >= 2 palavras com >= 3 letras cada
   - Se nome parecer lixo (ex: "man ual"), retorne null
3. Validar consistência:
   - CPF = exatamente 11 dígitos (apenas números)
   - CNPJ = exatamente 14 dígitos (apenas números)
   - Datas no formato YYYY-MM-DD
   - numero_apolice NÃO pode ser "manual", "modelo", etc

REGRA DE STATUS:
- "COMPLETO": nome válido + cpf válido + numero_apolice + premio_liquido > 0 + datas
- "INCOMPLETO": qualquer campo crítico faltando
- "REVISAR": confidence < 50% OU múltiplos campos duvidosos

RETORNE JSON:
{
  "status": "COMPLETO" | "INCOMPLETO" | "REVISAR",
  "nome_cliente": string | null,
  "cpf_cnpj": string | null,
  "email": string | null,
  "telefone": string | null,
  "endereco_completo": string | null,
  "numero_apolice": string | null,
  "numero_proposta": string | null,
  "nome_seguradora": string | null,
  "ramo_seguro": string | null,
  "data_inicio": string | null,
  "data_fim": string | null,
  "objeto_segurado": string | null,
  "identificacao_adicional": string | null
}`;

// Padrões de garbage para limpeza final
const GARBAGE_PATTERNS = [
    /^man\s*ual$/i,
    /^aut(omatico|o)?$/i,
    /^modelo$/i,
    /^versao$/i,
    /^segurado$/i,
    /^titular$/i,
    /^ramo$/i,
    /^proposta$/i,
    /^apolice$/i,
    /^item$/i,
    /^veiculo$/i,
    /^condutor$/i,
    /^cliente$/i,
    /^nome$/i,
    /^cpf$/i,
    /^cnpj$/i,
    /^n[°º]?$/i,
    /^nr$/i,
    /^ra$/i,
    /^sp$/i,
    /^rj$/i,
    /^\d{1,3}$/,
];

function cleanGarbageValue(value: string | null): string | null {
    if (!value) return null;

    const trimmed = value.trim();

    if (trimmed.length < 3) {
        console.log(`🧹 [AGENT-3] Removed too short: "${trimmed}"`);
        return null;
    }

    if (GARBAGE_PATTERNS.some(p => p.test(trimmed))) {
        console.log(`🧹 [AGENT-3] Removed garbage: "${trimmed}"`);
        return null;
    }

    return trimmed;
}

function cleanClientName(name: string | null): string | null {
    if (!name) return null;

    let cleaned = name.trim()
        .replace(/\s+(manual|aut|auto|automatico|automático|modelo|versao|versão|flex|turbo|tsi|gti)(\s+|$)/gi, '')
        .replace(/^(ra|rg|nr|cp|seq|cod|ref|id|prop|num)\s+/gi, '')
        .replace(/^\d+\s+/, '')
        .replace(/\s+\d+$/, '')
        .trim();

    const words = cleaned.split(/\s+/).filter(w => w.length >= 2);

    if (words.length < 2 || cleaned.length < 5) {
        console.log(`🧹 [AGENT-3] Invalid name after cleanup: "${cleaned}"`);
        return null;
    }

    // Title Case
    return words.map(w =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
}

async function callGeminiValidator(markdown: string, financialData: any): Promise<any> {
    console.log('🔍 [AGENT-3] Validating and extracting remaining fields...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
    }

    const promptWithData = VALIDATOR_PROMPT.replace(
        '{financial_data}',
        JSON.stringify(financialData, null, 2)
    );

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.0-flash-exp',
            messages: [
                { role: 'system', content: promptWithData },
                { role: 'user', content: `Extraia e valide os dados:\n\n${markdown}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Validator error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('No content from Gemini');
    }

    return JSON.parse(content);
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
        const financialData = body.financialData;
        const fileName = body.fileName || 'unknown';

        if (!markdown || !financialData) {
            return new Response(JSON.stringify({
                success: false,
                error: 'markdown and financialData are required'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`✅ [AGENT-3] Validating data for: ${fileName}`);

        const extracted = await callGeminiValidator(markdown, financialData);

        // Aplicar limpeza pós-extração
        const cleaned = {
            ...extracted,
            nome_cliente: cleanClientName(extracted.nome_cliente),
            numero_apolice: cleanGarbageValue(extracted.numero_apolice),
            numero_proposta: cleanGarbageValue(extracted.numero_proposta),
            objeto_segurado: cleanGarbageValue(extracted.objeto_segurado),
            identificacao_adicional: cleanGarbageValue(extracted.identificacao_adicional),
            cpf_cnpj: extracted.cpf_cnpj ? extracted.cpf_cnpj.replace(/\D/g, '') : null,
        };

        // Validar CPF/CNPJ
        if (cleaned.cpf_cnpj && cleaned.cpf_cnpj.length !== 11 && cleaned.cpf_cnpj.length !== 14) {
            console.log(`🧹 [AGENT-3] Invalid CPF/CNPJ: ${cleaned.cpf_cnpj} (${cleaned.cpf_cnpj.length} digits)`);
            cleaned.cpf_cnpj = null;
        }

        // Merge com dados financeiros
        const final = {
            ...cleaned,
            premio_liquido: financialData.premio_liquido,
            premio_total: financialData.premio_total,
            confidence: financialData.confidence,
            source_field: financialData.source_field,
        };

        // Ajustar status baseado em confidence
        if (financialData.confidence < 50 && final.status === 'COMPLETO') {
            final.status = 'REVISAR';
            console.log(`⚠️ [AGENT-3] Low confidence (${financialData.confidence}%), status changed to REVISAR`);
        }

        const duration = Date.now() - startTime;

        console.log(`✅ [AGENT-3] Completed in ${duration}ms`);
        console.log(`   Status: ${final.status}`);
        console.log(`   Client: ${final.nome_cliente || 'N/A'}`);
        console.log(`   CPF: ${final.cpf_cnpj || 'N/A'}`);
        console.log(`   Policy: ${final.numero_apolice || 'N/A'}`);

        return new Response(JSON.stringify({
            success: true,
            data: final,
            fileName,
            durationMs: duration,
            agent: 'AGENT-3-VALIDATOR',
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ [AGENT-3] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            agent: 'AGENT-3-VALIDATOR',
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
