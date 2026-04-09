# Design Document: SDR Graph Runner v2

## 1. Engine Flow (Pseudo-Code)
A função `processSDRFlow` agora terá um loop interno ou recursão para avançar o máximo possível no grafo sem precisar de nova interação do usuário (ex: se um nó de Ação segue para uma Mensagem).

```typescript
while (currentNode.isAutomatic) {
   if (currentNode.type === 'action') {
      const toolResult = await executeTool(currentNode.toolName, args);
      currentNode = findNextNode(currentNode, toolResult.status);
   }
   if (currentNode.type === 'message') {
      return { content: currentNode.text, nextNode: currentNode.next };
   }
}
```

## 2. LLM Prompt Guard
O `system_prompt` da Engine SDR será blindado:
- "Você é um Agente de Vendas (SDR). Você deve seguir estritamente o Fluxo de Decisão fornecido."
- "Não use tags <thinking>."
- "Não mencione que você é uma IA ou que está em uma simulação."
- "Seja curto, direto e cordial conforme a Persona selecionada."

## 3. Simulator Metadata Handling
O simulador enviará o histórico completo, e a engine buscará em `metadata.current_node_id` do último objeto `assistant` para saber de onde continuar. Isso garante que, se o usuário fechar e abrir o simulador, a conversa saiba exatamente em qual nó do Canvas ela parou.
