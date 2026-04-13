import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOLLOW_UP_TEMPLATES = [
  "Oi {nome}! Vi que mandei umas informações mais cedo, conseguiu dar uma olhada?",
  "Opa {nome}, tudo certo? Fico à disposição se tiver alguma dúvida sobre o que enviei!",
  "Fala {nome}! Vou dar uma pausa aqui, mas qualquer coisa é só chamar que retomo na hora 👋",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch pending follow-ups that are due
    const { data: pendingFollowUps, error: fetchError } = await supabase
      .from("ai_follow_ups")
      .select(`
        *,
        deal:crm_deals(id, title, user_id, chatwoot_conversation_id, client_id,
          client:clientes(name, phone)
        )
      `)
      .eq("status", "pending")
      .lte("next_check_at", new Date().toISOString())
      .limit(50);

    if (fetchError) {
      console.error("Error fetching follow-ups:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingFollowUps || pendingFollowUps.length === 0) {
      console.log("✅ No pending follow-ups to process");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📋 Processing ${pendingFollowUps.length} follow-ups...`);

    let processed = 0;
    let responded = 0;
    let exhausted = 0;

    for (const followUp of pendingFollowUps) {
      try {
        // 2. Get brokerage Chatwoot credentials
        const { data: brokerage } = await supabase
          .from("brokerages")
          .select("chatwoot_url, chatwoot_token, chatwoot_account_id")
          .eq("id", followUp.brokerage_id)
          .single();

        if (!brokerage?.chatwoot_url || !brokerage?.chatwoot_token || !brokerage?.chatwoot_account_id) {
          console.warn(`⚠️ Missing Chatwoot config for brokerage ${followUp.brokerage_id}, skipping`);
          continue;
        }

        const chatwootUrl = brokerage.chatwoot_url.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
        const accountId = brokerage.chatwoot_account_id;
        const token = brokerage.chatwoot_token;

        // 3. Check if client responded since follow-up was created
        const messagesUrl = `${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${followUp.chatwoot_conversation_id}/messages`;
        const messagesResponse = await fetch(messagesUrl, {
          headers: {
            "api_access_token": token,
            "Content-Type": "application/json",
          },
        });

        if (!messagesResponse.ok) {
          console.error(`❌ Failed to fetch Chatwoot messages for conv ${followUp.chatwoot_conversation_id}: ${messagesResponse.status}`);
          continue;
        }

        const messagesData = await messagesResponse.json();
        const messages = messagesData?.payload || [];

        // Check for incoming messages after follow-up creation
        const followUpCreatedAt = new Date(followUp.created_at).getTime() / 1000;
        const hasClientResponse = messages.some(
          (msg: any) => msg.message_type === 0 && msg.created_at > followUpCreatedAt
        );

        if (hasClientResponse) {
          // Client responded — mark as responded
          await supabase
            .from("ai_follow_ups")
            .update({ status: "responded", updated_at: new Date().toISOString() })
            .eq("id", followUp.id);

          console.log(`✅ Follow-up ${followUp.id}: client responded`);
          responded++;
          processed++;
          continue;
        }

        // 4. Client hasn't responded
        if (followUp.attempt_count >= followUp.max_attempts) {
          // Exhausted all attempts
          await supabase
            .from("ai_follow_ups")
            .update({ status: "exhausted", updated_at: new Date().toISOString() })
            .eq("id", followUp.id);

          // Disable AI for this client
          const clientId = followUp.deal?.client_id;
          if (clientId) {
            await supabase
              .from("clientes")
              .update({ ai_enabled: false })
              .eq("id", clientId);
          }

          // Log event on deal
          await supabase.from("crm_deal_events").insert({
            deal_id: followUp.deal_id,
            event_type: "ai_followup_exhausted",
            source: "system",
            new_value: `Follow-up expirado após ${followUp.max_attempts} tentativas sem resposta. IA desativada.`,
          });

          console.log(`🛑 Follow-up ${followUp.id}: exhausted, AI disabled for client ${clientId}`);
          exhausted++;
          processed++;
          continue;
        }

        // 5. Send follow-up message via Chatwoot
        const clientName = followUp.deal?.client?.name || "cliente";
        const templateIndex = Math.min(followUp.attempt_count, FOLLOW_UP_TEMPLATES.length - 1);
        const message = (followUp.follow_up_message || FOLLOW_UP_TEMPLATES[templateIndex])
          .replace("{nome}", clientName);

        const sendUrl = `${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${followUp.chatwoot_conversation_id}/messages`;
        const sendResponse = await fetch(sendUrl, {
          method: "POST",
          headers: {
            "api_access_token": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: message,
            message_type: "outgoing",
            private: false,
          }),
        });

        if (!sendResponse.ok) {
          console.error(`❌ Failed to send follow-up for conv ${followUp.chatwoot_conversation_id}: ${sendResponse.status}`);
          continue;
        }

        // 6. Update follow-up: increment attempt, set next check time
        const nextCheckAt = new Date(Date.now() + followUp.interval_minutes * 60 * 1000).toISOString();
        await supabase
          .from("ai_follow_ups")
          .update({
            attempt_count: followUp.attempt_count + 1,
            next_check_at: nextCheckAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", followUp.id);

        // Log event on deal
        await supabase.from("crm_deal_events").insert({
          deal_id: followUp.deal_id,
          event_type: "ai_followup_sent",
          source: "system",
          new_value: `Follow-up #${followUp.attempt_count + 1} enviado: "${message}"`,
        });

        console.log(`📤 Follow-up ${followUp.id}: sent attempt ${followUp.attempt_count + 1}/${followUp.max_attempts}`);
        processed++;
      } catch (itemError) {
        console.error(`❌ Error processing follow-up ${followUp.id}:`, itemError);
      }
    }

    console.log(`✅ Done: ${processed} processed, ${responded} responded, ${exhausted} exhausted`);

    return new Response(
      JSON.stringify({ processed, responded, exhausted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ check-followups error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
