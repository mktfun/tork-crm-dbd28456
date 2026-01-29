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
const BASE_SYSTEM_PROMPT = `<regra_ouro_autonomia priority="MÁXIMA">
AUTONOMIA DE DADOS: Se o usuário solicitar uma ação sobre um registro (ex: "mova o Rodrigo", "atualize a apólice da Maria", "exclua o cliente João") e você não tiver o UUID (ID) necessário, você está TERMINANTEMENTE PROIBIDO de pedir o ID ao usuário. Você DEVE OBRIGATORIAMENTE executar uma ferramenta de busca (search_clients, search_policies, get_kanban_data) PRIMEIRO para identificar o registro e obter o contexto necessário antes de prosseguir com a ação solicitada.
</regra_ouro_autonomia>

<regra_resolucao_entidades priority="MÁXIMA">
RESOLUÇÃO DE ENTIDADES: Você está PROIBIDO de solicitar IDs ao usuário. Se o usuário disser "Mova o Rodrigo para Negociação" ou "Mova o lead da Ana para Ganho", você DEVE:
1. Executar 'get_kanban_data' com query do nome do cliente para encontrar o deal
2. Usar os metadados em <current_metadata> para fazer fuzzy match do nome da etapa com o ID correto
3. Se encontrar múltiplos resultados (ex: dois "Rodrigos"), peça clarificação citando os sobrenomes, títulos dos deals ou outros identificadores - mas NUNCA peça o ID
4. Se o match for único, execute a ação DIRETAMENTE sem confirmação
</regra_resolucao_entidades>

<persona priority="MÁXIMA">
Você é o **Amorim AI**, Consultor Técnico Sênior com 30 anos de experiência no mercado de seguros brasileiro.
Sua autoridade técnica vem EXCLUSIVAMENTE do <conhecimento_especializado> injetado no seu contexto.

REGRAS DE OURO DO CONSULTOR SÊNIOR:
1. **NUNCA responda "consulte sua apólice"** se a resposta puder ser inferida tecnicamente pela base de conhecimento injetada
2. **Seja INCISIVO e TÉCNICO**: Sempre explique o "PORQUÊ" técnico (ex: "Isso ocorre devido à cláusula de agravamento de risco na apólice de Auto")
3. **CENÁRIO CONSERVADOR**: Se a informação for ambígua, ofereça o cenário mais conservador para proteção do corretor e do segurado
4. **CITE A FONTE**: Se usar informação do <conhecimento_especializado>, mencione a origem (ex: "De acordo com as regras da SUSEP...")
5. **PRIORIDADE DO RAG**: Sempre que houver dados em <conhecimento_especializado> que respondam à pergunta, use-os ANTES de qualquer conhecimento geral
</persona>

<cenarios_risco_especiais>
### Cobertura para Veículos 4x4 / Off-Road / Guincho em Locais Remotos
INSTRUÇÃO ESPECIAL: Se o tema envolver veículos 4x4, uso off-road, trilhas, guincho em locais remotos (lama, areia, rios), você DEVE:
1. Buscar explicitamente no <conhecimento_especializado> por "vias não pavimentadas", "uso fora de estrada", "exclusões de danos por submersão"
2. Explicar que coberturas de "Auto Passeio" geralmente NÃO se aplicam a veículos utilitários em condições off-road
3. Alertar sobre exclusões típicas: travessia de rios, lama profunda, trilhas pesadas, competições
4. Recomendar coberturas específicas para perfis de uso mais arriscados
</cenarios_risco_especiais>

<mentoria_tecnica_senior>
### Postura de Consultoria Técnica
- **Autoridade Técnica**: Você é a referência em normas SUSEP, condições gerais de seguros e práticas de mercado
- **Educador**: Ensine o corretor a entender a lógica por trás das regras, não apenas o resultado
- **Preventivo**: Antecipe riscos e problemas antes que eles aconteçam
- **Insights Estratégicos**: Use dados do CRM para sugerir ações proativas
</mentoria_tecnica_senior>

<knowledge_base_expertise>
### Domínios de Conhecimento Técnico
- **Seguro Auto/Moto**: Coberturas compreensivas, RCF-V (terceiros), APP, franquias, bônus, assistências, exclusões, agravamento de risco
- **Planos de Saúde**: Legislações ANS, carências, redes credenciadas, reembolsos, portabilidade
- **Consórcios**: Grupos, lances (livre, fixo, embutido), taxas de administração, contemplações
- **Normas SUSEP**: Base de todas as orientações técnicas sobre seguros
- **Sinistros**: Procedimentos, documentação, prazos legais, indenizações
</knowledge_base_expertise>

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
  <rule priority="4">
    **PAGINAÇÃO:** Ao usar ferramentas que retornam listas (apólices, clientes), se o total_count for maior que o número de itens retornados (returned_count), SEMPRE informe ao usuário: "Mostrando X de Y resultados. Quer ver os próximos?" Isso permite que o usuário solicite mais dados.
  </rule>
  <rule priority="5">
    **GROUNDING ABSOLUTO:** Ao exibir dados de uma ferramenta, você está ESTRITAMENTE PROIBIDO de inventar, adicionar ou inferir qualquer informação que NÃO esteja EXATAMENTE como foi retornada. Se um campo for nulo ou vazio (ex: email: null, phone: ""), você DEVE omiti-lo na resposta. NUNCA preencha campos vazios com dados fictícios como "joao.silva@example.com" ou "(11) 99999-9999". Apenas mostre os dados que EXISTEM.
  </rule>
  <rule priority="6">
    **RESPOSTA PARA DADOS NÃO ENCONTRADOS:** Se uma ferramenta retornar uma lista vazia ou nenhum resultado, diga claramente: "Não encontrei [item] com esses critérios no sistema." NUNCA tente sugerir dados que não existem.
  </rule>
  <rule priority="7">
    **CONFIRMAÇÃO PARA DELEÇÃO:** Você está ESTRITAMENTE PROIBIDO de executar 'delete_client' ou 'delete_policy' sem uma confirmação EXPLÍCITA e TEXTUAL do usuário. Se o usuário pedir para deletar algo, primeiro responda: "Você tem certeza que deseja excluir permanentemente [item]? Essa ação não pode ser desfeita. Confirme digitando 'Sim, pode deletar'." Somente execute a ferramenta se o usuário responder afirmativamente.
  </rule>
  <rule priority="8">
    **VALIDAÇÃO DE DADOS OBRIGATÓRIOS:** Para criar um cliente (create_client), os campos 'name' e 'phone' são OBRIGATÓRIOS. Se o usuário não fornecer esses dados, NÃO execute a ferramenta. Responda educadamente pedindo as informações faltantes: "Para criar o cliente, preciso do nome completo e telefone. Pode me informar?"
  </rule>
  <rule priority="9">
    **FEEDBACK DE ESCRITA:** Após executar com sucesso qualquer ferramenta de escrita (create, update, delete, move), inclua um emoji de confirmação na resposta. Exemplo: "✅ Cliente João Silva criado com sucesso!" ou "✅ Lead movido para a etapa Negociação."
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
  <tool name="get_kanban_data">
    <description>Busca deals/leads no CRM por nome do cliente ou título. Use OBRIGATORIAMENTE para encontrar o ID de um deal antes de movê-lo no funil.</description>
  </tool>
  
  <!-- FERRAMENTAS DE ESCRITA (FASE P2) -->
  <tool name="move_deal_to_stage">
    <description>Move um deal/lead para outra etapa do funil CRM. Requer o ID do deal e o ID da nova etapa.</description>
  </tool>
  <tool name="create_client">
    <description>Cria um novo cliente no sistema. Campos obrigatórios: name, phone. Opcionais: email, cpf_cnpj, address, birth_date.</description>
  </tool>
  <tool name="update_client">
    <description>Atualiza dados de um cliente existente.</description>
  </tool>
  <tool name="create_policy">
    <description>Cria uma nova apólice vinculada a um cliente.</description>
  </tool>
  <tool name="update_policy">
    <description>Atualiza dados de uma apólice existente.</description>
  </tool>
  <tool name="delete_client">
    <description>Exclui permanentemente um cliente. REQUER CONFIRMAÇÃO EXPLÍCITA DO USUÁRIO.</description>
  </tool>
  <tool name="delete_policy">
    <description>Exclui permanentemente uma apólice. REQUER CONFIRMAÇÃO EXPLÍCITA DO USUÁRIO.</description>
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

    // Call the SQL function to find similar chunks (FASE P2.1: Increased match_count for deeper grounding)
    const { data: results, error } = await supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: 0.50, // Lower threshold for broader semantic coverage
      match_count: 10, // Increased for richer context injection
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
    
    // Format context for injection into prompt with source metadata for citation
    const contextChunks = results.map((r: any, idx: number) => {
      const source = r.metadata?.source || 'base_conhecimento';
      const category = r.metadata?.category || 'geral';
      const topic = r.metadata?.topic || '';
      const similarity = (r.similarity * 100).toFixed(0);
      
      return `<context_chunk index="${idx + 1}" source="${source}" category="${category}" topic="${topic}" relevance="${similarity}%">
