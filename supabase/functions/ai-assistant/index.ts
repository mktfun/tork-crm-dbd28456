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
  limiter: Ratelimit.slidingWindow(10, "15 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ========== SYSTEM PROMPT HÍBRIDO (FASE 7 - HYBRID ARCHITECTURE) ==========
const BASE_SYSTEM_PROMPT = `<persona>
Você é o Assistente Tork, um especialista em gestão de seguros e CRM para a plataforma Tork.
Sua missão é ajudar corretores de seguros a gerenciar suas carteiras de forma eficiente e proativa.
Você é um guru de seguros, conhecedor de normas SUSEP e práticas do mercado.
</persona>

<rules>
  <rule priority="-1">
    Seja sempre direto e objetivo. Evite frases como "Com certeza!", "Claro!", "Sem problemas". Vá direto ao ponto.
  </rule>
  <rule priority="0">
    Execute as tools de forma proativa. Se a pergunta do usuário for clara e mapear para uma tool, execute-a sem pedir confirmação.
  </rule>
  <rule priority="1">
    Se tiver os parâmetros para uma tool, execute-a imediatamente. NUNCA peça permissão ou confirmação para consultar dados.
  </rule>
  <rule priority="2">
    NUNCA invente dados. Baseie suas respostas EXCLUSIVAMENTE nos dados retornados pelas ferramentas. Se os dados não estiverem lá, admita honestamente.
  </rule>
  <rule priority="3">
    Se a pergunta envolver "seguradoras", "companhias", "ramos" ou termos similares, você DEVE invocar get_companies ou get_ramos PRIMEIRO.
  </rule>
</rules>

<format_instruction>
Sua resposta DEVE seguir um formato híbrido:

1. **Texto em Markdown:** Para a parte explicativa e conversacional. Use para mostrar seu raciocínio quando relevante.

2. **JSON em Tag Especial:** Se sua resposta contiver dados estruturados (resultado de uma tool), você DEVE encapsular o objeto ou array JSON puro DENTRO de uma tag \`<data_json>\` no FINAL da sua resposta. O frontend irá extrair e renderizar isso com componentes visuais elegantes.

**TIPOS DE DATA_JSON SUPORTADOS:**
- \`type: "table"\` - Para listas genéricas (será renderizado como tabela)
- \`type: "company_list"\` - Para lista de seguradoras
- \`type: "ramo_list"\` - Para lista de ramos
- \`type: "financial_summary"\` - Para resumos financeiros
- \`type: "policy_list"\` - Para lista de apólices
- \`type: "expiring_policies"\` - Para apólices próximas do vencimento
- \`type: "client_list"\` - Para lista de clientes
- \`type: "client_details"\` - Para detalhes de um cliente específico

**Exemplo de Resposta CORRETA:**
Você tem 5 seguradoras cadastradas no sistema:

<data_json>
{
  "type": "company_list",
  "data": [
    { "name": "Porto Seguro" },
    { "name": "Bradesco Seguros" }
  ]
}
</data_json>

**IMPORTANTE:** A tag <data_json> deve conter JSON puro, não Markdown. Não repita dados em tabela Markdown se já vai enviar no JSON.
</format_instruction>

<tools_guide>
  <tool name="search_clients">
    <description>Busca clientes por nome, CPF/CNPJ, email ou telefone.</description>
  </tool>
  <tool name="get_client_details">
    <description>Obtém perfil completo do cliente com suas apólices.</description>
  </tool>
  <tool name="search_policies">
    <description>Busca apólices por cliente, status ou ramo.</description>
  </tool>
  <tool name="get_expiring_policies">
    <description>Busca apólices que vencem nos próximos X dias.</description>
  </tool>
  <tool name="get_financial_summary">
    <description>Retorna o resumo financeiro (receitas, despesas, saldo).</description>
  </tool>
  <tool name="search_claims">
    <description>Busca sinistros registrados no sistema.</description>
  </tool>
  <tool name="get_tasks">
    <description>Retorna tarefas pendentes do usuário.</description>
  </tool>
  <tool name="get_appointments">
    <description>Retorna a agenda do dia.</description>
  </tool>
  <tool name="create_appointment">
    <description>Cria um novo agendamento.</description>
  </tool>
  <tool name="generate_report">
    <description>Gera relatórios estruturados sobre finanças, renovações, clientes ou comissões.</description>
  </tool>
  <tool name="get_companies">
    <description>Lista todas as seguradoras cadastradas. Use para validar nomes antes de filtrar.</description>
  </tool>
  <tool name="get_ramos">
    <description>Lista todos os ramos de seguro disponíveis. Use para validar ramos antes de filtrar.</description>
  </tool>
</tools_guide>`;

// ========== RAG: RETRIEVE CONTEXT FROM KNOWLEDGE BASE (GEMINI EMBEDDINGS) ==========
async function retrieveContext(query: string, supabase: any): Promise<string> {
  try {
    // Use Google AI API key (Gemini)
    const geminiKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      console.log('[RAG] GOOGLE_AI_API_KEY not configured, skipping knowledge retrieval');
      return '';
    }

    // Generate embedding using Gemini text-embedding-004
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: query }] },
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: 768 // Match our vector column size
        }),
      }
    );

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('[RAG] Gemini Embedding API error:', embeddingResponse.status, errorText);
      return '';
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.embedding?.values;
    
    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.error('[RAG] No embedding returned from Gemini');
      return '';
    }

    console.log(`[RAG] Generated embedding with ${queryEmbedding.length} dimensions`);

    // Call the SQL function to find similar chunks
    const { data: results, error } = await supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: 0.70, // Slightly lower threshold for Gemini embeddings
      match_count: 5,
    });

    if (error) {
      console.error('[RAG] Knowledge search error:', error);
      return '';
    }

    if (!results || results.length === 0) {
      console.log('[RAG] No relevant knowledge found');
      return '';
    }

    console.log(`[RAG] Found ${results.length} relevant knowledge chunks`);
    
    // Format context for injection into prompt
    return results.map((r: any) => 
      `<context_chunk source="${r.metadata?.source || 'base_conhecimento'}" similarity="${r.similarity?.toFixed(2)}">${r.content}</context_chunk>`
    ).join('\n\n');
  } catch (error) {
    console.error('[RAG] Error retrieving context:', error);
    return '';
  }
}

