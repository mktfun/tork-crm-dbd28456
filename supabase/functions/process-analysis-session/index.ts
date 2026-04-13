import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Process attachments from raw collected webhook bodies
async function processRawAttachments(attachments: any[]) {
  const result = { transcriptions: [] as string[], extractedTexts: [] as string[] }
  if (!attachments || attachments.length === 0) return result

  for (const att of attachments) {
    if (!att.data_url) continue
    const isAudio = att.file_type?.startsWith('audio/') || att.data_url.match(/\.(ogg|mp3|wav|m4a)$/i)
    const isImage = att.file_type?.startsWith('image/') || att.data_url.match(/\.(jpg|jpeg|png|webp)$/i)
    const isPdf = att.file_type === 'application/pdf' || att.data_url.match(/\.pdf$/i)

    if (isAudio) {
      try {
        const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: { audioUrl: att.data_url } })
        if (!error && data?.text) result.transcriptions.push(data.text)
      } catch (err) { console.error('⚠️ Transcription failed:', err) }
    } else if (isImage || isPdf) {
      try {
        const { data, error } = await supabase.functions.invoke('extract-document', { body: { fileUrl: att.data_url, fileType: att.file_type } })
        if (!error && data?.text) result.extractedTexts.push(data.text)
      } catch (err) { console.error('⚠️ OCR failed:', err) }
    }
  }
  return result
}

Deno.serve(async (req) => {
  let sessionId = null
  try {
    const body = await req.json()
    sessionId = body.session_id
    if (!sessionId) throw new Error("Missing session_id")

    console.log(`🧠 Processing analysis session: ${sessionId}`)

    // 1. Fetch and mark as processing
    const { data: session, error: sessionError } = await supabase
      .from('ai_analysis_sessions')
      .update({ status: 'processing' })
      .eq('id', sessionId)
      .select()
      .single()

    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const collectedData = (session.collected_data as any[]) || []

    // 2. Process all entries — extract media from raw webhook bodies
    let allTexts: string[] = []
    let allTranscriptions: string[] = []
    let allExtractedTexts: string[] = []
    let clientData: any = {}

    for (const entry of collectedData) {
      // Already processed entries (from admin-dispatcher accumulation)
      if (entry._processed_transcriptions) {
        allTranscriptions.push(...entry._processed_transcriptions)
      }
      if (entry._processed_extracted_texts) {
        allExtractedTexts.push(...entry._processed_extracted_texts)
      }

      // Raw webhook entries (legacy format)
      if (entry.attachments && !entry._processed_transcriptions) {
        const media = await processRawAttachments(entry.attachments)
        allTranscriptions.push(...media.transcriptions)
        allExtractedTexts.push(...media.extractedTexts)
      }

      // Text content
      if (entry.content && typeof entry.content === 'string' && !entry.content.startsWith('/')) {
        allTexts.push(entry.content)
      }

      // Client data from sender
      if (entry.sender) {
        clientData.name = entry.sender.name || clientData.name
        clientData.phone = entry.sender.phone_number || clientData.phone
      }
    }

    // 3. Fetch global config for system prompt
    const { data: globalConfig } = await supabase
      .from('crm_ai_global_config')
      .select('agent_name, company_name, voice_tone, base_instructions')
      .eq('user_id', session.user_id)
      .maybeSingle()

    const agentName = globalConfig?.agent_name || 'Assistente Tork'
    const companyName = globalConfig?.company_name || 'a corretora'

    // 4. Build accumulated content
    let accumulatedContent = ''
    if (allTexts.length > 0) {
      accumulatedContent += `## Mensagens:\n${allTexts.map((t, i) => `[${i + 1}]: ${t}`).join('\n')}\n\n`
    }
    if (allTranscriptions.length > 0) {
      accumulatedContent += `## Transcrições de Áudio:\n${allTranscriptions.map((t, i) => `[Áudio ${i + 1}]:\n${t}`).join('\n\n')}\n\n`
    }
    if (allExtractedTexts.length > 0) {
      accumulatedContent += `## Documentos Extraídos (OCR):\n${allExtractedTexts.map((t, i) => `[Doc ${i + 1}]:\n${t}`).join('\n\n')}\n\n`
    }

    // 5. Build system prompt
    const systemPrompt = `<identity>
Você é o ${agentName}, agente interno da corretora ${companyName}.
</identity>

<context>
Análise batch para: ${clientData.name || 'Admin'} (${clientData.phone || 'N/A'})
${accumulatedContent}
</context>

<instructions>
Com base no conteúdo acumulado acima, gere uma análise completa e integrada.
Cruze informações entre os documentos quando possível.
Identifique oportunidades, riscos, e recomendações acionáveis.

Use as ferramentas disponíveis (rag_search, search_contact, etc.) para enriquecer a análise.
</instructions>

<allowed_tools>search_contact, create_contact, create_deal, update_deal_stage, list_pipelines_and_stages, rag_search</allowed_tools>
`

    // 6. Resolve n8n URL
    let finalN8nUrl = N8N_WEBHOOK_URL
    const { data: crmSettings } = await supabase
      .from('crm_settings')
      .select('n8n_webhook_url')
      .eq('user_id', session.user_id)
      .maybeSingle()
    if (crmSettings?.n8n_webhook_url) finalN8nUrl = crmSettings.n8n_webhook_url.trim()

    // 7. Send to n8n
    if (finalN8nUrl) {
      console.log(`🚀 Sending processed batch to n8n...`)
      const n8nPayload = {
        derived_data: {
          crm_user_id: session.user_id,
          brokerage_id: session.brokerage_id,
          user_role: 'admin',
          ai_enabled: true,
          ai_is_active: true,
          ai_system_prompt: systemPrompt,
          agent_name: agentName,
          company_name: companyName,
          message_type: 'batch_analysis',
          client_data: clientData,
          transcription_count: allTranscriptions.length,
          document_count: allExtractedTexts.length,
          text_count: allTexts.length,
          allowed_tools: ['search_contact', 'create_contact', 'create_deal', 'update_deal_stage', 'list_pipelines_and_stages', 'rag_search'],
        }
      }
      await fetch(finalN8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
      })
    } else {
      console.warn("⚠️ N8N_WEBHOOK_URL not set. Skipping n8n call.")
    }

    // 8. Mark as complete
    await supabase.from('ai_analysis_sessions').update({ status: 'completed' }).eq('id', sessionId)
    console.log(`✅ Session ${sessionId} processed: ${allTexts.length} texts, ${allTranscriptions.length} audios, ${allExtractedTexts.length} docs`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error(`❌ Error processing session ${sessionId}:`, (error as Error).message)
    if (sessionId) {
      await supabase.from('ai_analysis_sessions').update({ status: 'failed' }).eq('id', sessionId)
    }
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
