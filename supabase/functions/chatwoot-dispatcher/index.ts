import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { resolveUserModel } from '../_shared/model-resolver.ts'

import { resolveContext } from './modules/resolveContext.ts'
import { resolveDeal } from './modules/resolveDeal.ts'
import { evaluateObjectiveCompletion } from './modules/evaluateStageCompletion.ts'
import { buildSystemPrompt } from './modules/buildPrompt.ts'
import { dispatchToN8n } from './modules/dispatchToN8n.ts'
import { manageFollowups } from './modules/manageFollowups.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Dynamic AI config — resolved per-request after userId is known
let resolvedAI = {
  url: AI_GATEWAY_URL,
  auth: `Bearer ${LOVABLE_API_KEY || ''}`,
  model: 'google/gemini-2.5-flash-lite',
}

function initAIConfig(resolved: { model: string; apiKey: string | null; provider: string | null }) {
  if (resolved.apiKey && resolved.provider === 'gemini') {
    resolvedAI = {
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      auth: `Bearer ${resolved.apiKey}`,
      model: resolved.model.replace('google/', ''),
    }
  } else if (resolved.apiKey && resolved.provider === 'openai') {
    resolvedAI = {
      url: 'https://api.openai.com/v1/chat/completions',
      auth: `Bearer ${resolved.apiKey}`,
      model: resolved.model.replace('openai/', ''),
    }
  } else if (LOVABLE_API_KEY) {
    resolvedAI = {
      url: AI_GATEWAY_URL,
      auth: `Bearer ${LOVABLE_API_KEY}`,
      model: resolved.model || 'google/gemini-2.5-flash-lite',
    }
  }
  console.log(`🔑 AI Config resolved: provider=${resolved.provider}, model=${resolvedAI.model}`)
}

async function processAttachments(attachments: any[] | undefined) {
  const result = { messageType: 'text', transcription: null as string | null, extractedText: null as string | null, attachmentUrls: [] as string[] }
  if (!attachments || attachments.length === 0) return result

  for (const att of attachments) {
    if (!att.data_url) continue
    result.attachmentUrls.push(att.data_url)

    const isAudio = att.file_type?.startsWith('audio/') || att.data_url.match(/\.(ogg|mp3|wav|m4a)$/i)
    const isImage = att.file_type?.startsWith('image/') || att.data_url.match(/\.(jpg|jpeg|png|webp)$/i)
    const isPdf = att.file_type === 'application/pdf' || att.data_url.match(/\.pdf$/i)

    if (isAudio) {
      result.messageType = 'audio'
      try {
        const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: { audioUrl: att.data_url } })
        if (!error && data?.text) result.transcription = data.text
      } catch (err) { console.error('⚠️ Audio transcription failed:', err) }
    } else if (isImage || isPdf) {
      result.messageType = isImage ? 'image' : 'document'
      try {
        const { data, error } = await supabase.functions.invoke('extract-document', { body: { fileUrl: att.data_url, fileType: att.file_type } })
        if (!error && data?.text) result.extractedText = data.text
      } catch (err) { console.error('⚠️ Document extraction failed:', err) }
    }
  }
  return result
}

