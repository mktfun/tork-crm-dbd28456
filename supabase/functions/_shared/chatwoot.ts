import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export async function sendChatwootMessage(
  supabase: SupabaseClient,
  brokerageId: number,
  conversationId: number,
  message: string
) {
  try {
    const { data: brokerage } = await supabase
      .from('brokerages')
      .select('chatwoot_url, chatwoot_token, chatwoot_account_id')
      .eq('id', brokerageId)
      .maybeSingle()

    if (!brokerage?.chatwoot_url || !brokerage?.chatwoot_token || !brokerage?.chatwoot_account_id) {
      console.warn('⚠️ Missing Chatwoot config for brokerage', brokerageId)
      return
    }

    const url = `${brokerage.chatwoot_url}/api/v1/accounts/${brokerage.chatwoot_account_id}/conversations/${conversationId}/messages`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': brokerage.chatwoot_token,
      },
      body: JSON.stringify({ 
        content: message, 
        message_type: 'outgoing', 
        private: false 
      }),
    })
    
    if (!response.ok) {
        console.error(`❌ sendChatwootMessage failed: HTTP ${response.status}`, await response.text());
    } else {
        console.log(`✅ Sent message to Chatwoot conversation ${conversationId}`);
    }
  } catch (error) {
    console.error('❌ Error executing sendChatwootMessage:', error)
  }
}
