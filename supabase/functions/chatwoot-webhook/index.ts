import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-chatwoot-signature',
};

// ========== VENDOR RESOLUTION ==========
interface VendorResolution {
  user_id: string;
  brokerage_id: number;
  source: 'assignee_email' | 'inbox_agent' | 'existing_client' | 'brokerage_owner';
}

/**
 * Resolve dynamically which seller (user_id) should own the conversation/deal.
 * Priority:
 * 1. Assignee email matches a profile
 * 2. Inbox agent mapping (chatwoot_inbox_agents table)
 * 3. Fallback to brokerage owner
 */
async function resolveVendor(
  supabase: any,
  brokerageId: number,
  payload: any
): Promise<VendorResolution | null> {
  const assigneeEmail = payload?.meta?.assignee?.email || payload?.conversation?.meta?.assignee?.email;
  const inboxId = payload?.inbox?.id || payload?.conversation?.inbox_id;

  console.log('🔍 Resolving vendor - assignee:', assigneeEmail, 'inbox:', inboxId);

  // 1. Try by assignee email → profiles.email
  if (assigneeEmail) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', assigneeEmail)
      .maybeSingle();
    
    if (profile) {
      console.log('✅ Vendor resolved via assignee email:', profile.id);
      return { user_id: profile.id, brokerage_id: brokerageId, source: 'assignee_email' };
    }
  }
  
  // 2. Try by inbox_id + agent mapping
  if (inboxId) {
    // First try exact match with agent_email, then fallback to is_default
    let query = supabase
      .from('chatwoot_inbox_agents')
      .select('user_id')
      .eq('brokerage_id', brokerageId)
      .eq('inbox_id', inboxId);
    
    if (assigneeEmail) {
      // Try exact agent match first
      const { data: exactMatch } = await query
        .eq('agent_email', assigneeEmail)
        .maybeSingle();
      
      if (exactMatch?.user_id) {
        console.log('✅ Vendor resolved via inbox agent exact match:', exactMatch.user_id);
        return { user_id: exactMatch.user_id, brokerage_id: brokerageId, source: 'inbox_agent' };
      }
    }
    
    // Try default agent for inbox
    const { data: defaultAgent } = await supabase
      .from('chatwoot_inbox_agents')
      .select('user_id')
      .eq('brokerage_id', brokerageId)
      .eq('inbox_id', inboxId)
      .eq('is_default', true)
      .maybeSingle();
    
    if (defaultAgent?.user_id) {
      console.log('✅ Vendor resolved via inbox default agent:', defaultAgent.user_id);
      return { user_id: defaultAgent.user_id, brokerage_id: brokerageId, source: 'inbox_agent' };
    }
  }
  
  // 3. Fallback: brokerage owner
  const { data: brokerage } = await supabase
    .from('brokerages')
    .select('user_id')
    .eq('id', brokerageId)
    .single();
  
  if (brokerage) {
    console.log('✅ Vendor resolved via brokerage owner:', brokerage.user_id);
    return { user_id: brokerage.user_id, brokerage_id: brokerageId, source: 'brokerage_owner' };
  }
  
  console.log('❌ Could not resolve vendor');
  return null;
}

/**
 * Find brokerage by Chatwoot account ID.
 * Now using brokerages table instead of crm_settings.
 */
async function findBrokerageByAccountId(
  supabase: any,
  accountId: string
): Promise<{ id: number; user_id: string } | null> {
  // Try brokerages table first (new approach)
  const { data: brokerage, error: brokerageError } = await supabase
    .from('brokerages')
    .select('id, user_id')
    .eq('chatwoot_account_id', accountId)
    .maybeSingle();
  
  if (brokerage) {
    console.log('📦 Found brokerage by account_id:', brokerage.id);
    return brokerage;
  }

  // Fallback to crm_settings for backwards compatibility
  const { data: settings, error: settingsError } = await supabase
    .from('crm_settings')
    .select('user_id')
    .eq('chatwoot_account_id', accountId)
    .maybeSingle();

  if (settings) {
    // Get brokerage for this user
    const { data: userBrokerage } = await supabase
      .from('brokerages')
      .select('id, user_id')
      .eq('user_id', settings.user_id)
      .maybeSingle();
    
    if (userBrokerage) {
      console.log('📦 Found brokerage via crm_settings fallback:', userBrokerage.id);
      return userBrokerage;
    }
  }

  console.log('❌ No brokerage found for account_id:', accountId);
  return null;
}

/**
 * Find existing client by phone or email.
 * Returns the existing client with its owner (user_id).
 */
