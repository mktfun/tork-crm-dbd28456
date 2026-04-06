import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export async function dispatchToN8n(
  supabase: SupabaseClient,
  params: {
    body: any,
    userId: string | null,
    brokerageId: number | null,
    role: string | null,
    senderRole: string | null,
    aiEnabled: boolean,
    clientId: string | null,
    currentDeal: any,
    currentStage: any,
    promptResult: any,
    stageAiSettings: any,
    finalSystemPrompt: string,
    mediaResult: any,
    content: string | null,
    autoCreatedDeal: boolean,
    autoCreatedProductId: string | null,
    autoCreatedProductName: string | null,
    objectiveResult: any,
    N8N_WEBHOOK_URL: string | undefined
  }
) {
  const {
    body, userId, brokerageId, role, senderRole, aiEnabled, clientId, currentDeal, currentStage,
    promptResult, stageAiSettings, finalSystemPrompt, mediaResult, content,
    autoCreatedDeal, autoCreatedProductId, autoCreatedProductName, objectiveResult,
    N8N_WEBHOOK_URL
  } = params

  let finalN8nUrl = N8N_WEBHOOK_URL
  if (userId) {
    const { data: crmSettings } = await supabase.from('crm_settings').select('n8n_webhook_url').eq('user_id', userId).maybeSingle()
    if (crmSettings?.n8n_webhook_url) finalN8nUrl = crmSettings.n8n_webhook_url.trim()
  }

  if (!finalN8nUrl) {
    console.warn('⚠️ No N8N_WEBHOOK_URL configured')
    return null
  }

  const payload = {
    ...body,
    derived_data: {
      crm_user_id: userId,
      brokerage_id: brokerageId,
      user_role: role,
      sender_role: senderRole,
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
      contact_phone: body?.sender?.phone_number || null,
      contact_name: body?.sender?.name || null,
      contact_email: body?.sender?.email || null,
      conversation_id: body?.conversation?.id || null,
      auto_created_deal: autoCreatedDeal,
      auto_created_product_id: autoCreatedProductId,
      auto_created_product_name: autoCreatedProductName,
      stage_completed: objectiveResult.completed,
      previous_stage_id: objectiveResult.previousStageId,
      previous_stage_name: objectiveResult.previousStageName,
    }
  }

  console.log('🚀 Forwarding to n8n...', { role, messageType: mediaResult.messageType, hasDeal: !!currentDeal, hasTranscription: !!mediaResult.transcription, hasOCR: !!mediaResult.extractedText })

  try {
    const n8nResponse = await fetch(finalN8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    console.log(`n8n Response: ${n8nResponse.status}`)

    let n8nResponseBody: any = null
    if (n8nResponse.ok) {
      try { n8nResponseBody = await n8nResponse.json() } catch { /* non-JSON response, ignore */ }
    }

    return n8nResponseBody
  } catch (err) {
    console.error('❌ Failed to send to n8n:', err)
    return null
  }
}
