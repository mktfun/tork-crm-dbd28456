import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface Message {
  role: 'user' | 'system' | 'assistant' | 'tool'
  content: string
  name?: string
  tool_call_id?: string
  tool_calls?: any[]
}

export async function getHistory(
  supabase: SupabaseClient,
  params: { conversationId: number, brokerageId: number, limit?: number }
): Promise<Message[]> {
  const { conversationId, brokerageId, limit = 15 } = params

  const { data, error } = await supabase
    .from('sdr_chat_history')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .eq('brokerage_id', brokerageId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    console.error('Error fetching chat history:', error)
    return []
  }

  // Database sorts descending (newest first). Reversing returns oldest first, fitting the LLM context linearly.
  return data.reverse() as Message[]
}

export async function saveHistory(
  supabase: SupabaseClient,
  params: {
    conversationId: number
    brokerageId: number
    contactPhone?: string | null
    clientId?: string | null
    role: 'user' | 'assistant'
    content: string
    messageType?: string
    audioUrl?: string | null
    chatwootMessageId?: number | null
    queueMessageId?: string | null
  }
) {
  const {
    conversationId, brokerageId, contactPhone, clientId, role,
    content, messageType, audioUrl, chatwootMessageId, queueMessageId
  } = params

  const { error } = await supabase
    .from('sdr_chat_history')
    .insert({
      conversation_id: conversationId,
      brokerage_id: brokerageId,
      contact_phone: contactPhone || null,
      client_id: clientId || null,
      role,
      content,
      message_type: messageType || 'text',
      audio_url: audioUrl || null,
      chatwoot_message_id: chatwootMessageId || null,
      queue_message_id: queueMessageId || null
    })

  if (error) {
    console.error('⚠️ Failed to save chat history:', error.message)
  }
}
