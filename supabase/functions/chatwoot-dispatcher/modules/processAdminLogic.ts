import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { processAttachments } from '../../_shared/process-attachments.ts'
import { sendChatwootMessage } from '../../_shared/chatwoot.ts'

export async function processAdminLogic(
  supabase: SupabaseClient,
  body: any,
  userId: string,
  brokerageId: number,
  SUPABASE_URL: string,
  SUPABASE_SERVICE_ROLE_KEY: string
) {
  const { conversation, sender, content, attachments } = body
  console.log('👑 Admin detected, processing locally...')
  
  const cleanContent = (content || '').trim()
  const lowerContent = cleanContent.toLowerCase()
  const phone = sender?.phone_number || 'unknown'

  // 1. Process attachments (audio/image/doc)
  const mediaResult = await processAttachments(supabase, attachments || [], userId, SUPABASE_URL)

  // 2. Parsers for commands
  if (lowerContent === '/help') {
    await sendChatwootMessage(supabase, brokerageId, conversation.id, 
      `🤖 *Comandos disponíveis:*\n\n` +
      `📥 /analise — Inicia modo de análise batch. Envie múltiplos docs, áudios e mensagens. Tudo será acumulado.\n\n` +
      `▶️ /start — Processa todos os itens acumulados no modo análise.\n\n` +
      `🔄 /reset — Limpa o histórico de conversa com o assistente.\n` +
      `💬 Qualquer outra mensagem será respondida normalmente pelo Assistente Tork nativo.`
    )
    return
  }
  
  if (lowerContent === '/reset') {
    await supabase.from('admin_chat_history').delete().eq('user_id', userId).eq('phone_number', phone)
    await supabase.from('ai_analysis_sessions').update({ status: 'cancelled' }).eq('user_id', userId).eq('status', 'compiling')
    await sendChatwootMessage(supabase, brokerageId, conversation.id, `🔄 Memória local apagada para este número e sessões canceladas.`)
    return
  }

  // ─── Batch Session Accumulation ───
  const { data: activeSession } = await supabase
    .from('ai_analysis_sessions')
    .select('id, collected_data')
    .eq('user_id', userId)
    .eq('status', 'compiling')
    .maybeSingle()

  if (activeSession) {
    if (lowerContent === '/start') {
      const collectedData = (activeSession.collected_data as any[]) || []
      
      await sendChatwootMessage(supabase, brokerageId, conversation.id, '🔄 Processando análise... Aguarde.')

      let allContent = ''
      for (const entry of collectedData) {
        if (entry.content) allContent += `[Msg]: ${entry.content}\n\n`
        if (entry._processed_transcriptions) allContent += entry._processed_transcriptions.map((t: string) => `[Áudio]: ${t}`).join('\n\n') + '\n\n'
        if (entry._processed_extracted_texts) allContent += entry._processed_extracted_texts.map((t: string) => `[Documento Extraído]:\n${t}`).join('\n\n') + '\n\n'
      }

      await supabase.from('ai_analysis_sessions').update({ status: 'completed' }).eq('id', activeSession.id)

      await sendChatwootMessage(supabase, brokerageId, conversation.id, `🧠 Iniciando Cérebro Consultivo (lote)...\nAnálise pode levar até 2 minutos para processar os ${collectedData.length} itens.`)

      // Invoke the normal ai-assistant, but passing the massive content
      await executeAIAssistant(supabase, userId, phone, brokerageId, conversation.id, 
        `Analise os seguintes documentos e informações acumuladas em batch:\n\n${allContent || 'Nenhum dado válido'}`,
        SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
      )
      return
    }

    const collectedData = (activeSession.collected_data as any[]) || []
    const entry: any = { content: cleanContent, timestamp: new Date().toISOString() }
    
    if (mediaResult.transcriptions.length > 0 || mediaResult.extractedTexts.length > 0) {
      entry._processed_transcriptions = mediaResult.transcriptions
      entry._processed_extracted_texts = mediaResult.extractedTexts
    }
    
    collectedData.push(entry)
    await supabase.from('ai_analysis_sessions').update({ collected_data: collectedData }).eq('id', activeSession.id)
    
    await sendChatwootMessage(supabase, brokerageId, conversation.id, `📎 Recebido (${collectedData.length} itens acumulados). Continue enviando ou digite /start.`)
    return
  }

  if (lowerContent === '/analise') {
    await supabase.from('ai_analysis_sessions').insert({
      user_id: userId,
      brokerage_id: brokerageId,
      chatwoot_conversation_id: conversation.id || 0,
      status: 'compiling',
      collected_data: [],
      expires_at: new Date(Date.now() + 120000).toISOString(),
    })
    await sendChatwootMessage(supabase, brokerageId, conversation.id, '📥 Modo análise ativado.\n\nEnvie documentos, áudios e mensagens. Tudo será acumulado para análise conjunta.\n\nDigite /start para processar.')
    return
  }

  // ─── Normal Message Flow ───
  let userMsgContent = cleanContent
  if (mediaResult.extractedTexts.length > 0 || mediaResult.transcriptions.length > 0) {
    userMsgContent = `${cleanContent}\n\n`
    if (mediaResult.transcriptions.length > 0) {
      userMsgContent += `[Áudio transcrito pelo usuário]:\n${mediaResult.transcriptions.join('\n')}\n\n`
    }
    if (mediaResult.extractedTexts.length > 0) {
      userMsgContent += `[Documento anexado pelo usuário]:\n${mediaResult.extractedTexts.join('\n')}\n\n`
    }
  }

  await executeAIAssistant(supabase, userId, phone, brokerageId, conversation.id, userMsgContent.trim(), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

// ─── Execute standard ai-assistant with chat history ───
async function executeAIAssistant(
  supabase: SupabaseClient, 
  userId: string, 
  phone: string, 
  brokerageId: number, 
  conversationId: number, 
  finalContent: string,
  SUPABASE_URL: string,
  SUPABASE_SERVICE_ROLE_KEY: string
) {
  if (!finalContent) return

  // Load history
  const { data: historyData } = await supabase
    .from('admin_chat_history')
    .select('role, content')
    .eq('user_id', userId)
    .eq('phone_number', phone)
    .order('created_at', { ascending: false })
    .limit(10)
    
  const history = (historyData || []).reverse().map(row => ({ role: row.role, content: row.content }))
  
  const whatsappFormatInstruction = `\n\n[INSTRUÇÕES CRÍTICAS DE FORMATAÇÃO WHATSAPP]:\n1. É ESTRITAMENTE PROIBIDO usar tabelas Markdown (| Coluna | Valor |). O WhatsApp não as renderiza corretamente. Use APENAS listas simples (com hífens, marcadores e emojis).\n2. É PROIBIDO usar títulos com hashtags (Ex: ### Título). Use Formatação WhatsApp: *Negrito* ou _Itálico_ para destacar seções.\n3. Escreva parágrafos muito curtos e dinâmicos para facilitar a leitura na tela do celular.`
  
  history.push({ role: 'user', content: finalContent + whatsappFormatInstruction })
  
  // Save user msg to history (sem as instruções para não sujar o histórico futuro)
  await supabase.from('admin_chat_history').insert({
    user_id: userId,
    phone_number: phone,
    role: 'user',
    content: finalContent
  })

  try {
    const aiResp = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        conversationId,
        stream: false,
        messages: history
      })
    })

    if (!aiResp.ok) {
      const errTxt = await aiResp.text()
      console.error('❌ ai-assistant failed:', errTxt)
      await sendChatwootMessage(supabase, brokerageId, conversationId, `🤖 Desculpe, ocorreu um erro ao consultar o cérebro AI:\nHTTP ${aiResp.status}`)
      return
    }

    const data = await aiResp.json()
    let answer = data.message || "Sem resposta válida da IA."

    // Limpa a tag <thinking> da resposta para não aparecer no WhatsApp do usuário
    answer = answer.replace(/<thinking>[\s\S]*?<\/thinking>\n?/gi, '').trim()

    // Save assistant response
    await supabase.from('admin_chat_history').insert({
      user_id: userId,
      phone_number: phone,
      role: 'assistant',
      content: answer
    })

    // Send back to WhatsApp
    await sendChatwootMessage(supabase, brokerageId, conversationId, answer)

  } catch (err) {
    console.error('❌ Error executing standalone AI for admin:', err)
    await sendChatwootMessage(supabase, brokerageId, conversationId, `❌ Erro crítico enviando mensagem para a IA.`)
  }
}
