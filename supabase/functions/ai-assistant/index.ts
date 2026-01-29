import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Redis } from "https://esm.sh/@upstash/redis@1.31.5";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@1.1.3";

// --- Configuração do Rate Limiter ---
const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "15 s"), // 10 requisições a cada 15 segundos
  analytics: true,
  prefix: "@upstash/ratelimit",
});
// ------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_SYSTEM_PROMPT = `Você é o Assistente Tork, um assistente virtual especializado em ajudar corretores de seguros a gerenciar sua carteira de clientes e apólices. 

Você tem acesso às seguintes ferramentas:
- search_clients: Buscar clientes por nome, CPF/CNPJ, email ou telefone
- search_policies: Buscar apólices por número, cliente, seguradora ou status
- get_financial_summary: Obter resumo financeiro de transações
- analyze_renewals: Analisar apólices próximas ao vencimento
- create_appointment: Criar agendamentos com clientes
- search_claims: Buscar sinistros registrados
- generate_report: Gerar relatórios estruturados

Você deve:
1. Responder em português brasileiro de forma clara e profissional
2. Usar as ferramentas disponíveis para buscar informações atualizadas
3. Fornecer insights relevantes baseados nos dados
4. Sugerir ações quando apropriado
5. Ser proativo em identificar oportunidades e riscos

Sempre que o usuário fizer uma pergunta, analise se precisa usar alguma ferramenta para obter dados atualizados antes de responder.`;

async function buildSystemPrompt(supabase: any, userId: string): Promise<string> {
  try {
    // Buscar padrões aprendidos com alta confiança (timeout de 5s para não bloquear)
    const { data: patterns, error } = await supabase
      .from('ai_learned_patterns')
      .select('pattern_type, pattern_data, confidence_score')
      .eq('user_id', userId)
      .gte('confidence_score', 0.7)
      .order('confidence_score', { ascending: false })
      .abortSignal(AbortSignal.timeout(5000));

    if (error || !patterns || patterns.length === 0) {
      console.log(`[CONTEXT-BUILD] User: ${userId} | No patterns found, using base prompt`);
      return BASE_SYSTEM_PROMPT;
    }

    console.log(`[CONTEXT-BUILD] User: ${userId} | Found ${patterns.length} learned patterns`);

    // Construir contexto aprendido
    const learnedContext = patterns.map((p: { pattern_type: string; pattern_data: any; confidence_score: number }) => 
      `- ${p.pattern_type}: ${JSON.stringify(p.pattern_data)} (confiança: ${(p.confidence_score * 100).toFixed(0)}%)`
    ).join('\n');

    return `${BASE_SYSTEM_PROMPT}

<contexto_aprendido>
Informações personalizadas sobre este usuário baseadas em interações anteriores:
${learnedContext}

