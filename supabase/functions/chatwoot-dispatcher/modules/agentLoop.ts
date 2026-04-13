import { availableTools, executeToolCall, ToolContext } from './security/toolsRegistry.ts'
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export async function runAgentLoop(
  supabase: SupabaseClient,
  systemPrompt: string,
  userMessage: string,
  brokerageId: number,
  resolvedAI: { url: string; auth: string; model: string },
  history: any[] = [],
  toolCtx: ToolContext = {}
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
      temperature: 0.7
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
      return "Desculpe, tive um probleminha aqui. Pode repetir?";
    }

    const responseData = await response.json();
    const assistantMessage = responseData.choices[0].message;
    messages.push(assistantMessage);

    // If no tool calls, extract and return clean text (strip <thought> blocks)
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      const rawContent = assistantMessage.content || "Pode repetir?"

      // Extract thought for server-side logging (never sent to client)
      const thoughtMatch = rawContent.match(/<thought>([\s\S]*?)<\/thought>/i)
      if (thoughtMatch) {
        console.log(`💭 Agent thought: ${thoughtMatch[1].trim().slice(0, 300)}`)
      }

      // Strip <thought> tags — only clean response reaches the client
      const cleanContent = rawContent
        .replace(/<thought>[\s\S]*?<\/thought>\n?/gi, '')
        .trim()

      return cleanContent || "Pode repetir?"
    }

    // Execute tool calls
    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type === 'function') {
        const toolResult = await executeToolCall(supabase, brokerageId, toolCall, toolCtx);
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(toolResult)
        });
      }
    }
  }

  return "Desculpe, me perdi um pouco aqui. Pode repetir sua pergunta?";
}
