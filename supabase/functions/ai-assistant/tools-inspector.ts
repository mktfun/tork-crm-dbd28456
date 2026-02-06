
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { logger } from '../_shared/logger.ts';

// Configuração da API Lovable/Gemini
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_AI_API_KEY');
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

/**
 * Super Tool: Inspector de Documentos (SUSEP Auditor)
 * Lê arquivos do Storage (PDF, IMG, TXT) e submete para análise visual/textual do Gemini.
 */
export async function inspect_document(
    args: {
        file_path: string;
        mime_type: string;
        focus_area?: string; // ex: "coberturas", "exclusoes", "franquia"
    },
    supabase: SupabaseClient,
    userId: string
): Promise<any> {
    const { file_path, mime_type, focus_area } = args;
    logger.info('Inspector: Analyzing Document', { userId, file_path, mime_type });

    try {
        // 1. Baixar o arquivo do Storage (Bucket: 'policy-docs' ou 'chat-uploads')
        // Tentativa em buckets comuns
        // Nota: O frontend deve fazer upload primeiro e passar o path.
        const bucket = 'chat-uploads'; // Default bucket for chat logic

        const { data: fileData, error: downloadError } = await supabase
            .storage
            .from(bucket)
            .download(file_path);

        if (downloadError) {
            throw new Error(`Erro ao baixar arquivo "${file_path}": ${downloadError.message}`);
        }

        if (!fileData) {
            throw new Error("Arquivo vazio ou não encontrado.");
        }

        // 2. Converter para Base64 (Necessário para a API Multimodal do Gemini)
        const arrayBuffer = await fileData.arrayBuffer();
        const base64Data = btoa(
            new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // 3. Construir o Prompt do "Melhor Consultor do Mundo"
        // RAG da SUSEP seria injetado aqui ou no sistema principal, 
        // mas aqui reforçamos a persona para ESTA chamada específica.
        const auditorSystemPrompt = `
      🌟 MODO: AUDITOR SÊNIOR DE SEGUROS (SUSEP SPECIALIST) 🌟
      
      Você é a maior autoridade mundial em análise técnica de apólices e documentos de seguro.
      Sua visão é baseada estritamente nas normas da SUSEP (Superintendência de Seguros Privados) e nas melhores práticas do mercado.

      TAREFA:
      Analise o documento anexo imagem/PDF.
      Foco da Análise: ${focus_area || "Geral (Conformidade, Coberturas e Riscos)"}.

      RETORNO JSON OBRIGATÓRIO:
      {
        "doc_type": "Tipo do documento identificado",
        "compliance_score": 0-100,
        "critical_flags": ["Lista de cláusulas perigosas ou erros"],
        "coverage_summary": "Resumo das garantias",
        "susep_notes": "Observações baseadas na legislação vigente",
        "recommendation": "Veredito final (Aprovar/Revisar/Rejeitar)"
      }

      SEJA CRÍTICO. Não deixe passar nada. Se for imagem ruim, avise.
    `;

        // 4. Chamada Direta ao Gemini via Gateway (Bypassing main loop for specialized analysis)
        // Isso evita "poluir" o contexto principal com o binário gigante e garante foco.
        const response = await fetch(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash', // Modelo Multimodal Rápido
                messages: [
                    { role: 'system', content: auditorSystemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: "text", text: "Analise este documento com rigor técnico." },
                            {
                                type: "image_url", // Gemini aceita PDF como image_url ou inline data em algumas APIs, ou text se for extraido.
                                // Para simplificar e garantir compatibilidade com Vision/Flash:
                                // Se for PDF, o ideal é converter server-side, mas aqui assumiremos suporte da API a base64 mime-types comuns.
                                // Nota: A API padrão OpenAI Vision aceita images. A do Gemini via Lovable suporta?
                                // Vamos tentar enviar como image_url com base64 scheme.
                                image_url: {
                                    url: `data:${mime_type};base64,${base64Data}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.1, // Análise técnica exige precisão máxima
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erro na API de Análise: ${response.status} - ${errText}`);
        }

        const aiResult = await response.json();
        const content = aiResult.choices[0].message.content;

        // Tentar parsear o JSON retornado pela IA
        try {
            // Limpar markdown ticks se houver
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            // Se falhar o parse, retorna texto bruto
            return {
                success: true,
                raw_analysis: content,
                note: "A IA não retornou JSON estruturado, mas aqui está a análise."
            };
        }

    } catch (error: any) {
        logger.error('Inspector Failed', { error: error.message });
        return {
            success: false,
            error: error.message
        };
    }
}
