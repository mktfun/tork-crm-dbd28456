import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export async function classifyLeadWithAI(
  resolvedAI: any,
  messageContent: string,
  pipelines: Array<{ id: string; name: string; stages: Array<{ id: string; name: string; position: number }> }>,
  products: Array<{ id: string; name: string }>,
): Promise<{ pipeline_id: string; stage_id: string; product_id: string | null } | null> {
  if (!resolvedAI.auth || !messageContent) return null

  try {
    const pipelinesText = pipelines.map(p => {
      const stagesList = p.stages.map(s => `${s.name} (id: ${s.id})`).join(', ')
      return `- Pipeline "${p.name}" (id: ${p.id}): etapas [${stagesList}]`
    }).join('\n')

    const productsText = products.length > 0
      ? products.map(p => `- "${p.name}" (id: ${p.id})`).join('\n')
      : '- Nenhum produto cadastrado'

    const prompt = `Analise o histórico da conversa abaixo e identifique se o cliente já informou qual produto ou serviço ele deseja.

Histórico da Conversa:
"""
${messageContent}
"""

Funis disponíveis:
${pipelinesText}

Produtos disponíveis:
${productsText}

Regras rigorosas:
1. Se o cliente APENAS saudar (ex: "bom dia", "olá") ou pedir uma cotação genérica SEM especificar o tipo de seguro/produto, retorne a palavra null.
2. Se o cliente ESPECIFICAR o tipo de seguro ou produto (ex: "seguro residencial", "seguro auto", "seguro fiança", "plano de saúde"), retorne um JSON com os IDs correspondentes.
3. Se o produto específico não estiver na lista de Produtos disponíveis, retorne o JSON com o pipeline_id correto, stage_id correto e product_id como null.
4. O JSON deve ter o formato exato: {"pipeline_id":"...","stage_id":"...","product_id":"..."} (product_id pode ser null).
5. Use a primeira etapa (menor posição) do funil escolhido como stage_id.
6. Responda APENAS com o JSON válido ou a palavra null. Não inclua markdown (\`\`\`json) nem explicações.`

    const response = await fetch(resolvedAI.url, {
      method: 'POST',
      headers: {
        'Authorization': resolvedAI.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolvedAI.model,
        messages: [
          { role: 'system', content: 'Você é um classificador de leads para uma corretora de seguros. Responda apenas com JSON válido ou null, sem markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      console.error('❌ AI classification failed:', await response.text())
      return null
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || ''

    if (content === 'null' || !content) return null

    const parsed = JSON.parse(content)
    if (parsed.pipeline_id && parsed.stage_id) {
      return {
        pipeline_id: parsed.pipeline_id,
        stage_id: parsed.stage_id,
        product_id: parsed.product_id || null,
      }
    }
    return null
  } catch (err) {
    console.error('❌ Error in classifyLeadWithAI:', err)
    return null
  }
}

export async function autoCreateDeal(
  supabase: SupabaseClient,
  resolvedAI: any,
  userId: string,
  clientId: string,
  clientName: string | null,
  messageContent: string,
  transcription: string | null,
  extractedText: string | null,
  brokerageId: number | null,
  chatwootConversationId: number | null,
): Promise<{
  deal: any; stage: any; stageAiSettings: any; autoCreated: boolean; productId: string | null; productName: string | null;
} | null> {
  try {
    const { data: allPipelines } = await supabase
      .from('crm_pipelines')
      .select('id, name, is_default, position')
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (!allPipelines || allPipelines.length === 0) {
      console.log('⚠️ No pipelines found for user:', userId)
      return null
    }

    const pipelineIds = allPipelines.map(p => p.id)
    const { data: allStages } = await supabase
      .from('crm_stages')
      .select('id, name, pipeline_id, position')
      .in('pipeline_id', pipelineIds)
      .order('position', { ascending: true })

    if (!allStages || allStages.length === 0) {
      console.log('⚠️ No stages found for any pipeline')
      return null
    }

    const { data: activeProducts } = await supabase
      .from('crm_products')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true)

    const pipelinesWithStages = allPipelines.map(p => ({
      ...p,
      stages: (allStages || []).filter(s => s.pipeline_id === p.id).sort((a, b) => a.position - b.position),
    }))

    let fullContext = [messageContent, transcription, extractedText].filter(Boolean).join('\n')

    if (brokerageId && chatwootConversationId) {
      try {
        const { data: brokerage } = await supabase
          .from('brokerages')
          .select('chatwoot_url, chatwoot_token, chatwoot_account_id')
          .eq('id', brokerageId)
          .maybeSingle()

        if (brokerage?.chatwoot_url && brokerage?.chatwoot_token && brokerage?.chatwoot_account_id) {
          const cwUrl = brokerage.chatwoot_url.replace(/\/+$/, '')
          const messagesResp = await fetch(
            `${cwUrl}/api/v1/accounts/${brokerage.chatwoot_account_id}/conversations/${chatwootConversationId}/messages`,
            { headers: { api_access_token: brokerage.chatwoot_token } }
          )
          if (messagesResp.ok) {
            const messagesData = await messagesResp.json()
            const msgs = (messagesData.payload || []).slice(-10)
            const conversationHistory = msgs.map((m: any) => `${m.message_type === 0 ? 'Cliente' : 'Agente'}: ${m.content || '[mídia]'}`).join('\n')
            if (conversationHistory) {
              fullContext = conversationHistory
              console.log(`📜 Classification using ${msgs.length} conversation messages`)
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Failed to fetch conversation history for classification:', err)
      }
    }

    let targetStageId: string
    let targetPipelineId: string
    let productId: string | null = null
    let productName: string | null = null

    const aiResult = await classifyLeadWithAI(resolvedAI, fullContext, pipelinesWithStages, activeProducts || [])

    if (aiResult) {
      targetPipelineId = aiResult.pipeline_id
      targetStageId = aiResult.stage_id
      productId = aiResult.product_id
      productName = (activeProducts || []).find(p => p.id === aiResult.product_id)?.name || null
    } else {
      console.log('⚠️ AI could not classify lead, skipping auto-create deal')
      return null
    }

    const targetStage = allStages.find(s => s.id === targetStageId)!

    const dealTitle = clientName ? `Atendimento - ${clientName}` : 'Novo Atendimento'
    const { data: newDeal, error: dealError } = await supabase
      .from('crm_deals')
      .insert({
        user_id: userId,
        client_id: clientId,
        stage_id: targetStageId,
        product_id: productId,
        chatwoot_conversation_id: chatwootConversationId,
        title: dealTitle,
        position: 0,
        last_sync_source: 'chatwoot',
      })
      .select('id, title, stage_id, product_id')
      .single()

    if (dealError) {
      if (dealError.code === '23505' && chatwootConversationId) {
        console.log('🔄 Deal already exists for conversation, reusing...')
        const { data: existingDeal } = await supabase
          .from('crm_deals')
          .select('id, title, stage_id, product_id, crm_stages(id, name, pipeline_id, position)')
          .eq('chatwoot_conversation_id', chatwootConversationId)
          .limit(1)
          .maybeSingle()

        if (existingDeal) {
          const { data: settings } = await supabase
            .from('crm_ai_settings')
            .select('*')
            .eq('stage_id', existingDeal.stage_id)
            .maybeSingle()

          return {
            deal: existingDeal,
            stage: existingDeal.crm_stages,
            stageAiSettings: settings,
            autoCreated: false,
            productId: existingDeal.product_id,
            productName: null,
          }
        }
      }
      console.error('❌ Failed to auto-create deal:', dealError)
      return null
    }

    console.log(`✅ Auto-created deal "${newDeal.title}" in stage "${targetStage.name}"${productName ? ` with product "${productName}"` : ''}`)

    const targetPipeline = allPipelines.find(p => p.id === targetStage.pipeline_id)
    const eventDetails = [
      'Criado automaticamente pela IA',
      productName ? `Produto: ${productName}` : null,
      targetPipeline ? `Funil: ${targetPipeline.name}` : null,
      `Etapa: ${targetStage.name}`,
    ].filter(Boolean).join(' | ')

    await supabase.from('crm_deal_events').insert({
      deal_id: newDeal.id,
      event_type: 'creation',
      new_value: eventDetails,
      source: 'ai_automation',
      created_by: null,
    })

    if (chatwootConversationId && brokerageId) {
      try {
        const { data: stageData } = await supabase
          .from('crm_stages')
          .select('chatwoot_label')
          .eq('id', targetStageId)
          .single()

        if (stageData?.chatwoot_label) {
          const { data: brokerage } = await supabase
            .from('brokerages')
            .select('chatwoot_url, chatwoot_token, chatwoot_account_id')
            .eq('id', brokerageId)
            .single()

          if (brokerage?.chatwoot_url && brokerage?.chatwoot_token && brokerage?.chatwoot_account_id) {
            const labelUrl = `${brokerage.chatwoot_url}/api/v1/accounts/${brokerage.chatwoot_account_id}/conversations/${chatwootConversationId}/labels`
            const labelResp = await fetch(labelUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json', api_access_token: brokerage.chatwoot_token },
            })
            const currentLabels = labelResp.ok ? ((await labelResp.json())?.payload || []) : []
            const newLabels = [...new Set([...currentLabels, stageData.chatwoot_label])]

            await fetch(labelUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', api_access_token: brokerage.chatwoot_token },
              body: JSON.stringify({ labels: newLabels }),
            })
            console.log('🏷️ Applied label to conversation:', stageData.chatwoot_label)
          }
        }
      } catch (labelErr) {
        console.warn('⚠️ Failed to apply label:', labelErr)
      }
    }

    const { data: settings } = await supabase
      .from('crm_ai_settings')
      .select('*')
      .eq('stage_id', targetStageId)
      .maybeSingle()

    return {
      deal: { ...newDeal, crm_stages: targetStage },
      stage: targetStage,
      stageAiSettings: settings,
      autoCreated: true,
      productId,
      productName,
    }
  } catch (err) {
    console.error('❌ autoCreateDeal error:', err)
    return null
  }
}

export async function resolveDeal(
  supabase: SupabaseClient,
  resolvedAI: any,
  userId: string,
  clientId: string | null,
  clientData: any,
  sender: any,
  content: string,
  mediaResult: any,
  brokerageId: number | null,
  conversation: any,
  role: string
) {
  let currentDeal = null
  let currentStage = null
  let stageAiSettings = null
  let autoCreatedDeal = false
  let autoCreatedProductId = null
  let autoCreatedProductName = null
  let clientJustResponded = false

  if (role !== 'admin') {
    const { data: deals } = await supabase
      .from('crm_deals')
      .select('id, title, stage_id, product_id, crm_stages(id, name, pipeline_id, position)')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (deals && deals.length > 0) {
      currentDeal = deals[0]
      currentStage = Array.isArray(currentDeal.crm_stages) 
        ? currentDeal.crm_stages[0] 
        : currentDeal.crm_stages
      console.log(`💼 Found open deal: ${currentDeal.title} (Stage: ${currentStage?.name})`)

      if (sender?.type === 'contact') {
        clientJustResponded = true
        const { error: fuError } = await supabase
          .from('ai_follow_ups')
          .update({ status: 'cancelled' })
          .eq('deal_id', currentDeal.id)
          .eq('status', 'pending')

        if (fuError) console.warn('⚠️ Failed to cancel follow-ups:', fuError)
        else console.log('🛑 Cancelled pending follow-ups for deal:', currentDeal.id)
      }
    } else if (conversation?.id) {
      const { data: cwDeals } = await supabase
        .from('crm_deals')
        .select('id, title, stage_id, product_id, crm_stages(id, name, pipeline_id, position)')
        .eq('chatwoot_conversation_id', conversation.id)
        .limit(1)

      if (cwDeals && cwDeals.length > 0) {
        currentDeal = cwDeals[0]
        currentStage = Array.isArray(currentDeal.crm_stages) 
          ? currentDeal.crm_stages[0] 
          : currentDeal.crm_stages
        console.log(`💼 Found deal by conversation ID: ${currentDeal.title}`)
      }
    }

    if (!currentDeal && sender?.type === 'contact' && clientId) {
      console.log('🤖 No open deal found. Attempting AI classification for auto-create...')
      const autoCreateResult = await autoCreateDeal(
        supabase,
        resolvedAI,
        userId,
        clientId,
        clientData?.name || sender?.name || null,
        content,
        mediaResult.transcription,
        mediaResult.extractedText,
        brokerageId,
        conversation?.id || null
      )

      if (autoCreateResult) {
        currentDeal = autoCreateResult.deal
        currentStage = autoCreateResult.stage
        stageAiSettings = autoCreateResult.stageAiSettings
        autoCreatedDeal = autoCreateResult.autoCreated
        autoCreatedProductId = autoCreateResult.productId
        autoCreatedProductName = autoCreateResult.productName
      }
    } else if (!currentDeal) {
      console.log(`⚠️ Skipped autoCreateDeal: sender.type=${sender?.type}, clientId=${clientId}`)
    }

    if (currentDeal && !stageAiSettings) {
      const { data: settings } = await supabase
        .from('crm_ai_settings')
        .select('*')
        .eq('stage_id', currentDeal.stage_id)
        .maybeSingle()
      stageAiSettings = settings
    }
  }

  return {
    currentDeal,
    currentStage,
    stageAiSettings,
    autoCreatedDeal,
    autoCreatedProductId,
    autoCreatedProductName,
    clientJustResponded
  }
}