${r.content}
</context_chunk>`;
    });
    
    // Add citation instruction at the end
    const citationInstruction = `
<instrucao_citacao>
IMPORTANTE: Quando usar informações dos chunks acima, CITE a fonte no formato:
"De acordo com [source]/[category]: ..." ou "Conforme normas da SUSEP..."
Isso aumenta a credibilidade e rastreabilidade da resposta.
</instrucao_citacao>`;
    
    return contextChunks.join('\n\n') + '\n\n' + citationInstruction;
  } catch (error) {
    console.error('[RAG] Error retrieving context:', error);
    return '';
  }
}

async function buildSystemPrompt(supabase: any, userId: string, userMessage?: string): Promise<string> {
  let contextBlocks: string[] = [];

  // 0. CONTEXTO TEMPORAL DINÂMICO (FASE P3.2)
  const now = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { 
    weekday: 'long',
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  };
  const formattedDate = now.toLocaleDateString('pt-BR', dateOptions);
  
  contextBlocks.push(`<contexto_temporal>
CONTEXTO TEMPORAL: Hoje é ${formattedDate}. 
Use esta data como referência ABSOLUTA para calcular renovações, vencimentos e prazos.
Sempre que mencionar datas, use o formato brasileiro (DD/MM/AAAA).
</contexto_temporal>`);
  console.log(`[CONTEXT-TEMPORAL] Data injetada: ${formattedDate}`);

  // 0.5. Buscar Contexto Dinâmico (KPIs do CRM)
  try {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [clientsResult, policiesResult, transactionsResult] = await Promise.all([
      supabase.from('clientes').select('id, status').eq('user_id', userId),
      supabase.from('apolices').select('id, status, premium_value').eq('user_id', userId),
      supabase.from('transactions').select('amount, status, nature')
        .eq('user_id', userId)
        .gte('transaction_date', startOfMonth)
    ]);

    const totalClients = clientsResult.data?.length || 0;
    const activeClients = clientsResult.data?.filter((c: any) => c.status?.toLowerCase().includes('ativ')).length || 0;
    const totalPolicies = policiesResult.data?.length || 0;
    const activePolicies = policiesResult.data?.filter((p: any) => p.status?.toLowerCase().includes('ativ') || p.status?.toLowerCase().includes('vigente')).length || 0;
    const totalPremium = policiesResult.data?.reduce((acc: number, p: any) => acc + (Number(p.premium_value) || 0), 0) || 0;
    
    const income = transactionsResult.data?.filter((t: any) => t.nature === 'receita' && t.status === 'pago')
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0) || 0;

    const contextSummary = `
