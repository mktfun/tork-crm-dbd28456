import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MISTRAL_API_URL = 'https://api.mistral.ai/v1';

// ============================================================
// AGENTE 1: EXTRATOR OCR ESTRUTURADO
// 
// Responsabilidade: Extrair Markdown estruturado preservando layout
// Entrada: PDF base64
// Saída: Markdown bem formatado com seções identificadas
// ============================================================

// System prompt ENXUTO (20 linhas) - focado em estruturação
const EXTRACTION_PROMPT = `Você é um OCR estruturador de documentos de seguros.

TAREFA: Converta o documento para Markdown PRESERVANDO o layout visual.

REGRAS CRÍTICAS:
1. Identifique SEÇÕES visuais e marque com "=== NOME DA SEÇÃO ==="
2. Para tabelas, use formato | coluna1 | coluna2 |
3. MANTENHA PROXIMIDADE: se "Prêmio Líquido" está próximo de "R$ 1.234", una na mesma linha
4. Marque texto duvidoso com [OCR_INCERTO: texto?]
5. Preserve números EXATAMENTE como aparecem (não arredonde)

ESTRUTURA ESPERADA:
=== DADOS DO SEGURADO ===
Nome: [nome completo]
CPF/CNPJ: [documento]

=== VALORES FINANCEIROS ===
| Campo              | Valor        |
|--------------------|--------------|
| Prêmio Líquido     | R$ X.XXX,XX |
| Prêmio Total       | R$ X.XXX,XX |

=== VIGÊNCIA ===
Início: DD/MM/YYYY
Fim: DD/MM/YYYY`;

// ============================================================
// MISTRAL FILES API HELPERS (reutilizando do analyze-policy-mistral)
// ============================================================

interface MistralFile {
    id: string;
    object: string;
    bytes: number;
    created_at: number;
    filename: string;
    purpose: string;
}

async function uploadToMistralFiles(
    base64: string,
    fileName: string,
    apiKey: string
): Promise<MistralFile> {
    console.log(`📤 [AGENT-1] Uploading ${fileName} to Mistral Files...`);

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });

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
        throw new Error(`Mistral Files upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ [AGENT-1] Upload OK: ${result.id}`);
    return result;
}

async function getSignedUrl(fileId: string, apiKey: string): Promise<string> {
    const response = await fetch(`${MISTRAL_API_URL}/files/${fileId}/url?expiry=60`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral signed URL failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.url;
}

async function deleteFile(fileId: string, apiKey: string): Promise<void> {
    try {
        await fetch(`${MISTRAL_API_URL}/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });
        console.log(`🗑️ [AGENT-1] File ${fileId} deleted`);
    } catch (e) {
        console.warn(`⚠️ [AGENT-1] Delete error (non-critical):`, e);
    }
}

// ============================================================
// OCR COM SYSTEM PROMPT CUSTOMIZADO
// ============================================================

async function callMistralOCRStructured(
    signedUrl: string,
    apiKey: string
): Promise<string> {
    console.log('📖 [AGENT-1] Calling Mistral OCR with structured prompt...');

    const payload = {
        model: 'mistral-ocr-latest',
        document: {
            type: 'document_url',
            document_url: signedUrl,
        },
        include_image_base64: false,
        // ✨ NOVIDADE: Incluir system prompt para guiar a extração
        system_prompt: EXTRACTION_PROMPT,
    };

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
        throw new Error(`Mistral OCR error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    const pages = result.pages || [];
    const markdownParts: string[] = [];

    for (const page of pages) {
        if (page.markdown) {
            markdownParts.push(page.markdown);
        }
    }

    const fullMarkdown = markdownParts.join('\n\n---\n\n');
    console.log(`✅ [AGENT-1] Extracted ${pages.length} pages (${(fullMarkdown.length / 1024).toFixed(1)}KB)`);

    return fullMarkdown;
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

        const fileBase64 = body.base64 || body.fileBase64;
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
            throw new Error('MISTRAL_API_KEY not configured');
        }

        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');

        console.log(`📄 [AGENT-1] Processing: ${fileName}`);

        // Workflow: Upload → Signed URL → OCR Estruturado → Delete
        const uploadedFile = await uploadToMistralFiles(cleanBase64, fileName, MISTRAL_API_KEY);
        const fileId = uploadedFile.id;

        let structuredMarkdown: string;

        try {
            const signedUrl = await getSignedUrl(fileId, MISTRAL_API_KEY);
            structuredMarkdown = await callMistralOCRStructured(signedUrl, MISTRAL_API_KEY);
        } finally {
            await deleteFile(fileId, MISTRAL_API_KEY);
        }

        const duration = Date.now() - startTime;

        console.log(`✅ [AGENT-1] Completed in ${duration}ms`);

        return new Response(JSON.stringify({
            success: true,
            markdown: structuredMarkdown,
            fileName,
            durationMs: duration,
            agent: 'AGENT-1-EXTRACTOR',
            charsExtracted: structuredMarkdown.length,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ [AGENT-1] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            agent: 'AGENT-1-EXTRACTOR',
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
