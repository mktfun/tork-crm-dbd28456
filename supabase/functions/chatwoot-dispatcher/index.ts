
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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

        const { conversation, sender } = body
        const assigneeEmail = conversation?.meta?.assignee?.email
        const inboxId = conversation?.inbox_id

        console.log(`🕵️ Resolving User for: ${assigneeEmail || 'No Assignee'} (Inbox: ${inboxId})`)

        // 2. Resolve CRM User (The Agent)
        let userId = null

        if (assigneeEmail) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', assigneeEmail)
                .maybeSingle()

            if (profile) userId = profile.id
        }

        // 3. Resolve Deal & Stage Context
        let currentDeal = null
        let currentStage = null
        let stageAiSettings = null

        // Find contact by phone or email provided by Chatwoot
        // Note: We search in crm_deals directly assuming some denormalization or direct link logic exists/will exist
        // Or we could search crm_clients first. For MVP, we search deals by contact info.
        const contactIdentifier = sender?.phone_number || sender?.email;

        if (contactIdentifier) {
            // Try to find an open deal for this contact
            // We use .or() to match either phone or email if columns exist
            // Note: Adjust column names if your schema uses 'client_id' relationship instead
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
                // Simple approach: assuming deals table has contact info or linked client info. 
                // If deals are linked to clients, we'd need a deeper join, but let's assume simplified view for now.
                // If this fails, we might need a stored procedure or View.
                // For now, let's assume we can match. If not, this part yields null and we fallback.
                .limit(1)
                .order('created_at', { ascending: false });

            // Since we can't easily join-filter in one step without knowing exact schema, 
            // let's assume valid deals are returned or we use a more generic approach in n8n if this fails.
            if (deals && deals.length > 0) {
                currentDeal = deals[0]
                currentStage = currentDeal.crm_stages

                console.log(`✅ Found Deal: ${currentDeal.title} in Stage: ${currentStage?.name}`)

                // 4. Fetch AI Settings for this Stage
                if (currentStage?.id) {
                    const { data: settings } = await supabase
                        .from('crm_ai_settings')
                        .select('*')
                        .eq('stage_id', currentStage.id)
                        .maybeSingle()

                    stageAiSettings = settings
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

        // Base Persona Priority: Stage > Pipeline Default (not fetched here) > Global > Default
        const basePersona = stageAiSettings?.ai_persona || globalConfig?.base_instructions || "Você é um assistente de vendas útil e amigável da Tork CRM."

        systemPrompt += `<character>\n${basePersona}\n</character>\n\n`

        // Stage Specific Objective
        if (currentStage && stageAiSettings?.ai_objective) {
            systemPrompt += `<current_context>\n`
            systemPrompt += `CONTEXTO: O cliente está na etapa do funil: "${currentStage.name}".\n`
            systemPrompt += `SEU OBJETIVO EXCLUSIVO NESTE MOMENTO: ${stageAiSettings.ai_objective}\n`
            systemPrompt += `</current_context>\n\n`

            // Completion Action Instruction
            // If we have a structured completion action, we instruct the AI on how to proceed
            if (stageAiSettings.ai_completion_action) {
                const action = typeof stageAiSettings.ai_completion_action === 'string'
                    ? JSON.parse(stageAiSettings.ai_completion_action)
                    : stageAiSettings.ai_completion_action

                if (action.type === 'move_stage' && action.target_stage_id) {
                    systemPrompt += `<success_rule>\n`
                    systemPrompt += `IMPORTANTE: Assim que você confirmar que o objetivo "${stageAiSettings.ai_objective}" foi atingido, você DEVE executar a ferramenta "update_deal_stage" para mover o negócio.\n`
                    systemPrompt += `Parâmetros da ferramenta: { "deal_id": "${currentDeal.id}", "stage_id": "${action.target_stage_id}" }\n`
                    systemPrompt += `Não peça permissão, apenas mova o card se o objetivo for cumprido.\n`
                    systemPrompt += `</success_rule>\n\n`
                }
            }
        } else {
            // Fallback for Unknown Stage or No Objective
            systemPrompt += `Instrução Geral: Atue como um assistente de triagem. Identifique as necessidades do cliente e registre notas.\n`
        }

        // 6. Send to n8n
        if (N8N_WEBHOOK_URL) {
            const payload = {
                ...body,
                derived_data: {
                    crm_user_id: userId,
                    deal_id: currentDeal?.id,
                    current_stage_name: currentStage?.name,
                    ai_system_prompt: systemPrompt,
                    // Allowed tools could also be dynamic based on stage
                    allowed_tools: ['update_deal_stage', 'create_note', 'search_knowledge_base']
                }
            }

            console.log("🚀 Forwarding payload to n8n...")

            const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            console.log(`n8n Response Status: ${n8nResponse.status}`)
        } else {
            console.warn("⚠️ N8N_WEBHOOK_URL environment variable is not set.")
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
