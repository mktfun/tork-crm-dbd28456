export interface ToolContext {
  clientId?: string | null
  conversationId?: number | null
  brokerageId?: number
  chatwootUrl?: string | null
  chatwootToken?: string | null
  chatwootAccountId?: string | null
  adminAlertPhone?: string | null
}

export const availableTools = [
  {
    type: "function",
    function: {
      name: "check_available_products",
      description: "Retorna a lista de produtos (Ramos) cadastrados no CRM da corretora",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_quote_status",
      description: "Retorna o status atual da negociação (deal) de um cliente para um determinado produto.",
      parameters: {
        type: "object",
        properties: {
          client_id: {
            type: "string",
            description: "O ID interno do cliente",
          },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human",
      description: "Use quando o cliente fizer uma solicitação fora do fluxo de vendas (ex: 2ª via de boleto, cancelamento de apólice, sinistro, reclamações, suporte técnico). IMPORTANTE: Responda ao cliente de forma natural e pessoal ANTES de chamar esta função, como se você mesmo fosse resolver (ex: 'Ok, já vou providenciar isso pra você, aguarda um momento!'). NUNCA diga que é um bot ou que vai transferir para outra pessoa.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Breve descrição do motivo do escalonamento (ex: 'cliente pediu 2ª via de boleto')",
          },
        },
        required: ["reason"],
      },
    },
  },
];

export async function executeToolCall(supabase: any, brokerageId: number, toolCall: any, ctx: ToolContext = {}) {
  console.log(`🛠️ Executing tool: ${toolCall.function.name}`);
  const args = JSON.parse(toolCall.function.arguments || '{}');

  try {
    switch (toolCall.function.name) {
      case 'check_available_products': {
        const { data } = await supabase
          .from('ramos')
          .select('id, name')
          .limit(20);
        return { success: true, data: data || [] };
      }
      
      case 'get_client_quote_status': {
        if (!args.client_id) return { error: "client_id is required" };
        const { data } = await supabase
          .from('crm_deals')
          .select('id, title, stage_id, pipeline_id')
          .eq('client_id', args.client_id)
          .eq('brokerage_id', brokerageId)
          .limit(5);
        return { success: true, deals: data || [] };
      }

      case 'escalate_to_human': {
        const reason = args.reason || 'Motivo não especificado'
        console.log(`🚨 Escalating to human. Reason: ${reason}. Client: ${ctx.clientId}`)

        // 1. Mute AI for this client for 24 hours
        if (ctx.clientId) {
          const mutedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          await supabase
            .from('crm_clients')
            .update({ ai_muted_until: mutedUntil })
            .eq('id', ctx.clientId)
          console.log(`🔇 AI muted for client ${ctx.clientId} until ${mutedUntil}`)
        }

        // 2. Add Chatwoot label + private note to conversation
        if (ctx.chatwootUrl && ctx.chatwootToken && ctx.chatwootAccountId && ctx.conversationId) {
          try {
            // Add label
            await fetch(
              `${ctx.chatwootUrl}/api/v1/accounts/${ctx.chatwootAccountId}/conversations/${ctx.conversationId}/labels`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api_access_token': ctx.chatwootToken },
                body: JSON.stringify({ labels: ['sdr-pausado'] }),
              }
            )
            // Add private note for brokers
            const noteText = `🤖 SDR pausado por 24h\n📋 Motivo: ${reason}\n📞 Alerta admin: ${ctx.adminAlertPhone || 'não configurado'}`
            await fetch(
              `${ctx.chatwootUrl}/api/v1/accounts/${ctx.chatwootAccountId}/conversations/${ctx.conversationId}/messages`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api_access_token': ctx.chatwootToken },
                body: JSON.stringify({ content: noteText, message_type: 'outgoing', content_type: 'text', private: true }),
              }
            )
          } catch (cwErr) {
            console.error('Failed to add Chatwoot label/note:', cwErr)
          }
        }

        return { success: true, message: 'Atendimento escalonado. IA pausada por 24h.' }
      }

      default:
        return { error: `Tool ${toolCall.function.name} not found.` };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${toolCall.function.name}:`, error);
    return { error: error.message };
  }
}
