import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Não autenticado');
    }

    const { inbox_id, n8n_webhook_url, contact_id } = await req.json();

    if (!inbox_id || !n8n_webhook_url) {
      throw new Error('inbox_id e n8n_webhook_url são obrigatórios');
    }

    // Buscar dados de teste do CRM
    // 1. Buscar cliente - por contact_id se fornecido, senão qualquer cliente do usuário
    let clientQuery = supabaseClient
      .from('clientes')
      .select('id, name, email, phone')
      .eq('user_id', user.id);

    if (contact_id) {
      // Tenta por UUID (id) ou por chatwoot_contact_id (numérico)
      const isUuid = contact_id.length > 10;
      clientQuery = clientQuery.eq(isUuid ? 'id' : 'chatwoot_contact_id', isUuid ? contact_id : parseInt(contact_id));
    }

    const { data: client, error: clientError } = await clientQuery.limit(1).maybeSingle();

    if (clientError || !client) {
      throw new Error(contact_id ? 'Cliente não encontrado com o ID informado. Verifique se é um UUID válido ou chatwoot_contact_id.' : 'Nenhum cliente encontrado para teste');
    }

    // 2. Buscar um pipeline e etapa do usuário
    const { data: pipeline, error: pipelineError } = await supabaseClient
      .from('crm_pipelines')
      .select('id, name, stages:crm_stages(id, name)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (pipelineError || !pipeline || !pipeline.stages || pipeline.stages.length === 0) {
      throw new Error('Nenhum pipeline/etapa encontrado para teste');
    }

    const firstStage = pipeline.stages[0];

    // 3. Buscar configurações de IA
    const { data: aiConfig } = await supabaseClient
      .from('crm_ai_global_config')
      .select('is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: stageAiConfig } = await supabaseClient
      .from('crm_ai_settings')
      .select('ai_objective, is_active')
      .eq('stage_id', firstStage.id)
      .maybeSingle();

    // 4. Montar payload de teste completo
    const testPayload = {
      event: 'message_created',
      id: Math.floor(Math.random() * 1000000),
      content: 'Esta é uma mensagem de teste do CRM Tork',
      created_at: new Date().toISOString(),
      message_type: 'incoming',
      content_type: 'text',
      private: false,
      sender: {
        id: 999999,
        name: client.name || 'Cliente Teste',
        email: client.email || 'teste@exemplo.com',
        phone_number: client.phone || '+5511999999999',
        type: 'contact'
      },
      conversation: {
        id: 888888,
        inbox_id: parseInt(inbox_id),
        status: 'open',
        contact_inbox: {
          source_id: 'test-source-id'
        }
      },
      account: {
        id: 1,
        name: 'Teste'
      },
      
      // DADOS DO CRM (ENRIQUECIDOS)
      crm: {
        user_id: user.id,
        client_id: client.id,
        contact_id: client.id,
        deal_id: null, // Teste sem deal
        deal_title: null,
        pipeline_id: pipeline.id,
        pipeline_name: pipeline.name,
        stage_id: firstStage.id,
        stage_name: firstStage.name,
        
        // System prompt de teste
        system_prompt: `Você é um assistente de vendas da empresa. ${stageAiConfig?.ai_objective || 'Atenda o cliente de forma profissional.'}`,
        
        // Config IA
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        is_active: stageAiConfig?.is_active ?? aiConfig?.is_active ?? true,
        
        // Config de resposta
        response_config: {
          send_text: true,
          send_audio: false,
          mark_read: true,
          typing_indicator: true
        },
        
        // Tools disponíveis
        tools: {
          search_contact: true,
          create_deal: true,
          update_deal_stage: true,
          list_stages: true
        }
      }
    };

    // 5. Enviar para n8n
    const n8nResponse = await fetch(n8n_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n retornou erro: ${n8nResponse.status} ${n8nResponse.statusText}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Teste enviado com sucesso! Verifique o n8n.',
        payload: testPayload
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Erro ao enviar teste'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