Use este contexto para personalizar suas respostas e antecipar as necessidades do usuário.
</contexto_aprendido>`;
  } catch (error) {
    console.warn('[CONTEXT-FALLBACK] Erro ao buscar padrões de aprendizado, usando prompt base:', error);
    return BASE_SYSTEM_PROMPT;
  }
}

// ========== DEFINIÇÃO DE FERRAMENTAS (FASE 4B - SINCRONIZADO COM SCHEMA) ==========
const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Busca clientes no banco de dados por nome, CPF/CNPJ, email ou telefone. Use para encontrar clientes existentes.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca (nome, CPF/CNPJ, email ou telefone)" },
          status: { type: "string", enum: ["Ativo", "Inativo"], description: "Filtra clientes pelo status" },
          limit: { type: "number", description: "Número máximo de resultados (máx 50, padrão 10)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_client_details",
      description: "Obtém detalhes completos de um cliente específico, incluindo suas apólices ativas.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "ID único do cliente (UUID)" }
        },
        required: ["client_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_policies",
      description: "Busca apólices de seguro por cliente, status ou ramo.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "ID do cliente para filtrar apólices" },
          status: { type: "string", enum: ["Ativa", "Cancelada", "Vencida", "Renovada", "Orçamento", "Aguardando Apólice"], description: "Status da apólice" },
          ramo: { type: "string", description: "Nome ou parte do nome do ramo de seguro" },
          limit: { type: "number", description: "Número máximo de resultados (padrão 10)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_expiring_policies",
      description: "Retorna apólices que estão próximas do vencimento. Essencial para gestão de renovações.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Número de dias à frente para verificar vencimentos (padrão 30)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Retorna um resumo financeiro com receitas, despesas e saldo líquido do período.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Data inicial no formato AAAA-MM-DD (padrão: início do mês)" },
          end_date: { type: "string", description: "Data final no formato AAAA-MM-DD (padrão: hoje)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_claims",
      description: "Busca sinistros registrados no sistema.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["Aberto", "Em Análise", "Aprovado", "Negado", "Fechado"], description: "Status do sinistro" },
          policy_id: { type: "string", description: "ID da apólice para filtrar sinistros" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description: "Retorna tarefas do usuário, opcionalmente filtradas por status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["Pendente", "Em Andamento", "Concluída"], description: "Status da tarefa" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_appointments",
      description: "Retorna agendamentos do usuário para uma data específica.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data no formato AAAA-MM-DD (padrão: hoje)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_appointment",
      description: "Cria um novo agendamento com um cliente.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "ID do cliente (UUID)" },
          title: { type: "string", description: "Título do agendamento" },
          date: { type: "string", description: "Data no formato AAAA-MM-DD" },
          time: { type: "string", description: "Hora no formato HH:MM" },
          notes: { type: "string", description: "Notas ou observações adicionais" }
        },
        required: ["title", "date", "time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_report",
      description: "Gera relatórios estruturados sobre diferentes aspectos do negócio.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["financial", "renewals", "clients", "commissions"], description: "Tipo do relatório" },
          period: { type: "string", enum: ["current-month", "last-month", "current-year"], description: "Período do relatório" },
          format: { type: "string", enum: ["json", "summary"], description: "Formato: 'json' para dados, 'summary' para texto" }
        },
        required: ["type", "period"]
      }
    }
  }
];

// ========== DISPATCHER DE HANDLERS (FASE 4B - RLS ENFORCED) ==========
const toolHandlers: Record<string, (args: any, supabase: any, userId: string) => Promise<any>> = {
  
  // --- CLIENTES ---
  search_clients: async (args, supabase, userId) => {
    const { query, status, limit = 10 } = args;
    let qb = supabase
      .from('clientes')
      .select('id, name, cpf_cnpj, email, phone, status')
      .eq('user_id', userId)
      .limit(Math.min(limit, 50));

    if (query) {
      qb = qb.or(`name.ilike.%${query}%,cpf_cnpj.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    }
    if (status) {
      qb = qb.eq('status', status);
    }

    const { data, error } = await qb;
    if (error) throw error;
    return { success: true, count: data.length, clients: data };
  },

  get_client_details: async (args, supabase, userId) => {
    const { client_id } = args;
    
    // Buscar cliente com RLS enforced
    const { data: client, error: clientError } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', client_id)
      .eq('user_id', userId)
      .single();

    if (clientError) throw clientError;
    if (!client) throw new Error('Cliente não encontrado');

    // Buscar apólices do cliente
    const { data: policies, error: policiesError } = await supabase
      .from('apolices')
      .select(`
        id, 
        policy_number, 
        status, 
        premium_value, 
        commission_rate,
        start_date, 
        expiration_date,
        ramos(nome),
        companies(name)
      `)
      .eq('client_id', client_id)
      .eq('user_id', userId)
      .order('expiration_date', { ascending: false });

    if (policiesError) throw policiesError;

    return { success: true, client, policies: policies || [] };
  },

  // --- APÓLICES ---
  search_policies: async (args, supabase, userId) => {
    const { client_id, status, ramo, limit = 10 } = args;
    
    let qb = supabase
      .from('apolices')
      .select(`
        id, 
        policy_number, 
        client_id, 
        status, 
        premium_value,
        commission_rate,
        start_date, 
        expiration_date,
        ramos(nome),
        companies(name),
        clientes(name)
      `)
      .eq('user_id', userId)
      .limit(limit);

    if (client_id) qb = qb.eq('client_id', client_id);
    if (status) qb = qb.eq('status', status);
    if (ramo) {
      // Buscar ramo_id pelo nome
      const { data: ramoData } = await supabase
        .from('ramos')
        .select('id')
        .ilike('nome', `%${ramo}%`)
        .eq('user_id', userId)
        .limit(1);
      
      if (ramoData?.length > 0) {
        qb = qb.eq('ramo_id', ramoData[0].id);
      }
    }

    const { data, error } = await qb;
    if (error) throw error;
    return { success: true, count: data.length, policies: data };
  },

  get_expiring_policies: async (args, supabase, userId) => {
    const { days = 30 } = args;
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('apolices')
      .select(`
        id, 
        policy_number, 
        client_id, 
        status, 
        premium_value,
        expiration_date,
        renewal_status,
        ramos(nome),
        companies(name),
        clientes(name, phone, email)
      `)
      .eq('user_id', userId)
      .eq('status', 'Ativa')
      .gte('expiration_date', today)
      .lte('expiration_date', futureDate)
      .order('expiration_date', { ascending: true });

    if (error) throw error;
    return { success: true, count: data.length, days_ahead: days, policies: data };
  },

  // --- FINANCEIRO ---
  get_financial_summary: async (args, supabase, userId) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startDate = args.start_date || startOfMonth.toISOString().split('T')[0];
    const endDate = args.end_date || today.toISOString().split('T')[0];

    // Buscar transações do ledger com joins para contas
    const { data: transactions, error } = await supabase
      .from('financial_transactions')
      .select(`
        id,
        description,
        transaction_date,
        is_void,
        financial_ledger(
          amount,
          financial_accounts(type, name)
        )
      `)
      .eq('user_id', userId)
      .eq('is_void', false)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (error) throw error;

    // Calcular resumo baseado no ledger
    let totalIncome = 0;
    let totalExpense = 0;

    transactions?.forEach((t: any) => {
      t.financial_ledger?.forEach((entry: any) => {
        const accountType = entry.financial_accounts?.type;
        const amount = Number(entry.amount);
        
        // Receitas são créditos em contas de revenue (negativo no ledger)
        if (accountType === 'revenue') {
          totalIncome += Math.abs(amount);
        }
        // Despesas são débitos em contas de expense (positivo no ledger)
        if (accountType === 'expense') {
          totalExpense += Math.abs(amount);
        }
      });
    });

    return { 
      success: true, 
      period: { start: startDate, end: endDate },
      total_income: totalIncome,
      total_expenses: totalExpense,
      net_balance: totalIncome - totalExpense,
      transaction_count: transactions?.length || 0
    };
  },

  // --- SINISTROS ---
  search_claims: async (args, supabase, userId) => {
    const { status, policy_id } = args;
    
    let qb = supabase
      .from('sinistros')
      .select(`
        id, 
        claim_number, 
        status, 
        occurrence_date,
        claim_type,
        estimated_value,
        apolices(policy_number, clientes(name))
      `)
      .eq('user_id', userId);

    if (status) qb = qb.eq('status', status);
    if (policy_id) qb = qb.eq('policy_id', policy_id);

    const { data, error } = await qb;
    if (error) throw error;
    return { success: true, count: data.length, claims: data };
  },

  // --- TAREFAS ---
  get_tasks: async (args, supabase, userId) => {
    let qb = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (args.status) qb = qb.eq('status', args.status);

    const { data, error } = await qb;
    if (error) throw error;
    return { success: true, count: data.length, tasks: data };
  },

  // --- AGENDAMENTOS ---
  get_appointments: async (args, supabase, userId) => {
    const date = args.date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        date,
        time,
        status,
        notes,
        clientes(name, phone)
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .order('time', { ascending: true });

    if (error) throw error;
    return { success: true, date, count: data.length, appointments: data };
  },

  create_appointment: async (args, supabase, userId) => {
    const { client_id, title, date, time, notes } = args;

    const insertData: any = {
      user_id: userId,
      title,
      date,
      time,
      notes: notes || '',
      status: 'Pendente'
    };

    // client_id é opcional
    if (client_id) {
      // Verificar se o cliente pertence ao usuário
      const { data: clientCheck, error: clientError } = await supabase
        .from('clientes')
        .select('id')
        .eq('id', client_id)
        .eq('user_id', userId)
        .single();

      if (clientError || !clientCheck) {
        throw new Error('Cliente não encontrado ou não pertence a você');
      }
      insertData.client_id = client_id;
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, appointment: data };
  },

  // --- RELATÓRIOS ---
  generate_report: async (args, supabase, userId) => {
    const { type, period, format = 'summary' } = args;
    
    const today = new Date();
    let startDate: Date;

    switch (period) {
      case 'last-month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        break;
      case 'current-year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default: // current-month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    if (type === 'renewals') {
      const futureDate = new Date(Date.now() + 30 * 86400000);
      
      const { data, error } = await supabase
        .from('apolices')
        .select(`
          policy_number, 
          expiration_date, 
          premium_value, 
          status,
          clientes(name, phone)
        `)
        .eq('user_id', userId)
        .eq('status', 'Ativa')
        .gte('expiration_date', today.toISOString())
        .lte('expiration_date', futureDate.toISOString())
        .order('expiration_date', { ascending: true });

      if (error) throw error;

      if (format === 'summary') {
        const totalPremium = data.reduce((sum: number, p: any) => sum + Number(p.premium_value || 0), 0);
        return {
          success: true,
          type: 'renewals',
          summary: `Relatório de Renovações: ${data.length} apólices vencem nos próximos 30 dias. Prêmio total: R$ ${totalPremium.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
        };
      }
      return { success: true, type: 'renewals', data };
    }

    if (type === 'financial' || type === 'commissions') {
      // Reutilizar lógica do get_financial_summary
      const result = await toolHandlers.get_financial_summary({ 
        start_date: startDate.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      }, supabase, userId);

      if (format === 'summary') {
        return {
          success: true,
          type: 'financial',
          summary: `Relatório Financeiro (${period}): Receitas: R$ ${result.total_income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Despesas: R$ ${result.total_expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Saldo: R$ ${result.net_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
        };
      }
      return { success: true, type: 'financial', data: result };
    }

    if (type === 'clients') {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, name, email, phone, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (format === 'summary') {
        const totalAtivos = data.filter((c: any) => c.status === 'Ativo').length;
        return {
          success: true,
          type: 'clients',
          summary: `Relatório de Clientes: ${data.length} cadastrados. Ativos: ${totalAtivos}. Inativos: ${data.length - totalAtivos}.`
        };
      }
      return { success: true, type: 'clients', data };
    }

    return { success: false, error: `Tipo de relatório '${type}' não implementado.` };
  }
};

// ========== EXECUTOR DE TOOLS (DISPATCHER PATTERN) ==========
async function executeToolCall(toolCall: any, supabase: any, userId: string) {
  const { name, arguments: argsStr } = toolCall.function;
  const args = JSON.parse(argsStr);
  
  console.log(`[TOOL-EXEC-START] ${name}`, JSON.stringify(args, null, 2));
  const startTime = Date.now();

  try {
    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Tool '${name}' não implementada`);
    }

    const result = await handler(args, supabase, userId);
    const duration = Date.now() - startTime;
    
    console.log(`[TOOL-EXEC-SUCCESS] ${name} | Duration: ${duration}ms`);
    return { tool_call_id: toolCall.id, output: JSON.stringify(result) };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[TOOL-EXEC-ERROR] ${name} | Duration: ${duration}ms | Error: ${error.message}`);
    return { tool_call_id: toolCall.id, output: JSON.stringify({ success: false, error: error.message }) };
  }
}

serve(async (req) => {
  // ========== 1. ENTRADA DA REQUISIÇÃO ==========
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[AI-ASSISTANT] REQUEST START`);
  console.log(`[REQ-META] Method: ${req.method} | URL: ${req.url}`);
  console.log(`[REQ-HEADERS] ${JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2)}`);

  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Preflight request handled`);
    return new Response(null, { headers: corsHeaders });
  }

  // Controller para timeout global de 30s
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const requestStartTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    // ========== 2. PROCESSAMENTO DO BODY ==========
    const rawBody = await req.text();
    console.log(`[REQ-BODY-RAW] ${rawBody.substring(0, 500)}${rawBody.length > 500 ? '...(truncated)' : ''}`);
    
    const { messages, userId, conversationId } = JSON.parse(rawBody);
    
    console.log(`[REQ-PARSED] Request ID: ${requestId}`);
    console.log(`[REQ-PARSED] User ID: ${userId}`);
    console.log(`[REQ-PARSED] Conversation ID: ${conversationId || 'NEW'}`);
    console.log(`[REQ-PARSED] Messages count: ${messages?.length || 0}`);
    if (messages?.length > 0) {
      console.log(`[REQ-MESSAGES] Last message role: ${messages[messages.length - 1]?.role}`);
      console.log(`[REQ-MESSAGES] Last message preview: ${messages[messages.length - 1]?.content?.substring(0, 100)}...`);
    }

    // ========== 3. RATE LIMITING ==========
    console.log(`[RATE-LIMIT] Checking for identifier: ${userId || 'anonymous'}`);
    const identifier = userId || req.headers.get("x-forwarded-for") || 'anon';
    const rateLimitStart = Date.now();
    const { success, remaining, limit } = await ratelimit.limit(identifier);
    console.log(`[RATE-LIMIT] Duration: ${Date.now() - rateLimitStart}ms | Success: ${success} | Remaining: ${remaining}/${limit}`);

    if (!success) {
      console.warn(`[RATE-LIMIT-EXCEEDED] User: ${userId} | Identifier: ${identifier}`);
      clearTimeout(timeoutId);
      return new Response(JSON.stringify({ 
        error: "Limite de requisições excedido. Tente novamente em alguns segundos.",
        code: 'RATE_LIMIT_EXCEEDED'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ========== 4. VALIDAÇÃO ==========
    if (!userId) {
      console.error(`[VALIDATION-ERROR] userId is required but was not provided`);
      clearTimeout(timeoutId);
      throw new Error('userId é obrigatório');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    console.log(`[CONFIG] LOVABLE_API_KEY present: ${!!LOVABLE_API_KEY} | Prefix: ${LOVABLE_API_KEY?.substring(0, 8)}...`);
    
    if (!LOVABLE_API_KEY) {
      console.error('[CONFIG-ERROR] LOVABLE_API_KEY não configurada');
      clearTimeout(timeoutId);
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // ========== 5. SUPABASE CLIENT ==========
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log(`[SUPABASE] URL: ${supabaseUrl?.substring(0, 30)}...`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== 6. SYSTEM PROMPT BUILD ==========
    console.log(`[PROMPT-BUILD] Starting system prompt construction for user: ${userId}`);
    const startBuild = Date.now();
    const systemPrompt = await buildSystemPrompt(supabase, userId);
    const promptDuration = Date.now() - startBuild;
    console.log(`[PROMPT-BUILD] Duration: ${promptDuration}ms`);
    console.log(`[PROMPT-BUILD] Prompt length: ${systemPrompt.length} chars`);
    console.log(`[PROMPT-BUILD] Preview: ${systemPrompt.substring(0, 200)}...`);
    console.log(`[PROMPT-BUILD] Has learned context: ${systemPrompt.includes('<contexto_aprendido>')}`);

    // ========== 7. PREPARAÇÃO DA CHAMADA À IA ==========
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    console.log(`[AI-PREP] Total messages to send: ${aiMessages.length}`);
    aiMessages.forEach((msg: { role: string; content?: string }, idx: number) => {
      console.log(`[AI-PREP] Message ${idx}: role=${msg.role}, content_length=${msg.content?.length || 0}`);
    });

    const aiRequestBody = {
      model: 'google/gemini-2.5-flash',
      messages: aiMessages,
      tools: TOOLS,
      tool_choice: 'auto',
    };

    console.log(`[AI-GATEWAY] Calling Lovable AI Gateway...`);
    console.log(`[AI-GATEWAY] Model: ${aiRequestBody.model}`);
    console.log(`[AI-GATEWAY] Tools count: ${TOOLS.length}`);

    // ========== 8. CHAMADA À IA ==========
    const startAI = Date.now();
    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiRequestBody),
      signal: controller.signal,
    });

    const aiResponseDuration = Date.now() - startAI;
    console.log(`[AI-GATEWAY] Response received in ${aiResponseDuration}ms`);
    console.log(`[AI-GATEWAY] Status: ${response.status} ${response.statusText}`);
    console.log(`[AI-GATEWAY] Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

    // ========== 9. TRATAMENTO DE ERROS DO GATEWAY ==========
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${'='.repeat(60)}`);
      console.error(`[AI-GATEWAY-ERROR] === GATEWAY ERROR DETAILS ===`);
      console.error(`[AI-GATEWAY-ERROR] Status: ${response.status}`);
      console.error(`[AI-GATEWAY-ERROR] Status Text: ${response.statusText}`);
      console.error(`[AI-GATEWAY-ERROR] Response Body: ${errorText}`);
      console.error(`[AI-GATEWAY-ERROR] Request ID: ${requestId}`);
      console.error(`[AI-GATEWAY-ERROR] User ID: ${userId}`);
      console.error(`${'='.repeat(60)}`);
      
      clearTimeout(timeoutId);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Limite de requisições da IA excedido. Aguarde alguns segundos.",
          code: 'AI_RATE_LIMIT'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Créditos de IA esgotados. Entre em contato com o suporte.",
          code: 'AI_CREDITS_EXHAUSTED'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`AI Gateway falhou com status ${response.status}`);
    }

    let result = await response.json();
    console.log(`[AI-RESPONSE] First response parsed successfully`);
    console.log(`[AI-RESPONSE] Has tool_calls: ${!!result.choices?.[0]?.message?.tool_calls}`);
    console.log(`[AI-RESPONSE] Finish reason: ${result.choices?.[0]?.finish_reason}`);

    // ========== 10. LOOP DE TOOL CALLS ==========
    let toolIterations = 0;
    const maxToolIterations = 5;
    let currentMessages = [...aiMessages];
    
    while (result.choices[0].message.tool_calls && toolIterations < maxToolIterations) {
      toolIterations++;
      const toolCalls = result.choices[0].message.tool_calls;
      
      console.log(`${'─'.repeat(40)}`);
      console.log(`[TOOL-LOOP] Iteration ${toolIterations}/${maxToolIterations}`);
      console.log(`[TOOL-LOOP] Tools requested: ${toolCalls.length}`);
      toolCalls.forEach((tc: { function: { name: string; arguments: string } }, idx: number) => {
        console.log(`[TOOL-LOOP] Tool ${idx + 1}: ${tc.function.name} | Args: ${tc.function.arguments}`);
      });

      // Adicionar a mensagem da IA com tool calls ao histórico
      currentMessages.push(result.choices[0].message);

      // Executar todas as tool calls
      for (const toolCall of toolCalls) {
        const toolStart = Date.now();
        console.log(`[TOOL-EXEC] Executing: ${toolCall.function.name}`);
        
        const toolResult = await executeToolCall(toolCall, supabase, userId);
        const toolDuration = Date.now() - toolStart;
        
        console.log(`[TOOL-EXEC] ${toolCall.function.name} completed in ${toolDuration}ms`);
        console.log(`[TOOL-EXEC] Result preview: ${toolResult.output.substring(0, 200)}...`);

        // Adicionar resultado da tool ao histórico
        currentMessages.push({
          role: 'tool',
          tool_call_id: toolResult.tool_call_id,
          content: toolResult.output
        });
      }

      // Chamar a IA novamente com os resultados das tools
      console.log(`[TOOL-LOOP] Calling AI with tool results...`);
      const toolLoopStart = Date.now();
      
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: currentMessages,
          tools: TOOLS,
          tool_choice: 'auto',
        }),
        signal: controller.signal,
      });

      console.log(`[TOOL-LOOP] AI response in ${Date.now() - toolLoopStart}ms | Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TOOL-LOOP-ERROR] Iteration ${toolIterations} failed`);
        console.error(`[TOOL-LOOP-ERROR] Status: ${response.status} | Body: ${errorText}`);
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      result = await response.json();
      console.log(`[TOOL-LOOP] Response has more tools: ${!!result.choices?.[0]?.message?.tool_calls}`);
    }

    if (toolIterations >= maxToolIterations) {
      console.warn(`[TOOL-LIMIT] Max iterations (${maxToolIterations}) reached - breaking loop`);
    }

    // ========== 11. RESPOSTA FINAL ==========
    clearTimeout(timeoutId);
    const assistantMessage = result.choices[0].message.content;
    const totalDuration = Date.now() - requestStartTime;

    console.log(`${'='.repeat(60)}`);
    console.log(`[AI-COMPLETE] Request ${requestId} completed successfully`);
    console.log(`[AI-COMPLETE] Total duration: ${totalDuration}ms`);
    console.log(`[AI-COMPLETE] Tool iterations: ${toolIterations}`);
    console.log(`[AI-COMPLETE] Response length: ${assistantMessage?.length || 0} chars`);
    console.log(`[AI-COMPLETE] Response preview: ${assistantMessage?.substring(0, 150)}...`);
    console.log(`${'='.repeat(60)}\n`);

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const totalDuration = Date.now() - requestStartTime;
    
    console.error(`${'='.repeat(60)}`);
    console.error(`[FATAL-ERROR] === UNHANDLED EXCEPTION ===`);
    console.error(`[FATAL-ERROR] Request ID: ${requestId}`);
    console.error(`[FATAL-ERROR] Duration before crash: ${totalDuration}ms`);
    console.error(`[FATAL-ERROR] Error class: ${error?.constructor?.name}`);
    console.error(`[FATAL-ERROR] Error name: ${error instanceof Error ? error.name : 'Unknown'}`);
    console.error(`[FATAL-ERROR] Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[FATAL-ERROR] Stack trace: ${error instanceof Error ? error.stack : 'No stack available'}`);
    console.error(`${'='.repeat(60)}`);
    
    // Tratamento específico de timeout
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[TIMEOUT-ERROR] Request aborted after 30s');
      return new Response(
        JSON.stringify({ 
          error: 'A requisição excedeu o tempo limite de 30 segundos. Tente uma pergunta mais simples.',
          code: 'TIMEOUT_ERROR',
          requestId
        }),
        {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido no processamento da IA',
        code: 'AI_PROCESSING_ERROR',
        requestId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
