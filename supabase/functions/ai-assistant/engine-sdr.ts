import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

/**
 * Engine SDR: Interpreta o grafo do ReactFlow e decide a próxima ação da IA.
 */
export async function processSDRFlow(
  workflow: any,
  userMessage: string,
  history: any[],
  supabase: SupabaseClient,
  userId: string
) {
  console.log(`[SDR-ENGINE] Processando fluxo: ${workflow.name}`);

  // 1. Identificar o nó atual
  // Estratégia: Buscar no metadados da última mensagem da IA
  const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant');
  let currentNodeId = lastAssistantMsg?.metadata?.current_node_id || 'trigger';

  // Se o trigger foi o último, precisamos avançar para o próximo nó conectado
  if (currentNodeId === 'trigger' || currentNodeId.startsWith('trigger')) {
    const edge = workflow.edges.find((e: any) => e.source === currentNodeId);
    if (edge) currentNodeId = edge.target;
  }

  const currentNode = workflow.nodes.find((n: any) => n.id === currentNodeId);
  
  if (!currentNode) {
    console.warn(`[SDR-ENGINE] Nó ${currentNodeId} não encontrado no grafo.`);
    return null; // Fallback para Amorim AI padrão
  }

  console.log(`[SDR-ENGINE] Nó Atual: ${currentNode.data.label} (Tipo: ${currentNode.type})`);

  // 2. Lógica por Tipo de Nó
  
  // NÓ DE MENSAGEM: Apenas emite e espera
  if (currentNode.type === 'message') {
    return {
      content: currentNode.data.config?.message_template || "Olá! Como posso ajudar?",
      metadata: { current_node_id: currentNode.id }
    };
  }

  // NÓ DE DECISÃO: O LLM precisa escolher o caminho
  if (currentNode.type === 'decision') {
    const condition = currentNode.data.config?.condition;
    
    // Chamada rápida ao LLM para decidir Sim/Não
    // Aqui injetamos uma instrução especial
    const prompt = `Analise a mensagem do usuário: "${userMessage}".
Com base na condição: "${condition}", responda APENAS "TRUE" se a condição for atendida ou "FALSE" caso contrário.`;
    
    // Nota: Em uma implementação real, usaríamos o model resolver aqui.
    // Simulando decisão True por enquanto para o MVP de conexão.
    const decision = "TRUE"; // TODO: Integrar chamada real de decisão

    const edgeId = decision === "TRUE" ? "true" : "false";
    const nextEdge = workflow.edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === edgeId);
    
    if (nextEdge) {
      // Recursão para processar o próximo nó imediatamente (se for mensagem ou ação)
      const nextNode = workflow.nodes.find((n: any) => n.id === nextEdge.target);
      return {
        content: `(SDR Decisão: ${decision}) Seguindo para ${nextNode?.data.label}`,
        metadata: { current_node_id: nextNode?.id }
      };
    }
  }

  // NÓ DE AÇÃO: Executa ferramenta e segue
  if (currentNode.type === 'action') {
    const actionType = currentNode.data.nodeType;
    console.log(`[SDR-ENGINE] Executando Ação: ${actionType}`);
    
    // TODO: Mapear para toolHandlers reais
    const edge = workflow.edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === 'success');
    if (edge) {
      const nextNode = workflow.nodes.find((n: any) => n.id === edge.target);
      return {
        content: `Executei a ação ${currentNode.data.label}. Próximo passo: ${nextNode?.data.label}`,
        metadata: { current_node_id: nextNode?.id }
      };
    }
  }

  return null;
}

/**
 * Busca o workflow SDR ativo para o usuário baseado nas regras de gatilho
 */
export async function getActiveSDRWorkflow(supabase: SupabaseClient, userId: string, contactInfo: any) {
  const { data: workflows, error } = await supabase
    .from('crm_sdr_workflows')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !workflows || workflows.length === 0) return null;

  // TODO: Implementar lógica de matching de trigger_config (audience, funnel, stage)
  // Por enquanto, retorna o primeiro ativo
  return workflows[0];
}