async function findExistingClient(
  supabase: any,
  contact: any
): Promise<{ id: string; user_id: string } | null> {
  const email = contact?.email;
  const phone = contact?.phone_number;

  if (!email && !phone) return null;

  // Try by email first
  if (email) {
    const { data: clientByEmail } = await supabase
      .from('clientes')
      .select('id, user_id')
      .eq('email', email)
      .maybeSingle();
    
    if (clientByEmail) {
      console.log('👤 Found existing client by email:', clientByEmail.id);
      return clientByEmail;
    }
  }

  // Try by phone
  if (phone) {
    // Normalize phone for search
    const phoneDigits = phone.replace(/\D/g, '');
    const phoneVariants = [
      phone,
      phoneDigits,
      `+55${phoneDigits}`,
      phoneDigits.slice(-10), // Last 10 digits
      phoneDigits.slice(-11), // Last 11 digits
    ].filter(Boolean);

    for (const variant of phoneVariants) {
      const { data: clientByPhone } = await supabase
        .from('clientes')
        .select('id, user_id')
        .ilike('phone', `%${variant}%`)
        .limit(1)
        .maybeSingle();
      
      if (clientByPhone) {
        console.log('👤 Found existing client by phone:', clientByPhone.id);
        return clientByPhone;
      }
    }
  }

  return null;
}

// ========== MAIN HANDLER ==========
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Tork webhook received:', JSON.stringify(body, null, 2));

    const { event, account, conversation, contact } = body;

    if (!event || !account) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find brokerage by account_id (multi-tenant resolution)
    const brokerage = await findBrokerageByAccountId(supabase, account.id.toString());

    if (!brokerage) {
      console.log('No brokerage found for account:', account.id);
      return new Response(
        JSON.stringify({ message: 'Account not linked to any brokerage' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing webhook for brokerage:', brokerage.id, 'default owner:', brokerage.user_id);

    switch (event) {
      case 'conversation_updated': {
        if (!conversation) break;

        // Check if we have a deal linked to this conversation
        const { data: deal, error: dealError } = await supabase
          .from('crm_deals')
          .select('*, stage:crm_stages(*)')
          .eq('chatwoot_conversation_id', conversation.id)
          .maybeSingle();

        if (!deal) {
          console.log('No deal found for conversation:', conversation.id);
          break;
        }

        // Check sync token to prevent loops
        if (body.sync_token && deal.sync_token === body.sync_token) {
          console.log('Ignoring self-triggered webhook for deal:', deal.id);
          break;
        }

        // Check for label changes
        const labels: string[] = conversation.labels || [];
        
        // Get all stages for this deal's owner
        const { data: stages } = await supabase
          .from('crm_stages')
          .select('*')
          .eq('user_id', deal.user_id);

        // Find matching stage by label
        const matchingStage = stages?.find(s => 
          s.chatwoot_label && labels.includes(s.chatwoot_label)
        );

        if (matchingStage && matchingStage.id !== deal.stage_id) {
          console.log('Updating deal stage from Tork:', deal.id, '->', matchingStage.name);
          
          await supabase
            .from('crm_deals')
            .update({
              stage_id: matchingStage.id,
              last_sync_source: 'chatwoot',
              sync_token: crypto.randomUUID()
            })
            .eq('id', deal.id);
        }
        break;
      }

      case 'contact_created': {
        if (!contact) break;

        // Check if contact already exists
        const existingClient = await findExistingClient(supabase, contact);

        if (existingClient) {
          // Link existing client to Chatwoot contact
          await supabase
            .from('clientes')
            .update({
              chatwoot_contact_id: contact.id,
              chatwoot_synced_at: new Date().toISOString()
            })
            .eq('id', existingClient.id);
          console.log('Linked existing client to Tork contact:', existingClient.id);
        }
        break;
      }

      case 'conversation_created': {
        if (!conversation || !contact) break;

        // Resolve vendor dynamically
        const vendor = await resolveVendor(supabase, brokerage.id, body);
        
        if (!vendor) {
          console.log('Could not resolve vendor for conversation');
          break;
        }

        // Check if client already exists - preserve ownership
        const existingClient = await findExistingClient(supabase, contact);
        const finalOwnerId = existingClient?.user_id || vendor.user_id;

        console.log('📌 Ownership resolution:',
          'existing_client:', existingClient?.user_id || 'none',
          'vendor:', vendor.user_id,
          'final:', finalOwnerId,
          'source:', existingClient ? 'existing_client' : vendor.source
        );

        // Get first stage for the final owner
        const { data: firstStage } = await supabase
          .from('crm_stages')
          .select('id')
          .eq('user_id', finalOwnerId)
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstStage) {
          // Check if deal already exists for this conversation
          const { data: existingDeal } = await supabase
            .from('crm_deals')
            .select('id')
            .eq('chatwoot_conversation_id', conversation.id)
            .maybeSingle();

          if (!existingDeal) {
            const clientName = contact.name || 
              (existingClient ? (await supabase.from('clientes').select('name').eq('id', existingClient.id).single()).data?.name : null);
            
            const dealTitle = clientName 
              ? `Nova conversa - ${clientName}`
              : `Conversa #${conversation.id}`;

            await supabase
              .from('crm_deals')
              .insert({
                user_id: finalOwnerId,
                client_id: existingClient?.id || null,
                stage_id: firstStage.id,
                chatwoot_conversation_id: conversation.id,
                title: dealTitle,
                position: 0,
                last_sync_source: 'chatwoot',
                sync_token: crypto.randomUUID()
              });
            console.log('Created deal from Tork conversation:', conversation.id, 'owner:', finalOwnerId);
          }
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in tork-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
