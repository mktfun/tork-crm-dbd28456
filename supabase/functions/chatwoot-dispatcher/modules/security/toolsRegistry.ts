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
  }
];

export async function executeToolCall(supabase: any, brokerageId: number, toolCall: any) {
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

      default:
        return { error: `Tool ${toolCall.function.name} not found.` };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${toolCall.function.name}:`, error);
    return { error: error.message };
  }
}