async function processWebhook(body: any) {
  try {
    const { conversation, sender, content, attachments } = body

    // 1. Resolve Context (User, Brokerage, Client, Role, Flags)
    const context = await resolveContext(supabase, body)
    const { userId, brokerageId, role, aiEnabled, clientId, clientData, clientAiEnabled, contactPhone, contactEmail } = context

    if (!aiEnabled) {
      console.log('🚫 AI disabled for user:', userId)
      return
    }

    if (!clientAiEnabled && role !== 'admin') {
      console.log('🚫 AI disabled for client:', clientId)
      return
    }

    // 2. Resolve AI config from user's global settings
    if (userId) {
      const resolved = await resolveUserModel(supabase, userId)
      initAIConfig(resolved)
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
          return
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
          return
        } else {
          await supabase.from('ai_analysis_sessions').update({ collected_data: collectedData, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }).eq('id', activeSession.id)
          return
        }
      }
    }

    // 4. Process attachments (audio/image/doc)
    const mediaResult = await processAttachments(attachments)
    console.log(`📎 Media: type=${mediaResult.messageType}, urls=${mediaResult.attachmentUrls.length}`)

    // 5. Resolve Deal
    let {
      currentDeal, currentStage, stageAiSettings, autoCreatedDeal,
      autoCreatedProductId, autoCreatedProductName, clientJustResponded
    } = await resolveDeal(
      supabase, resolvedAI, userId!, clientId, clientData, sender,
      content || '', mediaResult, brokerageId, conversation, role
    )

    // 6. Pre-evaluate objective completion (only for existing deals with objectives, not auto-created)
    let objectiveResult = { completed: false, previousStageId: null as string | null, previousStageName: null as string | null, newStageId: null as string | null, newStageName: null as string | null }
    if (currentDeal && !autoCreatedDeal && stageAiSettings?.ai_objective && userId && role !== 'admin') {
      objectiveResult = await evaluateObjectiveCompletion(supabase, resolvedAI, {
        deal: currentDeal,
        stage: currentStage,
        stageAiSettings,
        userId,
        chatwootConversationId: conversation.id,
        brokerageId,
      })

      // If stage was completed, update references for payload
      if (objectiveResult.completed && objectiveResult.newStageId) {
        const { data: newStageData } = await supabase
          .from('crm_stages')
          .select('id, name, pipeline_id, position')
          .eq('id', objectiveResult.newStageId)
          .maybeSingle()

        if (newStageData) {
          currentStage = newStageData
          currentDeal = { ...currentDeal, stage_id: newStageData.id }

          const { data: newSettings } = await supabase
            .from('crm_ai_settings')
            .select('*')
            .eq('stage_id', newStageData.id)
            .maybeSingle()
          stageAiSettings = newSettings
        }
      }
    }

    // 7. Build client context summary for injection in system prompt
    const clientContextForPrompt = clientId
      ? `## CONTEXTO DO CLIENTE (pré-carregado — NÃO pergunte dados que já estão aqui)\nNome cadastrado: ${clientData?.name || sender?.name || 'desconhecido'}\nTelefone: ${contactPhone || 'desconhecido'}\nID interno: ${clientId}\n${currentDeal ? `Última negociação: "${currentDeal.title}" (etapa: ${currentStage?.name})` : 'Nenhuma negociação aberta registrada.'}\n`
      : `## NOVO CONTATO\nNome (do Chatwoot): ${sender?.name || 'desconhecido'}\nTelefone: ${contactPhone || 'desconhecido'}\nEste contato ainda não possui cadastro. O sistema cuidará automaticamente do cadastro e roteamento.\n`

    // 8. Build system prompt
    const promptResult = await buildSystemPrompt(supabase, {
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
      return
    }

    // 9. Dispatch to n8n
    const n8nResponseBody = await dispatchToN8n(supabase, {
      body, userId, brokerageId, role, aiEnabled, clientId, currentDeal, currentStage,
      promptResult, stageAiSettings, finalSystemPrompt, mediaResult, content,
      autoCreatedDeal, autoCreatedProductId, autoCreatedProductName, objectiveResult,
      N8N_WEBHOOK_URL
    })

    // 10. Manage Followups
    await manageFollowups(supabase, {
      currentDeal, userId, role, clientJustResponded, stageAiSettings, n8nResponseBody, conversation, brokerageId
    })

    console.log('✅ Dispatcher processing complete')
  } catch (error) {
    console.error('❌ Background processing error:', error)
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    console.log('📥 Dispatcher v2 — Event:', body.event)

    // Quick validation — ignore non-incoming messages
    if (body.event !== 'message_created' || body.message_type !== 'incoming') {
      return new Response(JSON.stringify({ message: 'Ignored event' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Fire-and-forget: process in background
    const processing = processWebhook(body)

    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processing)
    }

    // Return 200 immediately to Chatwoot
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('❌ Dispatcher error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
