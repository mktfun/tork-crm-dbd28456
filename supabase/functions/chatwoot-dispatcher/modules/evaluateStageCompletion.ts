import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export async function evaluateObjectiveCompletion(
  supabase: SupabaseClient,
  resolvedAI: any,
  params: {
    deal: any;
    stage: any;
    stageAiSettings: any;
    userId: string;
    chatwootConversationId: number;
    brokerageId: number | null;
  }
): Promise<{ completed: boolean; previousStageId: string | null; previousStageName: string | null; newStageId: string | null; newStageName: string | null }> {
  const result = { completed: false, previousStageId: null as string | null, previousStageName: null as string | null, newStageId: null as string | null, newStageName: null as string | null }

  const objective = params.stageAiSettings?.ai_objective
  if (!objective || !resolvedAI.auth) return result

  // Fetch last messages from Chatwoot
  let recentMessages = ''
  try {
    if (params.brokerageId) {
      const { data: brokerage } = await supabase
        .from('brokerages')
        .select('chatwoot_url, chatwoot_token, chatwoot_account_id')
        .eq('id', params.brokerageId)
        .maybeSingle()

      if (brokerage?.chatwoot_url && brokerage?.chatwoot_token && brokerage?.chatwoot_account_id) {
        const cwUrl = brokerage.chatwoot_url.replace(/\/+$/, '')
        const messagesResp = await fetch(
          `${cwUrl}/api/v1/accounts/${brokerage.chatwoot_account_id}/conversations/${params.chatwootConversationId}/messages`,
          { headers: { api_access_token: brokerage.chatwoot_token } }
        )
        if (messagesResp.ok) {
          const messagesData = await messagesResp.json()
          const msgs = (messagesData.payload || []).slice(-6)
          recentMessages = msgs.map((m: any) => `${m.message_type === 0 ? 'Cliente' : 'Agente'}: ${m.content || '[mídia]'}`).join('\n')
        }
      }
    }
  } catch (err) {
    console.error('⚠️ Failed to fetch Chatwoot messages for evaluation:', err)
  }

  if (!recentMessages) return result

  // Quick AI evaluation
  try {
    const evalResp = await fetch(resolvedAI.url, {
      method: 'POST',
      headers: { Authorization: resolvedAI.auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: resolvedAI.model,
        messages: [
          { role: 'system', content: 'Você é um avaliador. Responda APENAS "SIM" ou "NAO", sem explicações.' },
          { role: 'user', content: `Dado o objetivo da etapa: "${objective}"\n\nHistórico recente:\n${recentMessages}\n\nO objetivo foi atingido?` }
        ],
        max_tokens: 5,
        temperature: 0,
      })
    })

    if (evalResp.ok) {
      const evalData = await evalResp.json()
      const answer = (evalData.choices?.[0]?.message?.content || '').trim().toUpperCase()
      console.log(`🎯 Objective evaluation: "${answer}" for deal ${params.deal.id}`)

      if (answer === 'SIM') {
        result.completed = true
        result.previousStageId = params.stage.id
        result.previousStageName = params.stage.name

        // Determine target stage
        let targetStageId: string | null = null

        // Check completion action first
        if (params.stageAiSettings?.ai_completion_action) {
          try {
            const action = typeof params.stageAiSettings.ai_completion_action === 'string'
              ? JSON.parse(params.stageAiSettings.ai_completion_action)
              : params.stageAiSettings.ai_completion_action
            if (action.type === 'move_stage' && action.target_stage_id) {
              targetStageId = action.target_stage_id
            }
          } catch { /* ignore */ }
        }

        // Fallback: next stage by position
        if (!targetStageId && params.stage.pipeline_id) {
          const { data: nextStage } = await supabase
            .from('crm_stages')
            .select('id, name')
            .eq('pipeline_id', params.stage.pipeline_id)
            .gt('position', params.stage.position)
            .order('position', { ascending: true })
            .limit(1)
            .maybeSingle()
          if (nextStage) targetStageId = nextStage.id
        }

        if (targetStageId) {
          // Move the deal
          const { error: moveError } = await supabase
            .from('crm_deals')
            .update({ stage_id: targetStageId, last_sync_source: 'chatwoot' })
            .eq('id', params.deal.id)

          if (!moveError) {
            const { data: newStageData } = await supabase
              .from('crm_stages')
              .select('id, name')
              .eq('id', targetStageId)
              .maybeSingle()

            result.newStageId = targetStageId
            result.newStageName = newStageData?.name || null
            console.log(`🚀 Deal ${params.deal.id} moved from "${params.stage.name}" to "${result.newStageName}"`)

            // Log event
            await supabase.from('crm_deal_events').insert({
              deal_id: params.deal.id,
              event_type: 'stage_change',
              old_value: params.stage.name,
              new_value: result.newStageName,
              source: 'dispatcher_auto',
              created_by: params.userId,
            })

            // Sync new stage label to Chatwoot conversation
            if (params.chatwootConversationId && params.brokerageId) {
              try {
                const { data: newStageLabel } = await supabase
                  .from('crm_stages')
                  .select('chatwoot_label')
                  .eq('id', targetStageId)
                  .maybeSingle()

                if (newStageLabel?.chatwoot_label) {
                  const { data: brokerage } = await supabase
                    .from('brokerages')
                    .select('chatwoot_url, chatwoot_token, chatwoot_account_id')
                    .eq('id', params.brokerageId)
                    .maybeSingle()

                  if (brokerage?.chatwoot_url && brokerage?.chatwoot_token) {
                    const labelUrl = `${brokerage.chatwoot_url}/api/v1/accounts/${brokerage.chatwoot_account_id}/conversations/${params.chatwootConversationId}/labels`
                    await fetch(labelUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', api_access_token: brokerage.chatwoot_token },
                      body: JSON.stringify({ labels: [newStageLabel.chatwoot_label] }),
                    })
                    console.log(`🏷️ Synced label "${newStageLabel.chatwoot_label}" after stage move`)
                  }
                }
              } catch (labelErr) {
                console.error('⚠️ Failed to sync label after stage move:', labelErr)
              }
            }
          } else {
            console.error('❌ Failed to move deal:', moveError)
            result.completed = false
          }
        }
      }
    }
  } catch (err) {
    console.error('⚠️ Objective evaluation error:', err)
  }

  return result
}
