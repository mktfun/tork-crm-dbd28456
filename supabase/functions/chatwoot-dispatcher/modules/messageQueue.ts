import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export async function enqueueMessage(
  supabase: SupabaseClient,
  params: {
    brokerageId: number
    conversationId: number
    chatwootMessageId: number
    contactPhone?: string | null
    content: string
    messageType: string
  }
) {
  const { data, error } = await supabase
    .from('sdr_message_queue')
    .insert({
      brokerage_id: params.brokerageId,
      conversation_id: params.conversationId,
      chatwoot_message_id: params.chatwootMessageId,
      contact_phone: params.contactPhone || null,
      content: params.content,
      message_type: params.messageType,
      status: 'pending'
    })
    .select('id, created_at')
    .single()

  if (error) throw new Error(`Failed to enqueue message: ${error.message}`)
  return data
}

export async function checkDebounce(
  supabase: SupabaseClient,
  conversationId: number,
  queueId: string,
  myCreatedAt: string
) {
  // Verifies if there are newer pending messages for this conversation
  const { count, error } = await supabase
    .from('sdr_message_queue')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('status', 'pending')
    .neq('id', queueId)
    .gt('created_at', myCreatedAt)

  if (error) {
    console.error('Error during debounce check:', error)
    return { isLatest: true } // failsafe: just run it
  }

  const isLatest = count === 0
  if (!isLatest) {
    console.log(`🔀 Debounce: A newer message was found for conversation ${conversationId}. Skipping ${queueId}.`)
  }

  return { isLatest }
}

export async function acquireLock(
  supabase: SupabaseClient,
  conversationId: number,
  queueId: string
) {
  // Mutex implementation using sdr_conversation_locks table
  try {
    const { data: lock, error: getError } = await supabase
      .from('sdr_conversation_locks')
      .select('*')
      .eq('conversation_id', conversationId)
      .maybeSingle()

    if (getError) throw getError

    const now = new Date()

    if (lock) {
      if (new Date(lock.expires_at) > now) {
        // Locked by someone else and not expired
        return { acquired: false }
      } else {
        // Lock expired, we can steal it
        const { error: updError } = await supabase
          .from('sdr_conversation_locks')
          .update({
            locked_at: now.toISOString(),
            expires_at: new Date(now.getTime() + 60000).toISOString(),
            locked_by_queue_id: queueId
          })
          .eq('conversation_id', conversationId)

        if (updError) return { acquired: false }
        return { acquired: true }
      }
    } else {
      // No lock exists, create one
      const { error: insError } = await supabase
        .from('sdr_conversation_locks')
        .insert({
          conversation_id: conversationId,
          locked_by_queue_id: queueId,
          locked_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 60000).toISOString()
        })

      if (insError) return { acquired: false }
      return { acquired: true }
    }
  } catch (err) {
    console.error('Lock acquisition failed:', err)
    return { acquired: false }
  }
}

export async function releaseLock(supabase: SupabaseClient, conversationId: number) {
  try {
    const { error } = await supabase
      .from('sdr_conversation_locks')
      .delete()
      .eq('conversation_id', conversationId)
      
    if (error) console.error(`Failed to release lock for conv ${conversationId}:`, error)
  } catch (err) {
    console.error('Lock release crashed:', err)
  }
}

export async function updateQueueStatus(
  supabase: SupabaseClient,
  queueId: string,
  status: 'processing' | 'completed' | 'skipped' | 'failed',
  extras?: { audioUrl?: string, errorMessage?: string }
) {
  const payload: any = { status, updated_at: new Date().toISOString() }
  if (extras?.audioUrl) payload.audio_url = extras.audioUrl
  if (extras?.errorMessage) payload.error_message = extras.errorMessage

  await supabase
    .from('sdr_message_queue')
    .update(payload)
    .eq('id', queueId)
}