async function buildSystemPrompt(supabase: any, userId: string, userMessage?: string): Promise<string> {
  let contextBlocks: string[] = [];
  
  // 1. Tentar recuperar contexto RAG se houver mensagem do usuário
  if (userMessage) {
    const ragContext = await retrieveContext(userMessage, supabase);
    if (ragContext) {
      contextBlocks.push(`<conhecimento_especializado>
${ragContext}
</conhecimento_especializado>`);
    }
  }
  
  // 2. Buscar padrões aprendidos do usuário
  try {
    const { data: patterns, error } = await supabase
      .from('ai_learned_patterns')
      .select('pattern_type, pattern_data, confidence_score')
      .eq('user_id', userId)
      .gte('confidence_score', 0.7)
      .order('confidence_score', { ascending: false })
      .abortSignal(AbortSignal.timeout(5000));

    if (!error && patterns && patterns.length > 0) {
      console.log(`[CONTEXT-BUILD] User: ${userId} | Found ${patterns.length} learned patterns`);
      
      const learnedContext = patterns.map((p: { pattern_type: string; pattern_data: any; confidence_score: number }) => 
        `  <${p.pattern_type}>${JSON.stringify(p.pattern_data)}</${p.pattern_type}>`
      ).join('\n');
      
      contextBlocks.push(`<contexto_aprendido>
${learnedContext}
</contexto_aprendido>`);
    } else {
      console.log(`[CONTEXT-BUILD] User: ${userId} | No patterns found`);
    }
  } catch (error) {
    console.warn('[CONTEXT-FALLBACK] Erro ao buscar padrões de aprendizado:', error);
  }

  // 3. Montar prompt final
  if (contextBlocks.length === 0) {
    return BASE_SYSTEM_PROMPT;
  }

  return `${BASE_SYSTEM_PROMPT}

${contextBlocks.join('\n\n')}`;
}

