
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Helper function to resolve brokerage and user role
async function resolveBrokerageAndRole(assigneeEmail: string | null, conversation: any) {
    if (!assigneeEmail) return { userId: null, brokerageId: null, isCorretor: false };

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, brokerage_id')
        .eq('email', assigneeEmail)
        .maybeSingle();

    if (profileError || !profile) {
        console.warn(`Could not resolve profile for email: ${assigneeEmail}`);
        return { userId: null, brokerageId: null, isCorretor: false };
    }

    const isCorretor = conversation?.labels?.includes('Corretor') || conversation?.labels?.includes('Admin');

    return {
        userId: profile.id,
        brokerageId: profile.brokerage_id,
        isCorretor: !!isCorretor
    };
}

Deno.serve(async (req) => {
    try {
        const body = await req.json()
        console.log("📥 New Webhook Event:", body.event)

        // 1. Validate Event
        if (body.event !== 'message_created' || body.message_type !== 'incoming') {
            return new Response(JSON.stringify({ message: "Ignored event" }), {
                headers: { "Content-Type": "application/json" },
            })
        }

        const { conversation, sender, content } = body;
        const assigneeEmail = conversation?.meta?.assignee?.email;
        const inboxId = conversation?.inbox_id;

        // Resolve user and role
        const { userId, brokerageId, isCorretor } = await resolveBrokerageAndRole(assigneeEmail, conversation);

        // --- Start of Analysis Session Logic ---
        if (isCorretor && userId && brokerageId) {
            console.log(`👨‍💼 Corrector detected: ${userId}`);
            const messageContent = (content || '').toLowerCase().trim();
            const triggerKeyword = 'analisar';
            const finalizeKeyword = 'processar';

            // Check for active session for this user
            const { data: activeSession, error: sessionError } = await supabase
                .from('ai_analysis_sessions')
                .select('id, collected_data')
                .eq('user_id', userId)
                .eq('status', 'compiling')
                .maybeSingle();

            if (sessionError) {
                console.error("Error fetching session:", sessionError.message);
                // Continue to default logic even if session check fails
            } else if (activeSession) {
                // --- Active session found, append data or finalize ---
                const collectedData = activeSession.collected_data || [];
                collectedData.push(body); // Add the whole message body for context

                if (messageContent.includes(finalizeKeyword)) {
                    // Finalize session
                    console.log(`✅ Finalizing session ${activeSession.id}`);
                    const { error: updateError } = await supabase
                        .from('ai_analysis_sessions')
                        .update({ status: 'ready_for_processing', collected_data: collectedData })
                        .eq('id', activeSession.id);

                    if (updateError) {
                      console.error("Error finalizing session:", updateError.message);
                    } else {
                       // Asynchronously trigger the processing function without blocking the response
                       supabase.functions.invoke('process-analysis-session', { body: { session_id: activeSession.id } }).catch(console.error);
                    }
                    
                    return new Response(JSON.stringify({ message: "Análise iniciada. Você será notificado quando terminar." }), {
                        headers: { "Content-Type": "application/json" },
                    });
                } else {
                    // Append to session
                    console.log(`📥 Appending data to session ${activeSession.id}`);
                    const { error: updateError } = await supabase
                        .from('ai_analysis_sessions')
                        .update({ collected_data: collectedData, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() })
                        .eq('id', activeSession.id);
                    
                    if (updateError) console.error("Error updating session:", updateError.message);

                    return new Response(JSON.stringify({ message: "Dados recebidos. Envie 'processar' quando terminar." }), {
                        headers: { "Content-Type": "application/json" },
                    });
                }
            } else if (messageContent.includes(triggerKeyword)) {
                // --- No active session, create a new one ---
                console.log(`🚀 Creating new analysis session for user ${userId}`);
                const { error: createError } = await supabase
                    .from('ai_analysis_sessions')
                    .insert({
                        user_id: userId,
                        brokerage_id: brokerageId,
                        chatwoot_conversation_id: conversation.id,
                        status: 'compiling',
                        collected_data: [body],
                    });

                if (createError) console.error("Error creating session:", createError.message);
                
                return new Response(JSON.stringify({ message: "Modo de análise iniciado. Envie todos os arquivos e áudios. Digite 'processar' para finalizar." }), {
                    headers: { "Content-Type": "application/json" },
                });
            }
        }
        // --- End of Analysis Session Logic. Fallback to original logic below ---
        
        // 2. Resolve CRM User (The Agent) - Essential for fetching AI presets and N8n Webhook
        let resolvedUserId = userId;
        if (!resolvedUserId) {
            if (assigneeEmail) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', assigneeEmail)
                    .maybeSingle()

                if (profile) resolvedUserId = profile.id;
            }
            
            // If still no user (e.g., unassigned chat), try to find an inbox mapping route
            if (!resolvedUserId && inboxId) {
                const { data: inboxMapping } = await supabase
                    .from('chatwoot_inbox_agents')
                    .select('user_id')
                    .eq('inbox_id', inboxId)
                    .limit(1)
                    .maybeSingle();

                if (inboxMapping?.user_id) {
                    resolvedUserId = inboxMapping.user_id;
                    console.log(`🕵️ Resolved User Fallback via Inbox Route: ${resolvedUserId}`);
                }
            }
        }


        // 3. Resolve Deal & Stage Context
        let currentDeal = null
        let currentStage = null
        let stageAiSettings = null
        let clientId = null

        const contactPhone = sender?.phone_number;
        const contactEmail = sender?.email;

        if (contactPhone || contactEmail) {
            // Primeiro, encontrar o cliente
            let clientQuery = supabase.from('clientes').select('id');
            if (contactPhone) clientQuery = clientQuery.ilike('phone', `%${contactPhone.replace(/\D/g, '')}%`);
            else if (contactEmail) clientQuery = clientQuery.eq('email', contactEmail);
            
            const { data: clientData } = await clientQuery.maybeSingle();
            clientId = clientData?.id;

            if (clientId) {
                // Buscar negócio aberto para este cliente
                const { data: deals } = await supabase
                    .from('crm_deals')
                    .select(`
                        id, 
                        title, 
                        stage_id,
                        crm_stages (
                            id, 
                            name, 
                            pipeline_id
                        )
                    `)
                    .eq('client_id', clientId)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (deals && deals.length > 0) {
                    currentDeal = deals[0];
                    currentStage = currentDeal.crm_stages;
                    console.log(`✅ Found Deal: ${currentDeal.title} in Stage: ${currentStage?.name}`);

                    // 4. Fetch AI Settings for this Stage
                    if (currentStage?.id) {
                        const { data: settings } = await supabase
                            .from('crm_ai_settings')
                            .select('*')
                            .eq('stage_id', currentStage.id)
                            .maybeSingle();
                        stageAiSettings = settings;
                    }
                }
            }
        }

        // 5. Build System Prompt (The Core Logic)
        let systemPrompt = ""

        // Global Config Fallback
        let globalConfig = null;
        if (userId) {
            const { data } = await supabase
                .from('crm_ai_config')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle()
            globalConfig = data;
        }

        // Base Persona
        const basePersona = stageAiSettings?.ai_persona || globalConfig?.base_instructions || "Você é um assistente de vendas útil e amigável da Tork CRM."
        systemPrompt += `<character>\n${basePersona}\n</character>\n\n`

        // MANUAL DE TOOLS (Obrigatório para a IA saber usar o Supabase)
        systemPrompt += `<tools_manual>\n`
        systemPrompt += `1. search_contact: SEMPRE use antes de criar um contato para evitar duplicados.\n`
        systemPrompt += `2. create_contact: Use se search_contact não retornar nada. Peça nome e telefone.\n`
        systemPrompt += `3. list_pipelines_and_stages: Use para conhecer os funis antes de criar um negócio.\n`
        systemPrompt += `4. create_deal: Use para abrir uma oportunidade. Requer client_id e stage_id.\n`
        systemPrompt += `5. update_deal_stage: Use para mover o cliente no funil assim que o objetivo for atingido.\n`
        systemPrompt += `</tools_manual>\n\n`

        // Stage Specific Objective
        if (currentStage && stageAiSettings?.ai_objective) {
            systemPrompt += `<current_context>\n`
            systemPrompt += `NEGÓCIO ATUAL: "${currentDeal?.title}"\n`
            systemPrompt += `ETAPA ATUAL: "${currentStage.name}"\n`
            systemPrompt += `OBJETIVO: ${stageAiSettings.ai_objective}\n`
            systemPrompt += `</current_context>\n\n`

            if (stageAiSettings.ai_completion_action) {
                const action = typeof stageAiSettings.ai_completion_action === 'string'
                    ? JSON.parse(stageAiSettings.ai_completion_action)
                    : stageAiSettings.ai_completion_action

                if (action.type === 'move_stage' && action.target_stage_id) {
                    systemPrompt += `<automation_rule>\n`
                    systemPrompt += `Ao atingir o objetivo, use update_deal_stage({ "deal_id": "${currentDeal.id}", "new_stage_id": "${action.target_stage_id}" }).\n`
                    systemPrompt += `</automation_rule>\n\n`
                }
            }
        }

        // 6. Send to n8n
        let finalN8nUrl = N8N_WEBHOOK_URL;
        if (resolvedUserId) {
            const { data: crmSettings } = await supabase.from('crm_settings').select('n8n_webhook_url').eq('user_id', resolvedUserId).maybeSingle();
            if (crmSettings?.n8n_webhook_url) finalN8nUrl = crmSettings.n8n_webhook_url.trim();
        }
        
        if (finalN8nUrl) {
            const payload = {
                ...body,
                derived_data: {
                    crm_user_id: userId,
                    client_id: clientId,
                    deal_id: currentDeal?.id,
                    deal_title: currentDeal?.title,
                    pipeline_id: currentStage?.pipeline_id,
                    stage_id: currentStage?.id,
                    current_stage_name: currentStage?.name,
                    ai_system_prompt: systemPrompt,
                    allowed_tools: ['create_contact', 'search_contact', 'create_deal', 'update_deal_stage', 'list_pipelines_and_stages']
                }
            }

            console.log("🚀 Forwarding payload to n8n...")

            const n8nResponse = await fetch(finalN8nUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            console.log(`n8n Response Status: ${n8nResponse.status}`)
        } else {
            console.warn("⚠️ No valid N8N_WEBHOOK_URL configured globally or for this user.")
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        console.error("❌ Error processing webhook:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        })
    }
})
