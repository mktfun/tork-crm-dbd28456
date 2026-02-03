import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface for AI Configuration
interface AIConfig {
    model: string;
    temperature: number;
    system_prompt: string; // Constructed from modules
}

// Vendor Resolution Logic (Simplified for this context)
async function resolveVendor(supabase: any, conversation: any) {
    const assigneeEmail = conversation?.meta?.assignee?.email;
    const inboxId = conversation?.inbox_id;

    // 1. Try by assignee email
    if (assigneeEmail) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', assigneeEmail)
            .maybeSingle();
        if (profile) return profile.id;
    }

    // 2. Fallback: Inbox Owner (simplified)
    // You might want to add logic here to find default agent for inbox

    return null;
}

// Fetch AI Config and Construct Prompt
async function getAIConfig(supabase: any, userId: string): Promise<AIConfig | null> {
    // 1. Get Global Config
    const { data: config } = await supabase
        .from('crm_ai_config')
        .select('id, model, temperature')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

    if (!config) return null;

    // 2. Get Prompts Modules
    const { data: prompts } = await supabase
        .from('crm_ai_prompts')
        .select('content, module_type')
        .eq('config_id', config.id)
        .eq('is_enabled', true)
        .order('position', { ascending: true });

    if (!prompts || prompts.length === 0) return null;

    // 3. Construct System Prompt
    const systemPrompt = prompts.map((p: any) => p.content).join('\n\n');

    return {
        model: config.model,
        temperature: config.temperature,
        system_prompt: systemPrompt
    };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL'); // Must be set in Supabase Secrets

        if (!n8nWebhookUrl) {
            throw new Error('N8N_WEBHOOK_URL not configured');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await req.json();
        const { event, conversation, messages } = body;

        // We only care about incoming messages (user -> agent)
        // Chatwoot webhook structure for message_created
        if (event !== 'message_created' || body.message_type !== 'incoming') {
            return new Response(JSON.stringify({ message: 'Ignored event' }), { headers: corsHeaders });
        }

        if (body.private) { // Ignore private notes
            return new Response(JSON.stringify({ message: 'Ignored private message' }), { headers: corsHeaders });
        }

        console.log(`Received message from Chatwoot Conversation #${conversation.id}`);

        // 1. Resolve Vendor (User ID)
        let userId = await resolveVendor(supabase, conversation);

        // If no assignee, maybe check if deal exists and get its owner?
        if (!userId) {
            const { data: deal } = await supabase
                .from('crm_deals')
                .select('user_id')
                .eq('chatwoot_conversation_id', conversation.id)
                .maybeSingle();
            if (deal) userId = deal.user_id;
        }

        if (!userId) {
            console.log('Could not resolve vendor, ignoring AI');
            return new Response(JSON.stringify({ message: 'No vendor resolved' }), { headers: corsHeaders });
        }

        // 2. User/Profile Context
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

        // 3. Get AI Configuration & Prompt
        const aiConfig = await getAIConfig(supabase, userId);

        if (!aiConfig) {
            console.log(`No AI config active for user ${userId}`);
            return new Response(JSON.stringify({ message: 'AI disabled for user' }), { headers: corsHeaders });
        }

        // 4. Resolve Client Context
        // Check if client exists by phone
        const phone = conversation.meta?.sender?.phone_number;
        let clientContext = null;

        if (phone) {
            const { data: client } = await supabase.from('clientes').select('*').ilike('phone', `%${phone.slice(-8)}%`).maybeSingle();
            clientContext = client;
        }

        // 5. Resolve Pipeline/Stage Defaults (First pipeline for user)
        const { data: firstStage } = await supabase
            .from('crm_stages')
            .select('id, pipeline_id')
            .eq('user_id', userId)
            .order('position', { ascending: true })
            .limit(1)
            .maybeSingle();

        // 6. Payload Assembly
        const payload = {
            message: body.content,
            sender: {
                phone: phone,
                name: conversation.meta?.sender?.name,
                email: conversation.meta?.sender?.email,
            },
            context: {
                user_id: userId,
                user_name: profile.nome_completo,
                company_id: profile.company_id, // If exists
                conversation_id: conversation.id,
                client_id: clientContext?.id,
                default_stage_id: firstStage?.id
            },
            ai_config: {
                system_prompt: aiConfig.system_prompt,
                model: aiConfig.model,
                temperature: aiConfig.temperature
            },
            raw_chatwoot: body // Forward original payload if needed
        };

        // 7. Fire & Forget to n8n
        // We don't await the response to avoid blocking Chatwoot loop, 
        // unless n8n is fast. Ideally, this should be fire & forget or with timeout.
        // For now, we await to log errors.
        console.log('Forwarding to n8n...');
        const n8nResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`n8n responded with ${n8nResponse.status}`);

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } catch (err: any) {
        console.error('Error in chatwoot-dispatcher:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});
