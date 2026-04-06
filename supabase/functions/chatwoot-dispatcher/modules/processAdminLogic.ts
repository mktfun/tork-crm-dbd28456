import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { processAttachments } from '../../_shared/process-attachments.ts'
import { sendChatwootMessage } from '../../_shared/chatwoot.ts'
import { formatForWhatsApp } from '../../_shared/whatsapp-formatter.ts'

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

  // 0. Avisa que está baixando anexos pesados para evitar que o usuário perca paciência e digite /start
  if (attachments && attachments.length > 0) {
    await sendChatwootMessage(supabase, brokerageId, conversation.id, `⏳ Recebendo arquivo... Aguarde a leitura (pode levar 15 segundos).`)
  }

  // 1. Process attachments (audio/image/doc)
  const mediaResult = await processAttachments(supabase, attachments || [], userId, SUPABASE_URL)

  // 2. Parsers for commands
  if (lowerContent === '/help') {
    await sendChatwootMessage(supabase, brokerageId, conversation.id, 
      `🤖 *Comandos disponíveis:*\n\n` +
      `📥 /analise — Inicia modo de análise batch. Envie múltiplos docs, áudios e mensagens. Tudo será acumulado.\n\n` +
      `▶️ /start — Processa todos os itens acumulados no modo análise.\n\n` +
      `🔄 /reset — Limpa o histórico de conversa com o assistente.\n\n` +
      `🧪 /teste — Ativa/desativa modo teste SDR (simula ser cliente).\n\n` +
      `📝 /feedback <msg> — Ensina ao Mentor IA como melhorar análises e respostas.\n\n` +
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

  // ─── /feedback <msg> — Diretrizes do Mentor IA ───
  if (lowerContent.startsWith('/feedback ')) {
    const feedbackText = cleanContent.slice('/feedback '.length).trim()
    if (feedbackText.length > 0) {
      await supabase.from('ai_feedbacks').insert({
        brokerage_id: brokerageId, type: 'mentor', feedback_text: feedbackText
      })
      await sendChatwootMessage(supabase, brokerageId, conversation.id,
        `📝 *Feedback registrado!*\n\n_"${feedbackText}"_\n\nO Mentor IA considerará isso nas próximas análises e respostas.`)
    } else {
      await sendChatwootMessage(supabase, brokerageId, conversation.id,
        `⚠️ Use: /feedback <sua observação>\nEx: /feedback Ao analisar apólices, destaque o valor da franquia primeiro.`)
    }
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
    
  const history = (historyData || []).reverse().map((row: any) => ({ role: row.role, content: row.content }))
  const whatsappFormatInstruction = `Você está interagindo com o usuário administrador do sistema através do WhatsApp. Regras de formatação:\n✅ Título: cite de forma direta.\n✅ Listas: use • como marcador.\n✅ Destaque/Aviso: use blockquotes com "> " no começo da linha.\n✅ Negrito: *texto*\n✅ Itálico: _texto_\n⛔ NUNCA use tabelas (| pipes |). Converta em listas.\n⛔ NUNCA use ### ou **.\n⛔ Parágrafos curtos, pule linhas.\nA resposta deve ser perfeita para ler no celular.`
  
  // ─── Mentor RAG: inject owner feedbacks ───
  const { data: mentorFeedbacks } = await supabase
    .from('ai_feedbacks')
    .select('feedback_text')
    .eq('brokerage_id', brokerageId)
    .eq('type', 'mentor')
    .order('created_at', { ascending: false })
    .limit(5)

  let mentorRagBlock = ''
  if (mentorFeedbacks && mentorFeedbacks.length > 0) {
    const items = mentorFeedbacks.map((f: any) => `• ${f.feedback_text}`).join('\n')
    mentorRagBlock = `\n\n[DIRETRIZES DO RESPONSÁVEL — SIGA RIGOROSAMENTE]\n${items}`
  }

  history.unshift({ role: 'system', content: whatsappFormatInstruction + mentorRagBlock })
  history.push({ role: 'user', content: finalContent })
  
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

    // Aplica pipeline determinístico de tradução Markdown -> WhatsApp nativo
    answer = formatForWhatsApp(answer)

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