**Resumo do CRM (${now.toLocaleDateString('pt-BR')})**:
- Total de Clientes: ${totalClients} (Ativos: ${activeClients})
- Total de Apólices: ${totalPolicies} (Ativas: ${activePolicies})
- Prêmio Total: R$ ${totalPremium.toLocaleString('pt-BR')}
- Receitas do Mês: R$ ${income.toLocaleString('pt-BR')}
`;
    contextBlocks.push(`<crm_kpis>\n${contextSummary}\n</crm_kpis>`);
  } catch (error) {
    console.warn('[CONTEXT-KPI] Erro ao buscar KPIs:', error);
  }

  // 0.5 NOVO: Injetar metadados de Pipelines e Stages para autonomia de mapeamento
  try {
    const [pipelinesRes, stagesRes] = await Promise.all([
      supabase.from('crm_pipelines').select('id, name').eq('user_id', userId).order('position'),
      supabase.from('crm_stages').select('id, name, pipeline_id').eq('user_id', userId).order('position')
    ]);

    if (pipelinesRes.data?.length > 0 && stagesRes.data?.length > 0) {
      const pipelinesList = pipelinesRes.data.map((p: any) => `  - "${p.name}" (ID: ${p.id})`).join('\n');
      const stagesList = stagesRes.data.map((s: any) => {
        const pipeline = pipelinesRes.data.find((p: any) => p.id === s.pipeline_id);
        return `  - "${s.name}" (ID: ${s.id}, Pipeline: ${pipeline?.name || 'N/A'})`;
      }).join('\n');

      contextBlocks.push(`<current_metadata>
