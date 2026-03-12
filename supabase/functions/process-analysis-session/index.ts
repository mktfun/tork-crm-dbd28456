import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
    let sessionId = null;
    try {
        const body = await req.json();
        sessionId = body.session_id;
        if (!sessionId) throw new Error("Missing session_id");

        console.log(`🧠 Processing analysis session: ${sessionId}`);

        // 1. Fetch session data and mark as processing
        const { data: session, error: sessionError } = await supabase
            .from('ai_analysis_sessions')
            .update({ status: 'processing' })
            .eq('id', sessionId)
            .select()
            .single();

        if (sessionError || !session) {
            throw new Error(`Session not found or failed to update: ${sessionId}`);
        }

        // 2. Extract and process data (OCR, Transcribe, etc.)
        // This is where you would integrate with OCR and audio transcription services.
        // For now, we will simulate this by concatenating text content.
        let combinedText = "";
        let clientData = {};
        for (const record of session.collected_data) {
            if (record.content) {
                combinedText += record.content + "\\n";
            }
            if(record.sender) {
                clientData.name = record.sender.name;
                clientData.phone = record.sender.phone_number;
            }
            // In a real scenario, you'd handle record.attachments here
        }

        // 3. (Simulated) RAG and Data Enrichment
        // Here you would call your RAG tools, search knowledge base, etc.
        const enrichedContext = `
            Analysis for client: ${clientData.name} (${clientData.phone})
            Collected Information:
            ${combinedText}
            ---
            RAG Context: According to the knowledge base, always prioritize cost-benefit for this client profile.
        `;

        // 4. Build the final payload for n8n
        const systemPrompt = `
            <character>
            You are a Senior Insurance Analyst tasked with providing a detailed and actionable sales strategy to a broker.
            </character>
            <context>
            ${enrichedContext}
            </context>
            <instructions>
            Based on the provided context, generate two distinct outputs:
            1. A 'resumo_tecnico' (technical summary) for the broker.
            2. A 'pitch_de_vendas' (sales pitch) for the end client.
            </instructions>
        `;

        const n8nPayload = {
            original_session: session,
            derived_data: {
                crm_user_id: session.user_id,
                client_data: clientData,
                ai_system_prompt: systemPrompt,
                resumo_tecnico: "", // To be filled by n8n
                pitch_de_vendas: "" // To be filled by n8n
            }
        };

        // 5. Send to n8n
        if (N8N_WEBHOOK_URL) {
            console.log(`🚀 Forwarding processed session ${sessionId} to n8n...`);
            await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(n8nPayload)
            });
        } else {
             console.warn("⚠️ N8N_WEBHOOK_URL not set. Skipping n8n call.");
        }

        // 6. Mark session as complete
        await supabase.from('ai_analysis_sessions').update({ status: 'completed' }).eq('id', sessionId);

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`❌ Error processing session ${sessionId}:`, error.message);
        if(sessionId) {
             await supabase.from('ai_analysis_sessions').update({ status: 'failed' }).eq('id', sessionId);
        }
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
