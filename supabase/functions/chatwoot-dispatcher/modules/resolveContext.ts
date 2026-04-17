import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

// Normaliza e fornece duas variações de cruzamento: com e sem o 9º dígito móvel.
// Retorna array para cruzamento resiliente.
const getPhoneVariations = (phoneStr: string) => {
  const digits = (phoneStr || '').replace(/\D/g, '').replace(/^55/, '')
  const variations = [digits]
  
  if (digits.length === 11 && digits[2] === '9') {
    variations.push(digits.slice(0, 2) + digits.slice(3)) // Remove o '9'
  } else if (digits.length === 10) {
    variations.push(digits.slice(0, 2) + '9' + digits.slice(2)) // Adiciona o '9'
  }
  
  return variations
}

export async function resolveContext(
  supabase: SupabaseClient,
  body: any
) {
  const { conversation, sender } = body
  const assigneeEmail = conversation?.meta?.assignee?.email
  const inboxId = conversation?.inbox_id

  let userId: string | null = null
  let brokerageId: number | null = null
  let crmUserRole: string | null = null
  let senderRole: string | null = null
  let aiEnabled = true

  // Verificação de Labels do Chatwoot (AI OFF toggle bidirecional)
  const labels = conversation?.labels || []
  const hasOffLabel = labels.some((l: string) => l.toLowerCase() === 'off' || l.toLowerCase() === 'bot-off' || l.toLowerCase() === 'ai-off')
  if (hasOffLabel) {
    console.log('🔇 Chatwoot label "off" detected. AI processing aborted at context level.')
    aiEnabled = false
  }

  // 1. Resolve user from assignee email
  if (assigneeEmail) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, ai_enabled')
      .eq('email', assigneeEmail)
      .maybeSingle()

    if (profile) {
      userId = profile.id
      crmUserRole = profile.role
      aiEnabled = profile.ai_enabled ?? true
    }
  }

  if (userId && !brokerageId) {
    const { data: brok } = await supabase
      .from('brokerages')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (brok) brokerageId = brok.id
  }

  // 2. Fallback to inbox mapping
  if (!userId && inboxId) {
    const { data: mapping } = await supabase
      .from('chatwoot_inbox_agents')
      .select('user_id, brokerage_id')
      .eq('inbox_id', inboxId)
      .limit(1)
      .maybeSingle()

    if (mapping?.user_id) {
      userId = mapping.user_id
      brokerageId = mapping.brokerage_id

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, ai_enabled')
        .eq('id', mapping.user_id)
        .maybeSingle()

      if (profile) {
        crmUserRole = profile.role
        aiEnabled = profile.ai_enabled ?? true
      }
    }
  }

  // 2.5. Fallback to account mapping se não houver inbox_id mapeado
  if (!brokerageId && (body.account?.id || conversation?.account_id)) {
    const accountId = body.account?.id || conversation?.account_id
    const { data: brokAccount } = await supabase
      .from('brokerages')
      .select('id, user_id')
      .eq('chatwoot_account_id', accountId)
      .maybeSingle()

    if (brokAccount) {
      brokerageId = brokAccount.id
      if (!userId) {
        userId = brokAccount.user_id
        const { data: profile } = await supabase.from('profiles').select('role, ai_enabled').eq('id', userId).maybeSingle()
        if (profile) {
          crmUserRole = profile.role
          aiEnabled = profile.ai_enabled ?? true
        }
      }
    }
  }

  // 3. Auto-detect producer or brokerage owner as admin by phone
  const senderPhoneTrimmed = sender?.phone_number?.replace(/\D/g, '') || ''
  // Normalize: remove country code 55 prefix (Chatwoot sends +5511... but DB stores 11...)
  const normalizedPhone = senderPhoneTrimmed.startsWith('55') ? senderPhoneTrimmed.slice(2) : senderPhoneTrimmed
  
  if (normalizedPhone.length >= 10 && senderRole !== 'admin') {
    const senderVariations = getPhoneVariations(normalizedPhone)

    
    // NUNCA promover para admin se não soubermos a qual brokerage a conversa pertence
    if (brokerageId) {
      const { data: producers } = await supabase
        .from('producers')
        .select('id, brokerage_id, phone')
        .eq('brokerage_id', brokerageId)
        .not('phone', 'is', null)

      const matchedProducer = producers?.find((p: any) => {
        const pVariations = getPhoneVariations(p.phone)
        return senderVariations.some(sv => pVariations.includes(sv))
      })

      if (matchedProducer) {
        senderRole = 'admin'
        console.log('👑 Sender is a producer → admin mode')
      } else {
        const { data: brokerages } = await supabase
          .from('brokerages')
          .select('id, user_id, phone')
          .eq('id', brokerageId)
          .not('phone', 'is', null)

        const matchedBrokerage = brokerages?.find((b: any) => {
          const bVariations = getPhoneVariations(b.phone)
          return senderVariations.some(sv => bVariations.includes(sv))
        })

        if (matchedBrokerage) {
          senderRole = 'admin'
          if (!userId) userId = matchedBrokerage.user_id
          console.log('👑 Sender is a brokerage owner → admin mode')
        }
      }
    }
  }

  // 4. Resolve client
  let clientId: string | null = null
  let clientData: { id: string; name: string | null; ai_enabled: boolean | null } | null = null
  const contactPhone = sender?.phone_number
  const contactEmail = sender?.email

  if (contactPhone || contactEmail) {
    let fetchedClient: any = null
    
    if (contactPhone) {
      const normalizedContactPhone = contactPhone.startsWith('55') ? contactPhone.slice(2) : contactPhone
      const senderVariations = getPhoneVariations(normalizedContactPhone)
      
      let clientQuery = supabase.from('clientes').select('id, name, ai_enabled, phone').not('phone', 'is', null)
      if (userId) clientQuery = clientQuery.eq('user_id', userId)
      
      const { data: allClients } = await clientQuery
      
      fetchedClient = allClients?.find((c: any) => {
        const cVariations = getPhoneVariations(c.phone)
        return senderVariations.some(sv => cVariations.includes(sv))
      })
    }
    
    if (!fetchedClient && contactEmail) {
      let emailQuery = supabase.from('clientes').select('id, name, ai_enabled').eq('email', contactEmail)
      if (userId) emailQuery = emailQuery.eq('user_id', userId)
      const { data: clientByEmail } = await emailQuery.limit(1).maybeSingle()
      fetchedClient = clientByEmail
    }

    clientData = fetchedClient
    clientId = clientData?.id || null

    if (clientId) {
      console.log(`👤 Client found: ${clientData?.name} (${clientId})`)
    } else {
      console.log(`⚠️ No client found for phone=${contactPhone}, email=${contactEmail}`)
    }

    // Auto-register new client from Chatwoot contact
    if (!clientId && userId && senderRole !== 'admin') {
      const newClientName = sender?.name || 'Contato Chatwoot'
      const newPhone = contactPhone ? contactPhone.replace(/\D/g, '') : ''
      const newEmail = contactEmail || ''

      // Antes do insert, tentar por chatwoot_contact_id
      if (sender?.id) {
        const { data: cwClient } = await supabase
          .from('clientes')
          .select('id, name, ai_enabled')
          .eq('chatwoot_contact_id', sender.id)
          .maybeSingle()
        if (cwClient) {
          clientData = cwClient
          clientId = cwClient.id
        }
      }

      if (!clientId) {
        const { data: newClient, error: clientErr } = await supabase
          .from("clientes")
          .insert({
            user_id: userId,
            name: newClientName,
            phone: newPhone,
            email: newEmail,
            chatwoot_contact_id: sender?.id || null,
            observations: "Cadastrado automaticamente via Chatwoot",
          })
          .select("id, name, ai_enabled")
          .single()

        if (newClient && !clientErr) {
          clientData = newClient
          clientId = newClient.id
          console.log(`✅ Auto-registered client: "${newClientName}" (${clientId})`)
        } else {
          console.warn('⚠️ Failed to auto-register client:', clientErr?.message)
        }
      }
    }
  }

  const clientAiEnabled = clientData?.ai_enabled ?? true

  return {
    userId,
    brokerageId,
    role: crmUserRole,
    senderRole,
    aiEnabled,
    clientId,
    clientData,
    clientAiEnabled,
    contactPhone,
    contactEmail
  }
}