## Funis (Pipelines) Disponíveis:
${pipelinesList}

## Etapas (Stages) Disponíveis:
${stagesList}

INSTRUÇÃO: Use esses IDs diretamente ao mover deals. Se o usuário mencionar um nome de etapa (ex: "Negociação"), faça o match pelo nome e use o ID correspondente. NÃO peça confirmação, execute diretamente.
</current_metadata>`);
      console.log(`[CONTEXT-METADATA] Injetados ${pipelinesRes.data.length} pipelines e ${stagesRes.data.length} stages`);
    }
  } catch (error) {
    console.warn('[CONTEXT-METADATA] Erro ao buscar metadados:', error);
  }
  
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
  },
  {
    type: "function",
    function: {
      name: "get_kanban_data",
      description: "Busca deals/leads no CRM por nome do cliente ou título. Use para encontrar deals antes de movê-los no funil.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca (nome do cliente ou título do deal)" },
          pipeline_id: { type: "string", description: "ID do pipeline específico (opcional)" }
        },
        required: []
      }
    }
  },
  // ========== FERRAMENTAS DE ESCRITA (FASE P2) ==========
  {
    type: "function",
    function: {
      name: "move_deal_to_stage",
      description: "Move um deal/lead para outra etapa do funil CRM.",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "string", description: "ID do deal (UUID)" },
          stage_id: { type: "string", description: "ID da nova etapa (UUID)" }
        },
        required: ["deal_id", "stage_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_client",
      description: "Cria um novo cliente no sistema. Campos obrigatórios: name, phone.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome completo do cliente" },
          phone: { type: "string", description: "Telefone do cliente" },
          email: { type: "string", description: "Email do cliente (opcional)" },
          cpf_cnpj: { type: "string", description: "CPF ou CNPJ do cliente (opcional)" },
          address: { type: "string", description: "Endereço (opcional)" },
          birth_date: { type: "string", description: "Data de nascimento AAAA-MM-DD (opcional)" }
        },
        required: ["name", "phone"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_client",
      description: "Atualiza dados de um cliente existente.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "ID do cliente (UUID)" },
          name: { type: "string", description: "Novo nome" },
          phone: { type: "string", description: "Novo telefone" },
          email: { type: "string", description: "Novo email" },
          cpf_cnpj: { type: "string", description: "Novo CPF/CNPJ" },
          status: { type: "string", enum: ["Ativo", "Inativo"], description: "Novo status" }
        },
        required: ["client_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_policy",
      description: "Cria uma nova apólice vinculada a um cliente.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "ID do cliente (UUID)" },
          policy_number: { type: "string", description: "Número da apólice" },
          premium_value: { type: "number", description: "Valor do prêmio" },
          start_date: { type: "string", description: "Data de início AAAA-MM-DD" },
          expiration_date: { type: "string", description: "Data de vencimento AAAA-MM-DD" },
          insurance_company: { type: "string", description: "ID da seguradora (UUID)" },
          ramo_id: { type: "string", description: "ID do ramo (UUID)" },
          status: { type: "string", enum: ["Ativa", "Orçamento", "Aguardando Apólice"], description: "Status inicial" }
        },
        required: ["client_id", "expiration_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_policy",
      description: "Atualiza dados de uma apólice existente.",
      parameters: {
        type: "object",
        properties: {
          policy_id: { type: "string", description: "ID da apólice (UUID)" },
          policy_number: { type: "string", description: "Novo número" },
          premium_value: { type: "number", description: "Novo valor do prêmio" },
          status: { type: "string", enum: ["Ativa", "Cancelada", "Vencida", "Renovada"], description: "Novo status" },
          expiration_date: { type: "string", description: "Nova data de vencimento" }
        },
        required: ["policy_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_client",
      description: "Exclui permanentemente um cliente. REQUER CONFIRMAÇÃO EXPLÍCITA.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "ID do cliente a ser excluído (UUID)" },
          confirmed: { type: "boolean", description: "Deve ser true para confirmar a exclusão" }
        },
        required: ["client_id", "confirmed"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_policy",
      description: "Exclui permanentemente uma apólice. REQUER CONFIRMAÇÃO EXPLÍCITA.",
      parameters: {
        type: "object",
        properties: {
          policy_id: { type: "string", description: "ID da apólice a ser excluída (UUID)" },
          confirmed: { type: "boolean", description: "Deve ser true para confirmar a exclusão" }
        },
        required: ["policy_id", "confirmed"]
      }
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
  },

  // ========== FERRAMENTAS DE ESCRITA (FASE P2 - AGENTE AUTÔNOMO) ==========
  
  get_kanban_data: async (args, supabase, userId) => {
    const { query, pipeline_id } = args;
    
    // Buscar deals com informações de stage e cliente
    let qb = supabase
      .from('crm_deals')
      .select(`
        id,
        title,
        value,
        notes,
        created_at,
        stage_id,
        client_id,
        crm_stages!inner(id, name, color, pipeline_id),
        clientes(id, name, phone, email)
      `)
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .limit(20);

    if (pipeline_id) {
      qb = qb.eq('crm_stages.pipeline_id', pipeline_id);
    }

    const { data: deals, error } = await qb;
    if (error) throw error;

    // Filtrar por query se fornecido
    let filteredDeals = deals || [];
    if (query) {
      const normalizedQuery = query.toLowerCase();
      filteredDeals = filteredDeals.filter((d: any) =>
        d.title?.toLowerCase().includes(normalizedQuery) ||
        d.clientes?.name?.toLowerCase().includes(normalizedQuery)
      );
    }

    // Buscar etapas disponíveis para contexto
    const { data: stages } = await supabase
      .from('crm_stages')
      .select('id, name, pipeline_id')
      .eq('user_id', userId)
      .order('position', { ascending: true });

    console.log(`[TOOL] get_kanban_data: Encontrados ${filteredDeals.length} deals`);
    return {
      success: true,
      deals: filteredDeals.map((d: any) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        stage_id: d.stage_id,
        stage_name: d.crm_stages?.name,
        client_id: d.client_id,
        client_name: d.clientes?.name
      })),
      available_stages: stages || [],
      total_count: filteredDeals.length
    };
  },

  move_deal_to_stage: async (args, supabase, userId) => {
    const { deal_id, stage_id } = args;

    // Verificar se o deal existe e pertence ao usuário
    const { data: deal, error: dealError } = await supabase
      .from('crm_deals')
      .select('id, title, stage_id')
      .eq('id', deal_id)
      .eq('user_id', userId)
      .single();

    if (dealError || !deal) {
      throw new Error('Deal não encontrado ou não pertence a você');
    }

    // Verificar se a etapa existe
    const { data: stage, error: stageError } = await supabase
      .from('crm_stages')
      .select('id, name')
      .eq('id', stage_id)
      .eq('user_id', userId)
      .single();

    if (stageError || !stage) {
      throw new Error('Etapa não encontrada');
    }

    // Atualizar o deal
    const { error: updateError } = await supabase
      .from('crm_deals')
      .update({ stage_id, updated_at: new Date().toISOString() })
      .eq('id', deal_id)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    console.log(`[TOOL] move_deal_to_stage: Deal "${deal.title}" movido para "${stage.name}"`);
    return { 
      success: true, 
      action: 'move_deal',
      message: `Deal "${deal.title}" movido para a etapa "${stage.name}"`,
      deal_id,
      new_stage_id: stage_id,
      new_stage_name: stage.name
    };
  },

  create_client: async (args, supabase, userId) => {
    const { name, phone, email, cpf_cnpj, address, birth_date } = args;

    // Validação obrigatória
    if (!name || !phone) {
      throw new Error('Nome e telefone são obrigatórios para criar um cliente');
    }

    const insertData: any = {
      user_id: userId,
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      status: 'Ativo'
    };

    if (cpf_cnpj) insertData.cpf_cnpj = cpf_cnpj.trim();
    if (address) insertData.address = address.trim();
    if (birth_date) insertData.birth_date = birth_date;

    const { data, error } = await supabase
      .from('clientes')
      .insert(insertData)
      .select('id, name, phone, email, status')
      .single();

    if (error) throw error;

    console.log(`[TOOL] create_client: Cliente "${name}" criado com ID ${data.id}`);
    return { 
      success: true, 
      action: 'create_client',
      message: `Cliente "${name}" criado com sucesso`,
      client: data 
    };
  },

  update_client: async (args, supabase, userId) => {
    const { client_id, ...updateFields } = args;

    // Verificar se o cliente existe
    const { data: existing, error: checkError } = await supabase
      .from('clientes')
      .select('id, name')
      .eq('id', client_id)
      .eq('user_id', userId)
      .single();

    if (checkError || !existing) {
      throw new Error('Cliente não encontrado ou não pertence a você');
    }

    // Montar objeto de atualização apenas com campos fornecidos
    const updates: any = { updated_at: new Date().toISOString() };
    if (updateFields.name) updates.name = updateFields.name.trim();
    if (updateFields.phone) updates.phone = updateFields.phone.trim();
    if (updateFields.email !== undefined) updates.email = updateFields.email.trim();
    if (updateFields.cpf_cnpj) updates.cpf_cnpj = updateFields.cpf_cnpj.trim();
    if (updateFields.status) updates.status = updateFields.status;

    const { data, error } = await supabase
      .from('clientes')
      .update(updates)
      .eq('id', client_id)
      .eq('user_id', userId)
      .select('id, name, phone, email, status')
      .single();

    if (error) throw error;

    console.log(`[TOOL] update_client: Cliente "${data.name}" atualizado`);
    return { 
      success: true, 
      action: 'update_client',
      message: `Cliente "${data.name}" atualizado com sucesso`,
      client: data 
    };
  },

  create_policy: async (args, supabase, userId) => {
    const { client_id, policy_number, premium_value, start_date, expiration_date, insurance_company, ramo_id, status = 'Ativa' } = args;

    // Verificar se o cliente existe
    const { data: client, error: clientError } = await supabase
      .from('clientes')
      .select('id, name')
      .eq('id', client_id)
      .eq('user_id', userId)
      .single();

    if (clientError || !client) {
      throw new Error('Cliente não encontrado');
    }

    const insertData: any = {
      user_id: userId,
      client_id,
      expiration_date,
      status,
      premium_value: premium_value || 0,
      commission_rate: 0
    };

    if (policy_number) insertData.policy_number = policy_number;
    if (start_date) insertData.start_date = start_date;
    if (insurance_company) insertData.insurance_company = insurance_company;
    if (ramo_id) insertData.ramo_id = ramo_id;

    const { data, error } = await supabase
      .from('apolices')
      .insert(insertData)
      .select('id, policy_number, status, premium_value')
      .single();

    if (error) throw error;

    console.log(`[TOOL] create_policy: Apólice criada para cliente "${client.name}"`);
    return { 
      success: true, 
      action: 'create_policy',
      message: `Apólice ${policy_number || data.id} criada para ${client.name}`,
      policy: data,
      client_name: client.name
    };
  },

  update_policy: async (args, supabase, userId) => {
    const { policy_id, ...updateFields } = args;

    // Verificar se a apólice existe
    const { data: existing, error: checkError } = await supabase
      .from('apolices')
      .select('id, policy_number, clientes(name)')
      .eq('id', policy_id)
      .eq('user_id', userId)
      .single();

    if (checkError || !existing) {
      throw new Error('Apólice não encontrada ou não pertence a você');
    }

    // Montar objeto de atualização
    const updates: any = { updated_at: new Date().toISOString() };
    if (updateFields.policy_number) updates.policy_number = updateFields.policy_number;
    if (updateFields.premium_value !== undefined) updates.premium_value = updateFields.premium_value;
    if (updateFields.status) updates.status = updateFields.status;
    if (updateFields.expiration_date) updates.expiration_date = updateFields.expiration_date;

    const { data, error } = await supabase
      .from('apolices')
      .update(updates)
      .eq('id', policy_id)
      .eq('user_id', userId)
      .select('id, policy_number, status, premium_value')
      .single();

    if (error) throw error;

    console.log(`[TOOL] update_policy: Apólice ${data.policy_number || policy_id} atualizada`);
    return { 
      success: true, 
      action: 'update_policy',
      message: `Apólice ${data.policy_number || policy_id} atualizada com sucesso`,
      policy: data 
    };
  },

  delete_client: async (args, supabase, userId) => {
    const { client_id, confirmed } = args;

    if (!confirmed) {
      throw new Error('A exclusão requer confirmação explícita (confirmed: true)');
    }

    // Verificar se o cliente existe
    const { data: client, error: checkError } = await supabase
      .from('clientes')
      .select('id, name')
      .eq('id', client_id)
      .eq('user_id', userId)
      .single();

    if (checkError || !client) {
      throw new Error('Cliente não encontrado ou não pertence a você');
    }

    // Verificar se há apólices vinculadas
    const { count: policyCount } = await supabase
      .from('apolices')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client_id);

    if (policyCount && policyCount > 0) {
      throw new Error(`Não é possível excluir: o cliente tem ${policyCount} apólice(s) vinculada(s)`);
    }

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', client_id)
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`[TOOL] delete_client: Cliente "${client.name}" excluído`);
    return { 
      success: true, 
      action: 'delete_client',
      message: `Cliente "${client.name}" excluído permanentemente`,
      deleted_id: client_id 
    };
  },

  delete_policy: async (args, supabase, userId) => {
    const { policy_id, confirmed } = args;

    if (!confirmed) {
      throw new Error('A exclusão requer confirmação explícita (confirmed: true)');
    }

    // Verificar se a apólice existe
    const { data: policy, error: checkError } = await supabase
      .from('apolices')
      .select('id, policy_number, clientes(name)')
      .eq('id', policy_id)
      .eq('user_id', userId)
      .single();

    if (checkError || !policy) {
      throw new Error('Apólice não encontrada ou não pertence a você');
    }

    const { error } = await supabase
      .from('apolices')
      .delete()
      .eq('id', policy_id)
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`[TOOL] delete_policy: Apólice ${policy.policy_number || policy_id} excluída`);
    return { 
      success: true, 
      action: 'delete_policy',
      message: `Apólice ${policy.policy_number || policy_id} excluída permanentemente`,
      deleted_id: policy_id 
    };
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
