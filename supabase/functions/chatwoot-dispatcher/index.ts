import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

// ──────────────────────────────────────────────
// HELPER: Auto-create deal for leads without negotiation
// ──────────────────────────────────────────────
async function autoCreateDeal(userId: string, clientId: string, clientName: string | null): Promise<{
  deal: any; stage: any; stageAiSettings: any; autoCreated: boolean;
} | null> {
  try {
    // Find default pipeline
    const { data: defaultPipeline } = await supabase
      .from('crm_pipelines')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle()

    if (!defaultPipeline) {
      console.log('⚠️ No default pipeline found for user:', userId)
      return null
    }

    // Find first stage of default pipeline
    const { data: firstStage } = await supabase
      .from('crm_stages')
      .select('id, name, pipeline_id, position')
      .eq('pipeline_id', defaultPipeline.id)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!firstStage) {
      console.log('⚠️ No stages found in default pipeline:', defaultPipeline.id)
      return null
    }

    // Create deal
    const dealTitle = clientName ? `Atendimento - ${clientName}` : 'Novo Atendimento'
    const { data: newDeal, error: dealError } = await supabase
      .from('crm_deals')
      .insert({
        user_id: userId,
        client_id: clientId,
        stage_id: firstStage.id,
        title: dealTitle,
        position: 0,
        last_sync_source: 'dispatcher',
      })
      .select('id, title, stage_id')
      .single()

    if (dealError) {
      console.error('❌ Failed to auto-create deal:', dealError)
      return null
    }

    console.log(`✅ Auto-created deal "${newDeal.title}" in stage "${firstStage.name}"`)

    // Load AI settings for this stage
    const { data: settings } = await supabase
      .from('crm_ai_settings')
      .select('*')
      .eq('stage_id', firstStage.id)
      .maybeSingle()

    return {
      deal: { ...newDeal, crm_stages: firstStage },
      stage: firstStage,
      stageAiSettings: settings,
      autoCreated: true,
    }
  } catch (err) {
    console.error('❌ autoCreateDeal error:', err)
    return null
  }
}

