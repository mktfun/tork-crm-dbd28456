import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { scanAndMaskPII, logSecurityEvent } from './modules/security/dlpMasker.ts'
import { resolveUserModel } from '../_shared/model-resolver.ts'
import { sendChatwootMessage } from '../_shared/chatwoot.ts'

import { resolveContext } from './modules/resolveContext.ts'
import { resolveDeal } from './modules/resolveDeal.ts'
import { evaluateObjectiveCompletion } from './modules/evaluateStageCompletion.ts'
import { buildSystemPrompt } from './modules/buildPrompt.ts'
import { dispatchToN8n } from './modules/dispatchToN8n.ts'
import { manageFollowups } from './modules/manageFollowups.ts'
import { runAgentLoop } from './modules/agentLoop.ts'
import { unmaskPII } from './modules/security/dlpMasker.ts'

import { enqueueMessage, checkDebounce, acquireLock, releaseLock, updateQueueStatus } from './modules/messageQueue.ts'
import { getHistory, saveHistory } from './modules/conversationHistory.ts'
import { getElevenLabsConfig, synthesizeAudio } from './modules/audioSynthesis.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function initAIConfig(resolved: { model: string; apiKey: string | null; provider: string | null }) {
  let resolvedAI = {
    url: AI_GATEWAY_URL,
    auth: `Bearer ${LOVABLE_API_KEY || ''}`,
    model: 'google/gemini-2.5-flash-lite',
  }

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
  return resolvedAI
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
        console.log('🎤 Transcription result:', { hasText: !!data?.text, error: error?.message, chars: data?.text?.length })
        if (!error && data?.text) result.transcription = data.text
      } catch (err) { console.error('⚠️ Audio transcription failed:', err) }
    } else if (isImage || isPdf) {
      result.messageType = isImage ? 'image' : 'document'
      try {
        const { data, error } = await supabase.functions.invoke('extract-document', { body: { fileUrl: att.data_url, fileType: att.file_type } })
        console.log('🔍 OCR result:', { hasText: !!data?.text, error: error?.message, chars: data?.text?.length })
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
    let { userId, brokerageId, role: crmUserRole, senderRole, aiEnabled, clientId, clientData, clientAiEnabled, contactPhone, contactEmail } = context
    const phone = sender?.phone_number || 'unknown'
    const rawCleanContent = (content || '').trim()
    const { maskedText, hasSensitiveData, replacements: dlpReplacements } = scanAndMaskPII(rawCleanContent)
    // Usar o texto mascarado para todo o processamento de LLM
    const cleanContent = maskedText
    const lowerContent = cleanContent.toLowerCase()

    // ── 1.5 Message Queue & Debounce Setup ──
    const messageTypeStr = attachments?.length ? (attachments[0]?.file_type?.startsWith('audio/') ? 'audio' : 'media') : 'text'
    const queueEntry = await enqueueMessage(supabase, {
      brokerageId: context.brokerageId || 0,
      conversationId: conversation.id,
      chatwootMessageId: body.id,
      contactPhone,
      content: rawCleanContent,
      messageType: messageTypeStr
    })

    const queueId = queueEntry.id

    if (hasSensitiveData) {
      await logSecurityEvent(supabase, {
        userId, brokerageId, chatwootConversationId: conversation?.id,
        eventType: 'pii_masked',
        originalTextEncrypted: 'DLP_INTERCEPTED',
        severity: 'high'
      })
      console.log('🚨 DLP Intercepted PII in incoming message!')
    }

    if (!aiEnabled) {
      console.log('🚫 AI disabled for user:', userId)
      await updateQueueStatus(supabase, queueId, 'skipped')
      return
    }

    if (!clientAiEnabled && senderRole !== 'admin') {
      console.log('🚫 AI disabled for client:', clientId)
      await updateQueueStatus(supabase, queueId, 'skipped')
      return
    }

    // ── 1.6 Debounce Check (Encavalamento) ──
    const debounce = await checkDebounce(supabase, conversation.id, queueId, queueEntry.created_at)
    if (!debounce.isLatest) {
      await updateQueueStatus(supabase, queueId, 'skipped', { errorMessage: 'Encavalamento: uma mensagem mais nova existe.' })
      return
    }

    // ── 1.7 Acquire Lock ──
    const lock = await acquireLock(supabase, conversation.id, queueId)
    if (!lock.acquired) {
      console.warn(`🔒 Lock acquisition failed for conv ${conversation.id}. Aborting queue ${queueId}.`)
      await updateQueueStatus(supabase, queueId, 'failed', { errorMessage: 'Lock indisponível' })
      return
    }

    await updateQueueStatus(supabase, queueId, 'processing')

    try {
      // 2. Resolve AI config from user's global settings
    let resolvedAI = {
      url: AI_GATEWAY_URL,
      auth: `Bearer ${LOVABLE_API_KEY || ''}`,
      model: 'google/gemini-2.5-flash-lite',
    }
    if (userId) {
      const resolved = await resolveUserModel(supabase, userId)
      resolvedAI = initAIConfig(resolved)
    }

    // ═══ 2.5 Test Mode Interceptor ═══
    if (senderRole === 'admin' && userId && brokerageId) {
      // Check for existing test session
      const { data: testSession } = await supabase
        .from('admin_test_sessions')
        .select('id, status')
        .eq('user_id', userId)
        .eq('phone', phone)
        .maybeSingle()

      if (lowerContent === '/teste') {
        if (!testSession) {
          // START test mode
          await supabase.from('admin_test_sessions').insert({
            user_id: userId, brokerage_id: brokerageId, phone, status: 'active'
          })
          await sendChatwootMessage(supabase, brokerageId, conversation.id,
            '🧪 *Modo Teste SDR ativado!*\n\nA partir de agora, suas mensagens serão respondidas pelo bot de vendas (SDR) como se você fosse um cliente.\n\nDigite /teste novamente para sair e avaliar o atendimento.')
          return
        } else if (testSession.status === 'active') {
          // END test mode → ask for feedback
          await supabase.from('admin_test_sessions').update({ status: 'feedback_pending' }).eq('id', testSession.id)
          await sendChatwootMessage(supabase, brokerageId, conversation.id,
            '✅ *Teste finalizado!*\n\nO que achou do atendimento do SDR? Onde ele pode melhorar?\n\n_Envie sua avaliação na próxima mensagem._')
          return
        }
      }

      if (testSession?.status === 'feedback_pending') {
        // Capture feedback and save to ai_feedbacks
        await supabase.from('ai_feedbacks').insert({
          brokerage_id: brokerageId, type: 'sdr', feedback_text: cleanContent
        })
        await supabase.from('admin_test_sessions').delete().eq('id', testSession.id)
        await sendChatwootMessage(supabase, brokerageId, conversation.id,
          '🙏 *Obrigado pelo feedback!*\n\nSuas observações serão aplicadas automaticamente nas próximas interações do SDR com seus clientes.')
        return
      }

      if (testSession?.status === 'active') {
        // PASSTHROUGH: admin is in test mode → force client flow
        console.log('🧪 Admin in test mode → routing as client/SDR')
        senderRole = null
        // Fall through to SDR pipeline below...
      }
    }

    // 3. Admin delegation — route directly to ai-assistant without n8n
    if (senderRole === 'admin' && userId && brokerageId) {
      const { processAdminLogic } = await import('./modules/processAdminLogic.ts')
      await processAdminLogic(supabase, body, userId, brokerageId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      return
    }

    // 4. Process attachments (audio/image/doc)
    const mediaResult = await processAttachments(attachments)
    console.log(`📎 Media: type=${mediaResult.messageType}, urls=${mediaResult.attachmentUrls.length}`)

    // 5. Resolve Deal (isIncomingMessage = true since index.ts already filters for incoming)
    const isIncomingMessage = true
    console.log(`🔍 Webhook shape: message_type=${body.message_type}, sender.type=${sender?.type}, clientId=${clientId}, conversation=${conversation?.id}`)

    let {
      currentDeal, currentStage, stageAiSettings, autoCreatedDeal,
      autoCreatedProductId, autoCreatedProductName, clientJustResponded
    } = await resolveDeal(
      supabase, resolvedAI, userId as string, clientId, clientData, sender,
      content || '', mediaResult, brokerageId, conversation, crmUserRole || 'user',
      isIncomingMessage
    )

    // 6. Build client context summary for injection in system prompt
    const clientContextForPrompt = clientId
      ? `## CONTEXTO DO CLIENTE (pré-carregado — NÃO pergunte dados que já estão aqui)\nNome cadastrado: ${clientData?.name || sender?.name || 'desconhecido'}\nTelefone: ${contactPhone || 'desconhecido'}\nID interno: ${clientId}\n${currentDeal ? `Última negociação: "${currentDeal.title}" (etapa: ${currentStage?.name})` : 'Nenhuma negociação aberta registrada.'}\n`
      : `## NOVO CONTATO\nNome (do Chatwoot): ${sender?.name || 'desconhecido'}\nTelefone: ${contactPhone || 'desconhecido'}\nEste contato ainda não possui cadastro. O sistema cuidará automaticamente do cadastro e roteamento.\n`

    // 8. Build system prompt
    const promptResult = await buildSystemPrompt(supabase, {
      role: senderRole, userId, clientId, brokerageId,
      deal: currentDeal, stage: currentStage, stageAiSettings,
      messageContent: content || '',
      transcription: mediaResult.transcription,
      extractedText: mediaResult.extractedText,
    })

    // Inject client context at the start of the system prompt
    const finalSystemPrompt = clientContextForPrompt
      ? `${clientContextForPrompt}\n---\n\n${promptResult.systemPrompt}`
      : promptResult.systemPrompt

    if (!promptResult.aiIsActive && senderRole !== 'admin') {
      console.log('🚫 AI inactive for this user config')
      return
    }

    // 8.5 Load Conversation History (Isolated)
    const history = brokerageId ? await getHistory(supabase, { conversationId: conversation.id, brokerageId, limit: 15 }) : []

    // 9. Run AI Edge Agent Loop locally (Tool Calling & Generation)
    const generatedRawMessage = await runAgentLoop(
      supabase,
      finalSystemPrompt,
      lowerContent, // This is the masked clean prompt
      brokerageId || 0,
      resolvedAI,
      history
    )

    // 10. Unmask PII before sending the message out to the client
    const unmaskedFinalMessage = unmaskPII(generatedRawMessage, dlpReplacements)

    // 10.5 Audio Synthesis
    let audioUrl: string | null = null
    try {
      if (mediaResult.messageType === 'audio' && brokerageId) {
        const elevenConfig = await getElevenLabsConfig(supabase, brokerageId, stageAiSettings?.voice_id)
        audioUrl = await synthesizeAudio(supabase, unmaskedFinalMessage, elevenConfig, brokerageId, conversation.id)
      }
    } catch (audioErr) {
      console.error('Audio generation failed, falling back to text:', audioErr)
    }

    // 10.6 Save Chat History
    if (brokerageId) {
      // Save User Message
      await saveHistory(supabase, {
        conversationId: conversation.id, brokerageId, contactPhone, clientId,
        role: 'user', content: rawCleanContent || '[Media]', messageType: mediaResult.messageType,
        chatwootMessageId: body.id, queueMessageId: queueId
      })
      // Save Assistant Response
      await saveHistory(supabase, {
        conversationId: conversation.id, brokerageId, contactPhone, clientId,
        role: 'assistant', content: unmaskedFinalMessage, messageType: audioUrl ? 'audio' : 'text',
        audioUrl, queueMessageId: queueId
      })
    }

    // 11. Dispatch to n8n (now acting primarily as a router/webhook sender for WhatsApp, or it can read final_ai_message)
    const objectiveResultPlaceholder = { completed: false, previousStageId: null as string | null, previousStageName: null as string | null, newStageId: null as string | null, newStageName: null as string | null }
    const n8nResponseBody = await dispatchToN8n(supabase, {
      body, userId, brokerageId, role: crmUserRole, senderRole, aiEnabled, clientId, currentDeal, currentStage,
      promptResult, stageAiSettings, finalSystemPrompt, mediaResult, content,
      autoCreatedDeal, autoCreatedProductId, autoCreatedProductName, objectiveResult: objectiveResultPlaceholder,
      N8N_WEBHOOK_URL,
      finalAiMessage: unmaskedFinalMessage, // Added final message for direct N8N delivery
      audioUrl: audioUrl, // Audio URL for ElevenLabs
      queueMessageId: queueId // Track dispatcher status
    })

    // 10. Manage Followups
    await manageFollowups(supabase, {
      currentDeal, userId, role: crmUserRole, senderRole, clientJustResponded, stageAiSettings, n8nResponseBody, conversation, brokerageId
    })

    // 11. Post-response: evaluate objective completion and move stage if needed
    if (currentDeal && !autoCreatedDeal && stageAiSettings?.ai_objective && userId && senderRole !== 'admin') {
      const objectiveResult = await evaluateObjectiveCompletion(supabase, resolvedAI, {
        deal: currentDeal,
        stage: currentStage,
        stageAiSettings,
        userId,
        chatwootConversationId: conversation.id,
        brokerageId,
      })
      if (objectiveResult.completed) {
        console.log(`🚀 Post-response stage transition: ${objectiveResult.previousStageName} → ${objectiveResult.newStageName}`)
      }
    }

    await updateQueueStatus(supabase, queueId, 'completed', { audioUrl: audioUrl || undefined })
    console.log('✅ Dispatcher processing complete')

    } finally {
      // ── 12. Relase Lock no matter what ──
      await releaseLock(supabase, conversation.id)
    }

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
