import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export async function manageFollowups(
  supabase: SupabaseClient,
  params: {
    currentDeal: any,
    userId: string | null,
    role: string | null,
    clientJustResponded: boolean,
    stageAiSettings: any,
    n8nResponseBody: any,
    conversation: any,
    brokerageId: number | null
  }
) {
  const { currentDeal, userId, role, clientJustResponded, stageAiSettings, n8nResponseBody, conversation, brokerageId } = params

  if (currentDeal?.id && userId && role !== 'admin' && !clientJustResponded) {
    const shouldFollowUp = (() => {
      if (stageAiSettings?.follow_up_enabled) return true
      if (!n8nResponseBody) return false
      const agentMessage = n8nResponseBody?.output || n8nResponseBody?.text || n8nResponseBody?.message || ''
      if (!agentMessage) return false
      const hasUrl = /https?:\/\//.test(agentMessage)
      const hasKeywords = /cotação|proposta|orçamento|link|formulário|aguard/i.test(agentMessage)
      return hasUrl || hasKeywords
    })()

    if (shouldFollowUp) {
      const { data: existingFollowUp } = await supabase
        .from('ai_follow_ups')
        .select('id')
        .eq('deal_id', currentDeal.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (!existingFollowUp) {
        const intervalMinutes = stageAiSettings?.follow_up_interval_minutes || 60
        const { error: followUpError } = await supabase.from('ai_follow_ups').insert({
          deal_id: currentDeal.id,
          user_id: userId,
          chatwoot_conversation_id: conversation.id,
          brokerage_id: brokerageId || null,
          trigger_reason: stageAiSettings?.follow_up_enabled ? 'stage_config' : 'heuristic',
          follow_up_message: stageAiSettings?.follow_up_message || null,
          max_attempts: stageAiSettings?.follow_up_max_attempts || 3,
          interval_minutes: intervalMinutes,
          next_check_at: new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString(),
          status: 'pending',
        })
        if (followUpError) {
          console.error('⚠️ Failed to create follow-up:', followUpError.message)
        } else {
          console.log(`📅 Follow-up created for deal ${currentDeal.id} (reason: ${stageAiSettings?.follow_up_enabled ? 'stage_config' : 'heuristic'}, interval: ${intervalMinutes}min)`)
        }
      }
    }
  }
}