// ──────────────────────────────────────────────
// HELPER: Pre-evaluate stage objective completion
// ──────────────────────────────────────────────
async function evaluateObjectiveCompletion(params: {
  deal: any;
  stage: any;
  stageAiSettings: any;
  userId: string;
  chatwootConversationId: number;
  brokerageId: number | null;
}): Promise<{ completed: boolean; previousStageId: string | null; previousStageName: string | null; newStageId: string | null; newStageName: string | null }> {
  const result = { completed: false, previousStageId: null as string | null, previousStageName: null as string | null, newStageId: null as string | null, newStageName: null as string | null }

  const objective = params.stageAiSettings?.ai_objective
  if (!objective || !LOVABLE_API_KEY) return result

  // Fetch last messages from Chatwoot
  let recentMessages = ''
  try {
    if (params.brokerageId) {
      const { data: brokerage } = await supabase
        .from('brokerages')
        .select('chatwoot_url, chatwoot_token, chatwoot_account_id')
        .eq('id', params.brokerageId)
        .maybeSingle()

      if (brokerage?.chatwoot_url && brokerage?.chatwoot_token && brokerage?.chatwoot_account_id) {
        const cwUrl = brokerage.chatwoot_url.replace(/\/+$/, '')
        const messagesResp = await fetch(
          `${cwUrl}/api/v1/accounts/${brokerage.chatwoot_account_id}/conversations/${params.chatwootConversationId}/messages`,
          { headers: { api_access_token: brokerage.chatwoot_token } }
        )
        if (messagesResp.ok) {
          const messagesData = await messagesResp.json()
          const msgs = (messagesData.payload || []).slice(-6)
          recentMessages = msgs.map((m: any) => `${m.message_type === 0 ? 'Cliente' : 'Agente'}: ${m.content || '[mídia]'}`).join('\n')
        }
      }
    }
  } catch (err) {
    console.error('⚠️ Failed to fetch Chatwoot messages for evaluation:', err)
  }

  if (!recentMessages) return result

  // Quick AI evaluation
  try {
    const evalResp = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um avaliador. Responda APENAS "SIM" ou "NAO", sem explicações.' },
          { role: 'user', content: `Dado o objetivo da etapa: "${objective}"\n\nHistórico recente:\n${recentMessages}\n\nO objetivo foi atingido?` }
        ],
        max_tokens: 5,
        temperature: 0,
      })
    })

    if (evalResp.ok) {
      const evalData = await evalResp.json()
      const answer = (evalData.choices?.[0]?.message?.content || '').trim().toUpperCase()
      console.log(`🎯 Objective evaluation: "${answer}" for deal ${params.deal.id}`)

      if (answer === 'SIM') {
        result.completed = true
        result.previousStageId = params.stage.id
        result.previousStageName = params.stage.name

        // Determine target stage
        let targetStageId: string | null = null

        // Check completion action first
        if (params.stageAiSettings?.ai_completion_action) {
          try {
            const action = typeof params.stageAiSettings.ai_completion_action === 'string'
              ? JSON.parse(params.stageAiSettings.ai_completion_action)
              : params.stageAiSettings.ai_completion_action
            if (action.type === 'move_stage' && action.target_stage_id) {
              targetStageId = action.target_stage_id
            }
          } catch { /* ignore */ }
        }

        // Fallback: next stage by position
        if (!targetStageId && params.stage.pipeline_id) {
          const { data: nextStage } = await supabase
            .from('crm_stages')
            .select('id, name')
            .eq('pipeline_id', params.stage.pipeline_id)
            .gt('position', params.stage.position)
            .order('position', { ascending: true })
            .limit(1)
            .maybeSingle()
          if (nextStage) targetStageId = nextStage.id
        }

        if (targetStageId) {
          // Move the deal
          const { error: moveError } = await supabase
            .from('crm_deals')
            .update({ stage_id: targetStageId, last_sync_source: 'dispatcher' })
            .eq('id', params.deal.id)

          if (!moveError) {
            const { data: newStageData } = await supabase
              .from('crm_stages')
              .select('id, name')
              .eq('id', targetStageId)
              .maybeSingle()

            result.newStageId = targetStageId
            result.newStageName = newStageData?.name || null
            console.log(`🚀 Deal ${params.deal.id} moved from "${params.stage.name}" to "${result.newStageName}"`)

            // Log event
            await supabase.from('crm_deal_events').insert({
              deal_id: params.deal.id,
              event_type: 'stage_change',
              old_value: params.stage.name,
              new_value: result.newStageName,
              source: 'dispatcher_auto',
              created_by: params.userId,
            }).catch(() => {})
          } else {
            console.error('❌ Failed to move deal:', moveError)
            result.completed = false
          }
        }
      }
    }
  } catch (err) {
    console.error('⚠️ Objective evaluation error:', err)
  }

  return result
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ──────────────────────────────────────────────
// HELPER: Resolve user from assignee email or inbox
// ──────────────────────────────────────────────
async function resolveUser(assigneeEmail: string | null, inboxId: number | null) {
  const result = { userId: null as string | null, brokerageId: null as number | null, role: null as string | null, aiEnabled: true }

  if (assigneeEmail) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, brokerage_id, role, ai_enabled')
      .eq('email', assigneeEmail)
      .maybeSingle()

    if (profile) {
      result.userId = profile.id
      result.brokerageId = profile.brokerage_id
      result.role = profile.role
      result.aiEnabled = profile.ai_enabled ?? true
      return result
    }
  }

  if (inboxId) {
    const { data: mapping } = await supabase
      .from('chatwoot_inbox_agents')
      .select('user_id, brokerage_id')
      .eq('inbox_id', inboxId)
      .limit(1)
      .maybeSingle()

    if (mapping?.user_id) {
      result.userId = mapping.user_id
      result.brokerageId = mapping.brokerage_id

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, ai_enabled')
        .eq('id', mapping.user_id)
        .maybeSingle()

      if (profile) {
        result.role = profile.role
        result.aiEnabled = profile.ai_enabled ?? true
      }
    }
  }

  return result
}

