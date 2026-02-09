import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// OCR ORCHESTRATOR - Coordena os 3 Agentes
// 
// Pipeline: PDF → Agent-1 (OCR) → Agent-2 (Financial) → Agent-3 (Validator)
// Entrada: Array de arquivos base64
// Saída: Array de dados extraídos e valid ados
// ============================================================

interface ProcessedPolicy {
    success: boolean;
    fileName: string;
    data?: any;
    error?: string;
    metrics?: {
        agent1Ms: number;
        agent2Ms: number;
        agent3Ms: number;
        totalMs: number;
    };
}

async function callAgent(
    agentName: string,
    payload: any,
    supabaseUrl: string,
    supabaseKey: string
): Promise<any> {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📡 [ORCHESTRATOR] Calling ${agentName}...`);

    const { data, error } = await supabase.functions.invoke(agentName, {
        body: payload,
    });

    if (error) {
        console.error(`❌ [ORCHESTRATOR] ${agentName} error:`, error);
        throw new Error(`${agentName} failed: ${error.message}`);
    }

    if (!data.success) {
        throw new Error(`${agentName} returned error: ${data.error}`);
    }

    return data;
}

async function processFile(
    file: { base64: string; fileName: string },
    supabaseUrl: string,
    supabaseKey: string
): Promise<ProcessedPolicy> {
    const startTime = Date.now();
    const { base64, fileName } = file;

    try {
        console.log(`\n🚀 [ORCHESTRATOR] Processing: ${fileName}`);

        // ========== AGENT 1: Structured OCR ==========
        const agent1Start = Date.now();
        const agent1Result = await callAgent(
            'ocr-agent-1-extractor',
            { base64, fileName },
            supabaseUrl,
            supabaseKey
        );
        const agent1Duration = Date.now() - agent1Start;

        const markdown = agent1Result.markdown;

        if (!markdown || markdown.length < 50) {
            throw new Error('OCR extraction failed: markdown too short');
        }

        console.log(`✅ [AGENT-1] ${agent1Duration}ms | ${markdown.length} chars extracted`);

        // ========== AGENT 2: Financial Classifier ==========
        const agent2Start = Date.now();
        const agent2Result = await callAgent(
            'ocr-agent-2-classifier',
            { markdown, fileName },
            supabaseUrl,
            supabaseKey
        );
        const agent2Duration = Date.now() - agent2Start;

        console.log(`✅ [AGENT-2] ${agent2Duration}ms | Confidence: ${agent2Result.confidence}%`);

        // ========== AGENT 3: Validator ==========
        const agent3Start = Date.now();
        const agent3Result = await callAgent(
            'ocr-agent-3-validator',
            {
                markdown,
                financialData: agent2Result,
                fileName,
            },
            supabaseUrl,
            supabaseKey
        );
        const agent3Duration = Date.now() - agent3Start;

        const finalData = agent3Result.data;

        console.log(`✅ [AGENT-3] ${agent3Duration}ms | Status: ${finalData.status}`);

        const totalDuration = Date.now() - startTime;

        return {
            success: true,
            fileName,
            data: finalData,
            metrics: {
                agent1Ms: agent1Duration,
                agent2Ms: agent2Duration,
                agent3Ms: agent3Duration,
                totalMs: totalDuration,
            },
        };

    } catch (error: any) {
        console.error(`❌ [ORCHESTRATOR] ${fileName} failed:`, error.message);
        return {
            success: false,
            fileName,
            error: error.message,
        };
    }
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const totalStartTime = Date.now();

    try {
        const body = await req.json();
        const { files } = body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'files array is required'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`\n🎯 [ORCHESTRATOR] Starting multi-agent pipeline for ${files.length} files`);

        // Get Supabase credentials from environment
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
        }

        // Process files sequentially (to avoid rate limits)
        const results: ProcessedPolicy[] = [];

        for (const [index, file] of files.entries()) {
            console.log(`\n📄 [${index + 1}/${files.length}] Processing ${file.fileName}...`);

            const result = await processFile(file, supabaseUrl, supabaseKey);
            results.push(result);

            // Small delay between files to respect rate limits
            if (index < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const totalDuration = Date.now() - totalStartTime;

        // Aggregate statistics
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        const completeCount = results.filter(r => r.data?.status === 'COMPLETO').length;
        const reviewCount = results.filter(r => r.data?.status === 'REVISAR').length;

        const avgConfidence = results
            .filter(r => r.data?.confidence)
            .reduce((sum, r) => sum + r.data.confidence, 0) / Math.max(successCount, 1);

        console.log(`\n✅ [ORCHESTRATOR] Pipeline completed in ${(totalDuration / 1000).toFixed(1)}s`);
        console.log(`   Success: ${successCount}/${files.length}`);
        console.log(`   Complete: ${completeCount} | Review: ${reviewCount} | Errors: ${errorCount}`);
        console.log(`   Avg Confidence: ${avgConfidence.toFixed(1)}%`);

        // Format response compatible with existing system
        const extractedPolicies = results
            .filter(r => r.success && r.data)
            .map(r => ({
                arquivo_origem: r.fileName,
                tipo_documento: r.data.tipo_documento || 'APOLICE',
                nome_cliente: r.data.nome_cliente,
                cpf_cnpj: r.data.cpf_cnpj,
                email: r.data.email,
                telefone: r.data.telefone,
                endereco_completo: r.data.endereco_completo,
                numero_apolice: r.data.numero_apolice,
                numero_proposta: r.data.numero_proposta,
                nome_seguradora: r.data.nome_seguradora,
                ramo_seguro: r.data.ramo_seguro,
                data_inicio: r.data.data_inicio,
                data_fim: r.data.data_fim,
                objeto_segurado: r.data.objeto_segurado,
                identificacao_adicional: r.data.identificacao_adicional,
                premio_liquido: r.data.premio_liquido,
                premio_total: r.data.premio_total,
                titulo_sugerido: `${r.data.nome_cliente?.split(' ')[0] || 'Cliente'} - ${r.data.ramo_seguro || 'Seguro'} - ${r.data.nome_seguradora?.split(' ')[0] || 'CIA'}`,
                // Metadados extras do multi-agente
                _multi_agent_status: r.data.status,
                _confidence: r.data.confidence,
                _source_field: r.data.source_field,
            }));

        const errors = results
            .filter(r => !r.success)
            .map(r => ({ fileName: r.fileName, error: r.error }));

        return new Response(JSON.stringify({
            success: true,
            data: extractedPolicies,
            processed_files: results.map(r => r.fileName),
            errors,
            stats: {
                total_files: files.length,
                processed: successCount,
                failed: errorCount,
                complete: completeCount,
                review_needed: reviewCount,
                avg_confidence: avgConfidence.toFixed(1),
                total_time: `${(totalDuration / 1000).toFixed(1)}s`,
            },
            metrics: results.map(r => ({
                fileName: r.fileName,
                ...r.metrics,
            })),
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('❌ [ORCHESTRATOR] Fatal error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            data: [],
            processed_files: [],
            errors: [{ fileName: 'ORCHESTRATOR', error: error.message }],
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
