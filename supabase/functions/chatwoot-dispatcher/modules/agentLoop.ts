import { availableTools, executeToolCall } from './security/toolsRegistry.ts'
import { SupabaseClient } from '@supabase/supabase-js'

export async function runAgentLoop(
  supabase: SupabaseClient,
  systemPrompt: string,
  userMessage: string,
  brokerageId: number,
  resolvedAI: { url: string; auth: string; provider: string; model: string },
  history: any[] = []
): Promise<string> {
  
  let messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage }
  ];

  let maxLoops = 3;
  let currentLoop = 0;

  while (currentLoop < maxLoops) {
    currentLoop++;
    console.log(`🧠 Agent Loop [${currentLoop}/${maxLoops}] calling LLM...`);

    const llmPayload = {
      model: resolvedAI.model,
      messages: messages,
      tools: availableTools,
      tool_choice: "auto",
      temperature: 0.3
    };

    const response = await fetch(resolvedAI.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: resolvedAI.auth,
      },
      body: JSON.stringify(llmPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API Error:', errorText);
      return "Desculpe, ocorreu um erro interno de conexão neste momento.";
    }

    const responseData = await response.json();
    const assistantMessage = responseData.choices[0].message;
    messages.push(assistantMessage);

    // If the model did not ask to use any tool, break and return the text.
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return assistantMessage.content || "Não consegui formular uma resposta.";
    }

    // The model wants to call one or more tools
    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type === 'function') {
        const toolResult = await executeToolCall(supabase, brokerageId, toolCall);
        
        // Feed the result back to the LLM
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(toolResult)
        });
      }
    }
  }

  return "Desculpe, precisei encerrar meu raciocínio porque estava complexo demais. Podemos recomeçar?";
}