// ──────────────────────────────────────────────
// HELPER: Process attachments (audio → transcription, image/doc → OCR)
// ──────────────────────────────────────────────
async function processAttachments(attachments: any[] | undefined) {
  const result = {
    messageType: 'text' as string,
    transcription: null as string | null,
    extractedText: null as string | null,
    attachmentUrls: [] as string[],
  }

  if (!attachments || attachments.length === 0 || !LOVABLE_API_KEY) return result

  for (const att of attachments) {
    const url = att.data_url || att.url
    if (!url) continue
    result.attachmentUrls.push(url)

    const contentType = (att.content_type || att.file_type || '').toLowerCase()

    try {
      if (contentType.startsWith('audio/')) {
        result.messageType = 'audio'
        const audioResp = await fetch(url)
        if (!audioResp.ok) continue
        const audioBuffer = await audioResp.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

        const aiResp = await fetch(AI_GATEWAY_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Transcreva o áudio a seguir em português brasileiro. Retorne APENAS a transcrição, sem comentários.' },
              { role: 'user', content: [
                { type: 'text', text: 'Transcreva este áudio:' },
                { type: 'input_audio', input_audio: { data: base64, format: contentType.includes('ogg') ? 'ogg' : 'mp3' } }
              ]}
            ]
          })
        })

        if (aiResp.ok) {
          const aiData = await aiResp.json()
          result.transcription = aiData.choices?.[0]?.message?.content || null
          console.log('🎙️ Transcription done:', result.transcription?.substring(0, 80))
        }

      } else if (contentType.startsWith('image/') || contentType === 'application/pdf') {
        result.messageType = contentType.startsWith('image/') ? 'image' : 'document'

        const aiResp = await fetch(AI_GATEWAY_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Extraia TODO o texto visível desta imagem/documento. Retorne o texto extraído de forma organizada, sem comentários adicionais.' },
              { role: 'user', content: [
                { type: 'text', text: 'Extraia o texto deste documento:' },
                { type: 'image_url', image_url: { url } }
              ]}
            ]
          })
        })

        if (aiResp.ok) {
          const aiData = await aiResp.json()
          result.extractedText = aiData.choices?.[0]?.message?.content || null
          console.log('📄 OCR done:', result.extractedText?.substring(0, 80))
        }
      }
    } catch (err) {
      console.error(`⚠️ Error processing attachment (${contentType}):`, err)
    }
  }

  return result
}

