import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { resolveUserModel } from "../_shared/model-resolver.ts";

const SDR_SYSTEM_PROMPT = `Você é um Agente de Vendas Automatizado (SDR) de uma corretora de seguros.
Sua missão é seguir ESTRITAMENTE o fluxo de conversação desenhado.
REGRAS CRÍTICAS:
1. NUNCA use tags <thinking> ou exponha seu raciocínio.
2. Responda de forma curta, cordial e humana.
3. Não invente ferramentas ou funcionalidades do sistema que não foram citadas na sua instrução atual.
4. Se o fluxo chegar ao fim, encerre a conversa educadamente.`;

/**
 * Engine SDR v2: Executor de Grafo com Inteligência Real
 */
export async function processSDRFlow(
  workflow: any,
  userMessage: string,
  history: any[],
  supabase: SupabaseClient,
  userId: string
) {
  if (!workflow || !workflow.nodes || !workflow.edges) {
    console.error(`[SDR-ENGINE] Workflow inválido ou incompleto.`);
    return { content: "Desculpe, tive um problema técnico ao processar seu fluxo.", metadata: {} };
  }

  console.log(`[SDR-ENGINE] Rodando motor para: ${workflow.name} (ID: ${workflow.id})`);

  // 1. Identificar Ponto de Partida
  const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant');
  let currentNodeId = lastAssistantMsg?.metadata?.current_node_id || 'trigger';

  // Se o trigger foi o último, avançamos para o primeiro nó real
  if (currentNodeId.startsWith('trigger')) {
    const edge = workflow.edges.find((e: any) => e.source === currentNodeId);
    if (!edge) return { content: "Olá! Como posso ajudar?", metadata: { current_node_id: 'trigger' } };
    currentNodeId = edge.target;
  }

  let currentNode = workflow.nodes.find((n: any) => n.id === currentNodeId);
  
  // 2. Loop de Travessia Automática (avança enquanto não exigir input do usuário)
  let maxSteps = 5; 
  let finalResponse = null;

  const geminiKey = Deno.env.get('GOOGLE_AI_API_KEY');

  while (currentNode && maxSteps > 0) {
    maxSteps--;
    console.log(`[SDR-ENGINE] Processando Nó: ${currentNode.data.label} (${currentNode.type})`);

    // A) NÓ DE MENSAGEM
    if (currentNode.type === 'message') {
      const template = currentNode.data.config?.message_template || "Olá!";
      finalResponse = {
        content: sanitizeOutput(template),
        metadata: { current_node_id: currentNode.id }
      };
      break; 
    }

    // B) NÓ DE DECISÃO
    if (currentNode.type === 'decision') {
      const condition = currentNode.data.config?.condition;
      if (!condition) {
         console.warn("[SDR-ENGINE] Nó de decisão sem condição. Seguindo caminho 'FALSE'.");
         const falseEdge = workflow.edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === "false");
         if (!falseEdge) break;
         currentNode = workflow.nodes.find((n: any) => n.id === falseEdge.target);
         continue;
      }

      const decision = await evaluateCondition(userMessage, condition, geminiKey);
      const edgeId = decision ? "true" : "false";
      const nextEdge = workflow.edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === edgeId);
      
      if (nextEdge) {
        currentNode = workflow.nodes.find((n: any) => n.id === nextEdge.target);
        continue; 
      } else {
        break; 
      }
    }

    // C) NÓ DE INSTRUÇÃO LIVRE
    if (currentNode.type === 'action' && currentNode.data.nodeType === 'action_custom_prompt') {
      const instruction = currentNode.data.config?.prompt_override;
      const response = await generateResponseWithInstruction(userMessage, instruction, history, geminiKey);
      finalResponse = {
        content: sanitizeOutput(response),
        metadata: { current_node_id: currentNode.id }
      };
      break;
    }

    // D) NÓ DE ESCALONAMENTO
    if (currentNode.type === 'escalation') {
      const config = currentNode.data.config || {};
      finalResponse = {
        content: sanitizeOutput(config.client_message || "Aguarde, estamos chamando um consultor."),
        metadata: { 
          current_node_id: currentNode.id,
          ai_paused: true,
          pause_until: new Date(Date.now() + (config.pause_duration || 24) * 3600000).toISOString()
        }
      };
      break;
    }

    // E) FERRAMENTAS CRM
    if (currentNode.type === 'action' && currentNode.data.nodeType.startsWith('tool_')) {
       const nextEdge = workflow.edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === 'success');
       if (nextEdge) {
         currentNode = workflow.nodes.find((n: any) => n.id === nextEdge.target);
         continue;
       }
       break;
    }

    break;
  }

  return finalResponse;
}

/**
 * Remove qualquer vazamento de <thinking> da saída final
 */
function sanitizeOutput(text: string): string {
  if (!text) return "";
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
}

/**
 * Usa o LLM para decidir TRUE/FALSE sobre uma condição
 */
async function evaluateCondition(userMsg: string, condition: string, apiKey?: string): Promise<boolean> {
  if (!apiKey) return true; // Fallback se sem chave

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Dada a mensagem do usuário: "${userMsg}" e a condição: "${condition}", responda estritamente com apenas uma palavra: "TRUE" se a condição for atendida ou "FALSE" caso contrário.` }]
        }]
      })
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
    console.log(`[SDR-LLM] Decisão: ${text}`);
    return text === "TRUE";
  } catch (e) {
    console.error('[SDR-LLM] Erro na avaliação:', e);
    return false;
  }
}

/**
 * Gera resposta baseada em uma instrução específica do fluxo
 */
async function generateResponseWithInstruction(userMsg: string, instruction: string, history: any[], apiKey?: string): Promise<string> {
  if (!apiKey) return "Estou processando sua solicitação...";

  try {
    const messages = [
      { role: 'user', parts: [{ text: `${SDR_SYSTEM_PROMPT}\n\nSUA INSTRUÇÃO ATUAL: ${instruction}\n\nMENSAGEM DO USUÁRIO: ${userMsg}` }] }
    ];

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      body: JSON.stringify({ contents: messages })
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, tive um problema ao processar seu pedido.";
  } catch (e) {
    console.error('[SDR-LLM] Erro na instrução:', e);
    return "Um erro ocorreu na inteligência do fluxo.";
  }
}

/**
 * Busca o workflow SDR ativo
 */
export async function getActiveSDRWorkflow(supabase: SupabaseClient, userId: string, contactInfo: any) {
  const { data: workflows, error } = await supabase
    .from('crm_sdr_workflows')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !workflows || workflows.length === 0) return null;
  return workflows[0];
}

