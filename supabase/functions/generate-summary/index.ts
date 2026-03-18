import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { resolveUserModel } from "../_shared/model-resolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { scope = "day", focus = "general", forceRefresh = false } = await req.json().catch(() => ({}));
    const today = new Date().toISOString().split("T")[0];

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache (unless force refresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("ai_summaries")
        .select("content, created_at")
        .eq("user_id", user.id)
        .eq("scope", scope)
        .eq("focus", focus)
        .eq("summary_date", today)
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({ content: cached.content, created_at: cached.created_at, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Gather data context
    console.log(`[SUMMARY] Gathering data for user ${user.id}, scope=${scope}, focus=${focus}`);
    const context = await gatherContext(supabase, user.id, scope, focus);

    // Resolve user's configured model and API key
    const resolved = await resolveUserModel(supabase, user.id);
    const effectiveApiKey = resolved.apiKey || apiKey;
    if (!effectiveApiKey) {
      return new Response(
        JSON.stringify({ error: "Nenhuma API Key configurada. Configure na tela de Automação IA ou adicione LOVABLE_API_KEY." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call AI
    const summary = await callAI(effectiveApiKey, context, scope, focus, resolved.model);

    // Save to cache (upsert)
    await supabase.from("ai_summaries").upsert(
      {
        user_id: user.id,
        scope,
        focus,
        content: summary,
        summary_date: today,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,scope,focus,summary_date" }
    );

    return new Response(
      JSON.stringify({ content: summary, created_at: new Date().toISOString(), cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SUMMARY] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function gatherContext(
  supabase: any,
  userId: string,
  scope: string,
  focus: string
): Promise<string> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Calculate date range based on scope
  let startDate = today;
  if (scope === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    startDate = d.toISOString().split("T")[0];
  } else if (scope === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    startDate = d.toISOString().split("T")[0];
  }

  const parts: string[] = [];

  // Financial data
  if (focus === "general" || focus === "finance") {
    // Bank balances
    const { data: banks } = await supabase
      .from("bank_accounts")
      .select("bank_name, current_balance, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (banks?.length) {
      const totalBalance = banks.reduce((s: number, b: any) => s + Number(b.current_balance), 0);
      parts.push(
        `<financeiro>\nSaldo total: R$ ${totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\nContas: ${banks.map((b: any) => `${b.bank_name}: R$ ${Number(b.current_balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`).join(", ")}\n</financeiro>`
      );
    }

    // Transactions (receivables/payables due soon)
    const { data: transactions } = await supabase
      .from("financial_transactions")
      .select("description, total_amount, type, due_date, is_confirmed, status")
      .eq("user_id", userId)
      .gte("due_date", today)
      .lte("due_date", new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0])
      .eq("is_confirmed", false)
      .limit(20);

    if (transactions?.length) {
      const receivables = transactions.filter((t: any) => t.type === "receita");
      const payables = transactions.filter((t: any) => t.type === "despesa");
      parts.push(
        `<contas_pendentes>\nA receber (próx 7 dias): ${receivables.length} transações, total R$ ${receivables.reduce((s: number, t: any) => s + Math.abs(Number(t.total_amount || 0)), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\nA pagar (próx 7 dias): ${payables.length} transações, total R$ ${payables.reduce((s: number, t: any) => s + Math.abs(Number(t.total_amount || 0)), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n</contas_pendentes>`
      );
    }
  }

  // Policies / Sales
  if (focus === "general" || focus === "crm") {
    // Expiring policies
    const endRange = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];
    const { data: expiring } = await supabase
      .from("apolices")
      .select("id, expiration_date, premium_value, status, renewal_status")
      .eq("user_id", userId)
      .gte("expiration_date", today)
      .lte("expiration_date", endRange)
      .in("status", ["Ativa", "Aguardando Apólice"]);

    if (expiring?.length) {
      const urgentRenewals = expiring.filter((p: any) => !p.renewal_status || p.renewal_status === "pending");
      parts.push(
        `<apolices_vencendo>\n${expiring.length} apólices vencem nos próximos 7 dias.\n${urgentRenewals.length} ainda sem renovação iniciada.\nValor total em prêmio: R$ ${expiring.reduce((s: number, p: any) => s + Number(p.premium_value), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n</apolices_vencendo>`
      );
    }

    // New policies in period
    const { count: newPolicies } = await supabase
      .from("apolices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startDate);

    // Total active clients
    const { count: activeClients } = await supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "Ativo");

    parts.push(
      `<vendas>\nNovas apólices no período (${scope}): ${newPolicies || 0}\nClientes ativos: ${activeClients || 0}\n</vendas>`
    );
  }

  // Agenda
  if (focus === "general" || focus === "crm") {
    const { data: appointments } = await supabase
      .from("appointments")
      .select("title, date, time, status, priority")
      .eq("user_id", userId)
      .eq("date", today)
      .neq("status", "Cancelado")
      .order("time", { ascending: true })
      .limit(10);

    if (appointments?.length) {
      parts.push(
        `<agenda_hoje>\n${appointments.length} compromissos hoje:\n${appointments.map((a: any) => `- ${a.time?.substring(0, 5)} ${a.title} (${a.priority || "Normal"})`).join("\n")}\n</agenda_hoje>`
      );
    } else {
      parts.push(`<agenda_hoje>\nNenhum compromisso agendado para hoje.\n</agenda_hoje>`);
    }
  }

  return parts.join("\n\n") || "Sem dados disponíveis para análise.";
}

async function callAI(apiKey: string, context: string, scope: string, focus: string, model: string = "google/gemini-2.5-flash"): Promise<string> {
  console.log(`[SUMMARY] Using model: ${model}, key prefix: ${apiKey.substring(0, 6)}...`);

  const scopeLabel = scope === "day" ? "do dia" : scope === "week" ? "da semana" : "do mês";
  const focusLabel =
    focus === "finance" ? "financeiro" : focus === "crm" ? "de vendas e CRM" : "geral da operação";

  const systemPrompt = `Você é o Assistente Estratégico de um CEO de corretora de seguros.

REGRAS ABSOLUTAS:
- Vá DIRETO ao ponto. Sem saudações. Sem "Olá".
- Máximo 3-4 frases objetivas.
- Destaque números, valores e prazos críticos.
- Use tom executivo: "Faturamento acima da média." / "2 apólices vencem hoje sem renovação."
- Se não houver dados, diga apenas: "Sem dados suficientes para análise no período."
- Priorize alertas (vencimentos, inadimplência) sobre métricas positivas.
- NUNCA invente dados. Use APENAS o que está no contexto fornecido.`;

  const userPrompt = `Analise os dados ${scopeLabel} com foco ${focusLabel} e gere um resumo executivo:\n\n${context}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[SUMMARY] AI Gateway error:", response.status, errText);

    if (response.status === 401) {
      throw new Error("LOVABLE_API_KEY inválida ou expirada. Atualize o segredo nas Edge Function secrets.");
    }

    if (response.status === 402) {
      throw new Error("Lovable AI sem créditos (402). Adicione créditos no workspace.");
    }

    if (response.status === 429) {
      throw new Error("Limite de requisições do Lovable AI atingido (429). Tente novamente em instantes.");
    }

    throw new Error("Falha ao gerar resumo com IA");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sem resumo disponível.";
}