// ──────────────────────────────────────────────
// HELPER: Fetch knowledge context (RAG) for admin mode
// ──────────────────────────────────────────────
async function fetchKnowledgeContext(query: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_text: query,
      match_count: 5,
    })
    if (error || !data || data.length === 0) return null
    return data.map((d: any) => d.content).join('\n---\n')
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────
// HELPER: Build system prompt based on role and context
// ──────────────────────────────────────────────
async function buildSystemPrompt(params: {
  role: string | null,
  userId: string | null,
  clientId: string | null,
  deal: any,
  stage: any,
  stageAiSettings: any,
  messageContent: string,
  transcription: string | null,
  extractedText: string | null,
}) {
  const { role, userId, clientId, deal, stage, stageAiSettings, messageContent, transcription, extractedText } = params

  let systemPrompt = ''
  let knowledgeContext: string | null = null
  let agentName = 'Assistente'
  let companyName = 'a corretora'
  let voiceTone = 'profissional e amigável'
  let aiIsActive = true
  let stageAiIsActive = false
  let nextStageId: string | null = null
  let nextStageName: string | null = null
  let allowedTools: string[] = []

  // Fetch global config
  if (userId) {
    const { data: globalConfig } = await supabase
      .from('crm_ai_global_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (globalConfig) {
      agentName = globalConfig.agent_name || agentName
      companyName = globalConfig.company_name || companyName
      voiceTone = globalConfig.voice_tone || voiceTone
    }

    const globalBaseInstructions = globalConfig?.base_instructions || null

    const { data: aiConfig } = await supabase
      .from('crm_ai_config')
      .select('is_active')
      .eq('user_id', userId)
      .maybeSingle()

    if (aiConfig) aiIsActive = aiConfig.is_active ?? true
  }

  // ── ADMIN MODE ──
  if (role === 'admin') {
    const queryForRag = transcription || extractedText || messageContent
    knowledgeContext = await fetchKnowledgeContext(queryForRag)

    systemPrompt += `<identity>\nVocê é o Assistente Tork, agente interno da corretora ${companyName}.\nTom: ${voiceTone}\n</identity>\n\n`
    systemPrompt += `<capabilities>\n- Analisar documentos de apólices via OCR\n- Consultar a base de conhecimento (normas SUSEP, produtos, coberturas)\n- Gerar textos profissionais para enviar a clientes\n- Comparar coberturas entre seguradoras\n- Responder perguntas técnicas sobre seguros\n</capabilities>\n\n`

    if (transcription) systemPrompt += `<transcription>\n${transcription}\n</transcription>\n\n`
    if (extractedText) systemPrompt += `<extracted_document>\n${extractedText}\n</extracted_document>\n\n`
    if (knowledgeContext) systemPrompt += `<knowledge_base>\n${knowledgeContext}\n</knowledge_base>\n\n`

    allowedTools = ['search_contact', 'create_contact', 'create_deal', 'update_deal_stage', 'list_pipelines_and_stages']

    return { systemPrompt, knowledgeContext, agentName, companyName, voiceTone, aiIsActive: true, stageAiIsActive: false, nextStageId, nextStageName, allowedTools }
  }

  // ── SALES MODE ──
  if (!aiIsActive) {
    return { systemPrompt: '', knowledgeContext: null, agentName, companyName, voiceTone, aiIsActive: false, stageAiIsActive: false, nextStageId, nextStageName, allowedTools }
  }

  systemPrompt += `<identity>\nVocê é ${agentName}, da ${companyName}.\nTom: ${voiceTone}\n</identity>\n\n`

  if (transcription) systemPrompt += `<transcription>\nO cliente enviou um áudio. Transcrição:\n${transcription}\n</transcription>\n\n`
  if (extractedText) systemPrompt += `<extracted_document>\nO cliente enviou um documento. Conteúdo extraído:\n${extractedText}\n</extracted_document>\n\n`

  systemPrompt += `<tools_manual>\n`
  systemPrompt += `1. search_contact: SEMPRE use antes de criar um contato para evitar duplicados.\n`
  systemPrompt += `2. create_contact: Use se search_contact não retornar nada. Peça nome e telefone.\n`
  systemPrompt += `3. list_pipelines_and_stages: Use para conhecer os funis disponíveis antes de criar um negócio.\n`
  systemPrompt += `4. create_deal: Use para abrir uma oportunidade. Requer client_id e stage_id.\n`
  systemPrompt += `5. update_deal_stage: Use para mover o cliente no funil ao atingir o objetivo.\n`
  systemPrompt += `</tools_manual>\n\n`

  if (!deal) {
    // No deal — generic mode, infer context
    const basePerson = globalBaseInstructions || stageAiSettings?.ai_persona || 'Você é um assistente de vendas útil e amigável.'
    systemPrompt += `<persona>\n${basePerson}\n</persona>\n\n`
    systemPrompt += `<objective>\n`
    systemPrompt += `CLIENTE NOVO: Não há negociação aberta para este contato.\n`
    systemPrompt += `Sua missão:\n`
    systemPrompt += `1. Conversar naturalmente, sem perguntar diretamente "o que você precisa?"\n`
    systemPrompt += `2. Identificar nas entrelinhas: qual produto o cliente busca, urgência, perfil\n`
    systemPrompt += `3. Ao identificar o contexto, use list_pipelines_and_stages para ver funis disponíveis\n`
    systemPrompt += `4. Crie o deal com create_deal no funil/etapa mais adequados\n`
    systemPrompt += `5. A partir daí, siga o objetivo da etapa automaticamente\n`
    systemPrompt += `</objective>\n\n`

    allowedTools = ['search_contact', 'create_contact', 'create_deal', 'list_pipelines_and_stages', 'update_deal_stage']
  } else {
    // Has deal — stage-specific mode
    stageAiIsActive = stageAiSettings?.is_active ?? false

    if (stageAiSettings?.ai_persona) {
      systemPrompt += `<persona>\n${stageAiSettings.ai_persona}\n</persona>\n\n`
    }

    systemPrompt += `<current_context>\n`
    systemPrompt += `NEGÓCIO ATUAL: "${deal.title}"\n`
    systemPrompt += `ETAPA ATUAL: "${stage?.name}"\n`
    if (stageAiSettings?.ai_objective) systemPrompt += `OBJETIVO: ${stageAiSettings.ai_objective}\n`
    systemPrompt += `</current_context>\n\n`

    if (stageAiSettings?.ai_custom_rules) {
      systemPrompt += `<custom_rules>\n${stageAiSettings.ai_custom_rules}\n</custom_rules>\n\n`
    }

    // Resolve next stage for auto-progression
    if (stage?.pipeline_id && stage?.position !== undefined) {
      const { data: nextStage } = await supabase
        .from('crm_stages')
        .select('id, name')
        .eq('pipeline_id', stage.pipeline_id)
        .gt('position', stage.position)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (nextStage) {
        nextStageId = nextStage.id
        nextStageName = nextStage.name

        systemPrompt += `<auto_progression>\n`
        systemPrompt += `Ao concluir o objetivo desta etapa com sucesso, use update_deal_stage para avançar:\n`
        systemPrompt += `- deal_id: "${deal.id}"\n`
        systemPrompt += `- new_stage_id: "${nextStageId}"\n`
        systemPrompt += `Próxima etapa: "${nextStageName}"\n`
        systemPrompt += `</auto_progression>\n\n`
      } else {
        systemPrompt += `<auto_progression>\n`
        systemPrompt += `Esta é a ÚLTIMA etapa do funil. Não há próxima etapa automática.\n`
        systemPrompt += `Ao concluir o objetivo, informe que um membro da equipe dará continuidade.\n`
        systemPrompt += `</auto_progression>\n\n`
      }

      // Also handle completion action from stage settings
      if (stageAiSettings?.ai_completion_action) {
        try {
          const action = typeof stageAiSettings.ai_completion_action === 'string'
            ? JSON.parse(stageAiSettings.ai_completion_action)
            : stageAiSettings.ai_completion_action

          if (action.type === 'move_stage' && action.target_stage_id) {
            nextStageId = action.target_stage_id
          }
        } catch { /* ignore parse errors */ }
      }
    }

    allowedTools = ['search_contact', 'create_contact', 'create_deal', 'update_deal_stage', 'list_pipelines_and_stages']
  }

  return { systemPrompt, knowledgeContext, agentName, companyName, voiceTone, aiIsActive, stageAiIsActive, nextStageId, nextStageName, allowedTools }
}

