import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

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
    const basePerson = stageAiSettings?.ai_persona || 'Você é um assistente de vendas útil e amigável.'
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
    const { userId, brokerageId, role, aiEnabled } = await resolveUser(assigneeEmail, inboxId)

    if (!aiEnabled) {
      console.log('🚫 AI disabled for user:', userId)
      return new Response(JSON.stringify({ message: 'AI disabled for this user' }), { headers: { 'Content-Type': 'application/json' } })
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
    let currentDeal: any = null
    let currentStage: any = null
    let stageAiSettings: any = null

    const contactPhone = sender?.phone_number
    const contactEmail = sender?.email

    if (contactPhone || contactEmail) {
      let clientQuery = supabase.from('clientes').select('id')
      if (contactPhone) clientQuery = clientQuery.ilike('phone', `%${contactPhone.replace(/\D/g, '')}%`)
      else if (contactEmail) clientQuery = clientQuery.eq('email', contactEmail)

      const { data: clientData } = await clientQuery.maybeSingle()
      clientId = clientData?.id || null

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
        }
      }
    }

    // 6. Build system prompt
    const promptResult = await buildSystemPrompt({
      role, userId, clientId,
      deal: currentDeal, stage: currentStage, stageAiSettings,
      messageContent: content || '',
      transcription: mediaResult.transcription,
      extractedText: mediaResult.extractedText,
    })

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
          ai_system_prompt: promptResult.systemPrompt,
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
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
