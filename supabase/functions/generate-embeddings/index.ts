import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: generate-embeddings
 * 
 * Gera embeddings usando Gemini text-embedding-004 e armazena na base de conhecimento.
 * Usado para popular ai_knowledge_base com dados de normas SUSEP, produtos, etc.
 * 
 * Payload esperado:
 * {
 *   "contents": [
 *     { "content": "Texto do conhecimento...", "metadata": { "source": "susep", "category": "normas" } }
 *   ]
 * }
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      throw new Error('GOOGLE_AI_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contents } = await req.json();

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      throw new Error('Payload inválido: "contents" deve ser um array não vazio');
    }

    console.log(`[EMBEDDINGS] Processando ${contents.length} itens de conhecimento`);

    const results = [];

    for (const item of contents) {
      const { content, metadata = {} } = item;

      if (!content || typeof content !== 'string') {
        console.warn('[EMBEDDINGS] Item ignorado: content inválido');
        continue;
      }

      // Gerar embedding usando Gemini text-embedding-004
      const embeddingResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text: content }] },
            taskType: 'RETRIEVAL_DOCUMENT', // Para documentos sendo indexados
            outputDimensionality: 768
          }),
        }
      );

      if (!embeddingResponse.ok) {
        const errorText = await embeddingResponse.text();
        console.error('[EMBEDDINGS] Gemini API error:', embeddingResponse.status, errorText);
        results.push({ success: false, error: `Gemini API error: ${embeddingResponse.status}` });
        continue;
      }

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.embedding?.values;

      if (!embedding || embedding.length === 0) {
        console.error('[EMBEDDINGS] Embedding vazio retornado');
        results.push({ success: false, error: 'Embedding vazio' });
        continue;
      }

      // Inserir na tabela ai_knowledge_base
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .insert({
          content,
          metadata,
          embedding,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[EMBEDDINGS] Erro ao inserir:', error);
        results.push({ success: false, error: error.message });
      } else {
        console.log(`[EMBEDDINGS] Conhecimento inserido: ${data.id}`);
        results.push({ success: true, id: data.id });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[EMBEDDINGS] Processamento concluído: ${successCount}/${contents.length} inseridos`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: contents.length,
        inserted: successCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[EMBEDDINGS] Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