// ──────────────────────────────────────────────
// MAIN HANDLER
// ──────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const body = await req.json()
    console.log('📥 Dispatcher v2 — Event:', body.event)

    // 1. Validate event
    if (body.event !== 'message_created' || body.message_type !== 'incoming') {
      return new Response(JSON.stringify({ message: 'Ignored event' }), { headers: { 'Content-Type': 'application/json' } })
    }

    const { conversation, sender, content, attachments } = body
    const assigneeEmail = conversation?.meta?.assignee?.email
    const inboxId = conversation?.inbox_id

    // 2. Resolve user
    let { userId, brokerageId, role, aiEnabled } = await resolveUser(assigneeEmail, inboxId)

    if (!aiEnabled) {
      console.log('🚫 AI disabled for user:', userId)
      return new Response(JSON.stringify({ message: 'AI disabled for this user' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // 2.5 — Auto-detect producer or brokerage owner as admin by phone
    const senderPhone = sender?.phone_number?.replace(/\D/g, '')
    if (senderPhone && role !== 'admin') {
      const { data: producer } = await supabase
        .from('producers')
        .select('id, brokerage_id')
        .ilike('phone', `%${senderPhone}%`)
        .maybeSingle()

      if (producer) {
        role = 'admin'
        if (!brokerageId) brokerageId = producer.brokerage_id
        console.log('👑 Sender is a producer → admin mode')
      } else {
        const { data: brokerage } = await supabase
          .from('brokerages')
          .select('id, user_id')
          .ilike('phone', `%${senderPhone}%`)
          .maybeSingle()

        if (brokerage) {
          role = 'admin'
          if (!brokerageId) brokerageId = brokerage.id
          if (!userId) userId = brokerage.user_id
          console.log('👑 Sender is a brokerage owner → admin mode')
        }
      }
    }

    // 3. Analysis session logic (batch mode — kept from v1)
    const isAdmin = role === 'admin'
    if (userId && brokerageId) {
      const messageContent = (content || '').toLowerCase().trim()

      if (messageContent.includes('analisar')) {
        const { data: activeSession } = await supabase
          .from('ai_analysis_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'compiling')
          .maybeSingle()

        if (!activeSession) {
          console.log('🚀 Creating analysis session for user', userId)
          await supabase.from('ai_analysis_sessions').insert({
            user_id: userId, brokerage_id: brokerageId,
            chatwoot_conversation_id: conversation.id,
            status: 'compiling', collected_data: [body],
          })
          return new Response(JSON.stringify({ message: 'Modo de análise iniciado. Envie arquivos e digite "processar" para finalizar.' }), { headers: { 'Content-Type': 'application/json' } })
        }
      }

      const { data: activeSession } = await supabase
        .from('ai_analysis_sessions')
        .select('id, collected_data')
        .eq('user_id', userId)
        .eq('status', 'compiling')
        .maybeSingle()

      if (activeSession) {
        const collectedData = activeSession.collected_data as any[] || []
        collectedData.push(body)
        const messageContent2 = (content || '').toLowerCase().trim()

        if (messageContent2.includes('processar')) {
          await supabase.from('ai_analysis_sessions').update({ status: 'ready_for_processing', collected_data: collectedData }).eq('id', activeSession.id)
          supabase.functions.invoke('process-analysis-session', { body: { session_id: activeSession.id } }).catch(console.error)
          return new Response(JSON.stringify({ message: 'Análise iniciada. Você será notificado quando terminar.' }), { headers: { 'Content-Type': 'application/json' } })
        } else {
          await supabase.from('ai_analysis_sessions').update({ collected_data: collectedData, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }).eq('id', activeSession.id)
          return new Response(JSON.stringify({ message: 'Dados recebidos. Envie "processar" quando terminar.' }), { headers: { 'Content-Type': 'application/json' } })
        }
      }
    }

    // 4. Process attachments (audio/image/doc)
    const mediaResult = await processAttachments(attachments)
    console.log(`📎 Media: type=${mediaResult.messageType}, urls=${mediaResult.attachmentUrls.length}`)

    // 5. Resolve client & deal context
    let clientId: string | null = null
    let clientData: { id: string; name: string | null; ai_enabled: boolean | null } | null = null
    let currentDeal: any = null
    let currentStage: any = null
    let stageAiSettings: any = null

    const contactPhone = sender?.phone_number
    const contactEmail = sender?.email

    if (contactPhone || contactEmail) {
      let clientQuery = supabase.from('clientes').select('id, name, ai_enabled')
      if (contactPhone) clientQuery = clientQuery.ilike('phone', `%${contactPhone.replace(/\D/g, '')}%`)
      else if (contactEmail) clientQuery = clientQuery.eq('email', contactEmail)

      const { data: fetchedClient } = await clientQuery.maybeSingle()
      clientData = fetchedClient
      clientId = clientData?.id || null

      // Guard: ai_enabled do cliente
      const clientAiEnabled = clientData?.ai_enabled ?? true
      if (!clientAiEnabled && role !== 'admin') {
        console.log('🚫 AI disabled for client:', clientId)
        return new Response(JSON.stringify({ message: 'IA desativada para este cliente, aguardando atendimento humano' }), { headers: { 'Content-Type': 'application/json' } })
      }

      if (clientId) {
        const { data: deals } = await supabase
          .from('crm_deals')
          .select('id, title, stage_id, crm_stages(id, name, pipeline_id, position)')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (deals && deals.length > 0) {
          currentDeal = deals[0]
          currentStage = currentDeal.crm_stages
          console.log(`✅ Deal: ${currentDeal.title} → Stage: ${currentStage?.name}`)

          if (currentStage?.id) {
            const { data: settings } = await supabase
              .from('crm_ai_settings')
              .select('*')
              .eq('stage_id', currentStage.id)
              .maybeSingle()
            stageAiSettings = settings
          }
        } else if (userId && role !== 'admin') {
          // Auto-create deal for leads without negotiation
          const autoResult = await autoCreateDeal(userId, clientId, clientData?.name || sender?.name || null)
          if (autoResult) {
            currentDeal = autoResult.deal
            currentStage = autoResult.stage
            stageAiSettings = autoResult.stageAiSettings
            autoCreatedDeal = true
          }
        }
      }
    }

    // 5b. Build client context summary for injection in system prompt
    const clientContextForPrompt = clientId
      ? `## CONTEXTO DO CLIENTE (pré-carregado — NÃO pergunte dados que já estão aqui)\nNome cadastrado: ${clientData?.name || sender?.name || 'desconhecido'}\nTelefone: ${contactPhone || 'desconhecido'}\nID interno: ${clientId}\n${currentDeal ? `Última negociação: "${currentDeal.title}" (etapa: ${currentStage?.name})` : 'Nenhuma negociação aberta registrada.'}\n`
      : `## CLIENTE NÃO CADASTRADO\nNome (do Chatwoot): ${sender?.name || 'desconhecido'}\nTelefone: ${contactPhone || 'desconhecido'}\nPRECISA CRIAR CADASTRO com create_contact antes de abrir atendimento.\n`

    // 6. Build system prompt
    const promptResult = await buildSystemPrompt({
      role, userId, clientId,
      deal: currentDeal, stage: currentStage, stageAiSettings,
      messageContent: content || '',
      transcription: mediaResult.transcription,
      extractedText: mediaResult.extractedText,
    })

    // Inject client context at the start of the system prompt
    const finalSystemPrompt = clientContextForPrompt
      ? `${clientContextForPrompt}\n---\n\n${promptResult.systemPrompt}`
      : promptResult.systemPrompt

    if (!promptResult.aiIsActive && role !== 'admin') {
      console.log('🚫 AI inactive for this user config')
      return new Response(JSON.stringify({ message: 'AI inactive' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // 7. Resolve n8n webhook URL
    let finalN8nUrl = N8N_WEBHOOK_URL
    if (userId) {
      const { data: crmSettings } = await supabase.from('crm_settings').select('n8n_webhook_url').eq('user_id', userId).maybeSingle()
      if (crmSettings?.n8n_webhook_url) finalN8nUrl = crmSettings.n8n_webhook_url.trim()
    }

    // 8. Build enriched payload and send to n8n
    if (finalN8nUrl) {
      const payload = {
        ...body,
        derived_data: {
          crm_user_id: userId,
          brokerage_id: brokerageId,
          user_role: role,
          ai_enabled: aiEnabled,
          client_id: clientId,
          deal_id: currentDeal?.id || null,
          deal_title: currentDeal?.title || null,
          pipeline_id: currentStage?.pipeline_id || null,
          stage_id: currentStage?.id || null,
          stage_name: currentStage?.name || null,
          next_stage_id: promptResult.nextStageId,
          next_stage_name: promptResult.nextStageName,
          ai_is_active: promptResult.aiIsActive,
          stage_ai_is_active: promptResult.stageAiIsActive,
          is_active: stageAiSettings?.is_active ?? true,
          ai_system_prompt: finalSystemPrompt,
          agent_name: promptResult.agentName,
          company_name: promptResult.companyName,
          voice_tone: promptResult.voiceTone,
          message_type: mediaResult.messageType,
          original_content: content || null,
          transcription: mediaResult.transcription,
          extracted_text: mediaResult.extractedText,
          attachment_urls: mediaResult.attachmentUrls,
          allowed_tools: promptResult.allowedTools,
          knowledge_context: promptResult.knowledgeContext,
        }
      }

      console.log('🚀 Forwarding to n8n...', { role, messageType: mediaResult.messageType, hasDeal: !!currentDeal, hasTranscription: !!mediaResult.transcription, hasOCR: !!mediaResult.extractedText })

      const n8nResponse = await fetch(finalN8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      console.log(`n8n Response: ${n8nResponse.status}`)
    } else {
      console.warn('⚠️ No N8N_WEBHOOK_URL configured')
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('❌ Dispatcher error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