// ========== DEFINIÇÃO DE FERRAMENTAS ==========
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
  },
  {
    type: "function",
    function: {
      name: "get_companies",
      description: "Retorna a lista de todas as seguradoras cadastradas no sistema. Use para validar nomes de seguradoras ou listar opções disponíveis.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_ramos",
      description: "Retorna a lista de todos os ramos de seguro (Ex: Automóvel, Vida, Residencial) disponíveis no sistema.",
      parameters: { type: "object", properties: {} }
    }
  }
];

// ========== DISPATCHER DE HANDLERS (FASE 4B + 5 - EXACT COUNT) ==========
const toolHandlers: Record<string, (args: any, supabase: any, userId: string) => Promise<any>> = {
  
  // --- CLIENTES (COM CONTAGEM EXATA) ---
  search_clients: async (args, supabase, userId) => {
    const { query, status, limit = 10 } = args;
    let qb = supabase
      .from('clientes')
      .select('id, name, cpf_cnpj, email, phone, status', { count: 'exact' })
      .eq('user_id', userId)
      .limit(Math.min(limit, 50));

    if (query) {
      qb = qb.or(`name.ilike.%${query}%,cpf_cnpj.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    }
    if (status) {
      qb = qb.eq('status', status);
    }

    const { data, count, error } = await qb;
    if (error) throw error;
    return { success: true, total_count: count, returned_count: data.length, clients: data };
  },

  get_client_details: async (args, supabase, userId) => {
    const { client_id } = args;
    
    const { data: client, error: clientError } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', client_id)
      .eq('user_id', userId)
      .single();

    if (clientError) throw clientError;
    if (!client) throw new Error('Cliente não encontrado');

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
      `, { count: 'exact' })
      .eq('user_id', userId)
      .limit(limit);

    if (client_id) qb = qb.eq('client_id', client_id);
    if (status) qb = qb.eq('status', status);
    if (ramo) {
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

    const { data, count, error } = await qb;
    if (error) throw error;
    return { success: true, total_count: count, returned_count: data.length, policies: data };
  },

  get_expiring_policies: async (args, supabase, userId) => {
    const { days = 30 } = args;
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

    const { data, count, error } = await supabase
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
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'Ativa')
      .gte('expiration_date', today)
      .lte('expiration_date', futureDate)
      .order('expiration_date', { ascending: true });

    if (error) throw error;
    return { success: true, total_count: count, days_ahead: days, policies: data };
  },

  // --- FINANCEIRO ---
  get_financial_summary: async (args, supabase, userId) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startDate = args.start_date || startOfMonth.toISOString().split('T')[0];
    const endDate = args.end_date || today.toISOString().split('T')[0];

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

    let totalIncome = 0;
    let totalExpense = 0;

    transactions?.forEach((t: any) => {
      t.financial_ledger?.forEach((entry: any) => {
        const accountType = entry.financial_accounts?.type;
        const amount = Number(entry.amount);
        
        if (accountType === 'revenue') {
          totalIncome += Math.abs(amount);
        }
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
      `, { count: 'exact' })
      .eq('user_id', userId);

    if (status) qb = qb.eq('status', status);
    if (policy_id) qb = qb.eq('policy_id', policy_id);

    const { data, count, error } = await qb;
    if (error) throw error;
    return { success: true, total_count: count, claims: data };
  },

  // --- TAREFAS ---
  get_tasks: async (args, supabase, userId) => {
    let qb = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (args.status) qb = qb.eq('status', args.status);

    const { data, count, error } = await qb;
    if (error) throw error;
    return { success: true, total_count: count, tasks: data };
  },

  // --- AGENDAMENTOS ---
  get_appointments: async (args, supabase, userId) => {
    const date = args.date || new Date().toISOString().split('T')[0];
    
    const { data, count, error } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        date,
        time,
        status,
        notes,
        clientes(name, phone)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('date', date)
      .order('time', { ascending: true });

    if (error) throw error;
    return { success: true, date, total_count: count, appointments: data };
  },

  // --- DADOS MESTRES (FASE 4C) ---
  get_companies: async (args, supabase, userId) => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    console.log(`[TOOL] get_companies: Encontradas ${data?.length || 0} seguradoras`);
    return { success: true, count: data?.length || 0, companies: data || [] };
  },

  get_ramos: async (args, supabase, userId) => {
    const { data, error } = await supabase
      .from('ramos')
      .select('id, nome')
      .eq('user_id', userId)
      .order('nome', { ascending: true });

    if (error) throw error;
    console.log(`[TOOL] get_ramos: Encontrados ${data?.length || 0} ramos`);
    return { success: true, count: data?.length || 0, ramos: data || [] };
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

    if (client_id) {
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
      default:
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
        .select('id, name, email, phone, status, created_at', { count: 'exact' })
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

// ========== EXECUTOR DE TOOLS ==========
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

// ========== SSE HELPER ==========
function formatSSE(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

serve(async (req) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[AI-ASSISTANT] REQUEST START`);
  console.log(`[REQ-META] Method: ${req.method} | URL: ${req.url}`);
  console.log(`[SSE-DEBUG] Accept Header: ${req.headers.get('accept')}`);
  console.log(`[SSE-DEBUG] Content-Type Header: ${req.headers.get('content-type')}`);

  if (req.method === 'OPTIONS') {
    console.log(`[SSE-DEBUG] CORS preflight handled`);
    return new Response('ok', { headers: corsHeaders });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const requestStartTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const rawBody = await req.text();
    const { messages, userId, conversationId, stream = false } = JSON.parse(rawBody);
    
    console.log(`[REQ-PARSED] Request ID: ${requestId} | User: ${userId} | Stream: ${stream}`);

    // Rate Limiting
    const identifier = userId || req.headers.get("x-forwarded-for") || 'anon';
    const { success: rateLimitSuccess, remaining } = await ratelimit.limit(identifier);

    if (!rateLimitSuccess) {
      console.warn(`[RATE-LIMIT-EXCEEDED] User: ${userId}`);
      clearTimeout(timeoutId);
      return new Response(JSON.stringify({ 
        error: "Limite de requisições excedido. Tente novamente em alguns segundos.",
        code: 'RATE_LIMIT_EXCEEDED'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!userId) {
      clearTimeout(timeoutId);
      throw new Error('userId é obrigatório');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      clearTimeout(timeoutId);
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract last user message for RAG context
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
    
    // Build System Prompt with RAG context
    const systemPrompt = await buildSystemPrompt(supabase, userId, lastUserMessage);
    console.log(`[PROMPT-BUILD] Length: ${systemPrompt.length} | Has RAG: ${systemPrompt.includes('<conhecimento_especializado>')} | Has learned: ${systemPrompt.includes('<contexto_aprendido>')}`);

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // ========== STREAMING MODE ==========
    if (stream) {
      console.log(`[STREAM-MODE] Initiating SSE stream...`);
      
      // Primeiro, precisamos resolver tool calls antes de streamar
      let currentMessages = [...aiMessages];
      let toolIterations = 0;
      const maxToolIterations = 5;
      
      // Resolve tool calls first (não é possível streamar durante tool calls)
      let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI-GATEWAY-ERROR] ${response.status}: ${errorText}`);
        clearTimeout(timeoutId);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit da IA excedido.", code: 'AI_RATE_LIMIT' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados.", code: 'AI_CREDITS_EXHAUSTED' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      let result = await response.json();

      // Track tool calls for streaming events
      const executedTools: string[] = [];
      
      // Process tool calls
      while (result.choices[0].message.tool_calls && toolIterations < maxToolIterations) {
        toolIterations++;
        const toolCalls = result.choices[0].message.tool_calls;
        
        console.log(`[TOOL-LOOP] Iteration ${toolIterations}: ${toolCalls.length} tools`);
        currentMessages.push(result.choices[0].message);

        for (const toolCall of toolCalls) {
          executedTools.push(toolCall.function.name);
          const toolResult = await executeToolCall(toolCall, supabase, userId);
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolResult.tool_call_id,
            content: toolResult.output
          });
        }

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

        if (!response.ok) {
          throw new Error(`AI Gateway error: ${response.status}`);
        }
        result = await response.json();
      }

      // Agora fazemos a chamada final com streaming
      console.log(`[STREAM-MODE] Tool calls resolved, starting final stream...`);
      
      const streamResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: currentMessages,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!streamResponse.ok || !streamResponse.body) {
        const errText = await streamResponse.text();
        console.error(`[SSE-DEBUG] Stream response failed: ${streamResponse.status} | Body: ${errText}`);
        throw new Error(`Stream error: ${streamResponse.status}`);
      }

      clearTimeout(timeoutId);
      console.log(`[SSE-DEBUG] Stream response OK, piping to client...`);
      console.log(`[SSE-DEBUG] Gateway Content-Type: ${streamResponse.headers.get('content-type')}`);
      console.log(`[SSE-DEBUG] Executed tools to emit:`, executedTools);

      // Criar um ReadableStream customizado que injeta eventos de tool antes do stream
      const encoder = new TextEncoder();
      let hasStarted = false;

      const customStream = new ReadableStream({
        async start(controller) {
          // Primeiro, emitir eventos de tool_calls executadas
          for (const toolName of executedTools) {
            const toolStartEvent = formatSSE({
              choices: [{ delta: { tool_calls: [{ function: { name: toolName } }] } }]
            });
            controller.enqueue(encoder.encode(toolStartEvent));
            console.log(`[SSE-DEBUG] Emitindo tool_call event:`, toolName);
          }
          
          // Depois, emitir resultados das tools
          for (const toolName of executedTools) {
            const toolResultEvent = formatSSE({ tool_result: { name: toolName } });
            controller.enqueue(encoder.encode(toolResultEvent));
            console.log(`[SSE-DEBUG] Emitindo tool_result event:`, toolName);
          }
        },
        async pull(controller) {
          if (!hasStarted) {
            hasStarted = true;
            const reader = streamResponse.body!.getReader();
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  console.log(`[SSE-DEBUG] Stream finalizado com sinalizador [DONE]`);
                  controller.close();
                  break;
                }
                const decoded = new TextDecoder().decode(value);
                console.log(`[SSE-DEBUG] Chunk enfileirado (${value.byteLength} bytes):`, decoded.slice(0, 150));
                controller.enqueue(value);
              }
            } catch (err) {
              console.error(`[SSE-DEBUG] Stream error:`, err);
              controller.error(err);
            }
          }
        }
      });

      return new Response(customStream, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // ========== NON-STREAMING MODE (original behavior) ==========
    console.log(`[NON-STREAM] Processing request...`);
    
    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        tools: TOOLS,
        tool_choice: 'auto',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-GATEWAY-ERROR] ${response.status}: ${errorText}`);
      clearTimeout(timeoutId);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido.", code: 'AI_RATE_LIMIT' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados.", code: 'AI_CREDITS_EXHAUSTED' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    let result = await response.json();

    // Tool call loop
    let toolIterations = 0;
    const maxToolIterations = 5;
    let currentMessages = [...aiMessages];
    
    while (result.choices[0].message.tool_calls && toolIterations < maxToolIterations) {
      toolIterations++;
      const toolCalls = result.choices[0].message.tool_calls;
      
      console.log(`[TOOL-LOOP] Iteration ${toolIterations}: ${toolCalls.length} tools`);
      currentMessages.push(result.choices[0].message);

      for (const toolCall of toolCalls) {
        const toolResult = await executeToolCall(toolCall, supabase, userId);
        currentMessages.push({
          role: 'tool',
          tool_call_id: toolResult.tool_call_id,
          content: toolResult.output
        });
      }

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

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status}`);
      }
      result = await response.json();
    }

    clearTimeout(timeoutId);
    const assistantMessage = result.choices[0].message.content;
    const totalDuration = Date.now() - requestStartTime;

    console.log(`[AI-COMPLETE] Request ${requestId} | Duration: ${totalDuration}ms | Tools: ${toolIterations}`);

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const totalDuration = Date.now() - requestStartTime;
    
    console.error(`[FATAL-ERROR] Request ${requestId} | Duration: ${totalDuration}ms`);
    console.error(`[FATAL-ERROR] ${error instanceof Error ? error.message : String(error)}`);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ 
          error: 'Timeout de 30 segundos. Tente uma pergunta mais simples.',
          code: 'TIMEOUT_ERROR',
          requestId
        }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro no processamento',
        code: 'AI_PROCESSING_ERROR',
        requestId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
