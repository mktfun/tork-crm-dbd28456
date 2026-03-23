import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export async function resolveContext(
  supabase: SupabaseClient,
  body: any
) {
  const { conversation, sender } = body
  const assigneeEmail = conversation?.meta?.assignee?.email
  const inboxId = conversation?.inbox_id

  let userId: string | null = null
  let brokerageId: number | null = null
  let role: string | null = null
  let aiEnabled = true

  // 1. Resolve user from assignee email
  if (assigneeEmail) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, brokerage_id, role, ai_enabled')
      .eq('email', assigneeEmail)
      .maybeSingle()

    if (profile) {
      userId = profile.id
      brokerageId = profile.brokerage_id
      role = profile.role
      aiEnabled = profile.ai_enabled ?? true
    }
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
        role = profile.role
        aiEnabled = profile.ai_enabled ?? true
      }
    }
  }

  // 3. Auto-detect producer or brokerage owner as admin by phone
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

  // 4. Resolve client
  let clientId: string | null = null
  let clientData: { id: string; name: string | null; ai_enabled: boolean | null } | null = null
  const contactPhone = sender?.phone_number
  const contactEmail = sender?.email

  if (contactPhone || contactEmail) {
    let clientQuery = supabase.from('clientes').select('id, name, ai_enabled')
    if (contactPhone) clientQuery = clientQuery.ilike('phone', `%${contactPhone.replace(/\D/g, '')}%`)
    else if (contactEmail) clientQuery = clientQuery.eq('email', contactEmail)

    const { data: fetchedClient } = await clientQuery.maybeSingle()
    clientData = fetchedClient
    clientId = clientData?.id || null

    // Auto-register new client from Chatwoot contact
    if (!clientId && userId && role !== 'admin') {
      const newClientName = sender?.name || 'Contato Chatwoot'
      const newPhone = contactPhone ? contactPhone.replace(/\D/g, '') : ''
      const newEmail = contactEmail || ''

      const { data: newClient, error: clientErr } = await supabase
        .from("clientes")
        .upsert({
          user_id: userId,
          name: newClientName,
          phone: newPhone,
          email: newEmail,
          chatwoot_contact_id: sender?.id || null,
          observations: "Cadastrado automaticamente via Chatwoot",
        }, { onConflict: "phone" })
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

  const clientAiEnabled = clientData?.ai_enabled ?? true

  return {
    userId,
    brokerageId,
    role,
    aiEnabled,
    clientId,
    clientData,
    clientAiEnabled,
    contactPhone,
    contactEmail
  }
}
