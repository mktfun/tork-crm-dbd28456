# Design Document: SDR Engine Implementation

## 1. Persistência e Integração com o Builder
O componente `SDRBuilder.tsx` será refatorado para utilizar o novo hook `useSDRWorkflows.ts`.
- **Auto-save:** Ao clicar em "Salvar Tudo" ou "Publicar", o JSON dos nós e arestas será persistido na tabela `crm_sdr_workflows`.
- **Configuração de Gatilho:** As regras do nó `trigger` serão extraídas e salvas na coluna `trigger_config`.

## 2. SDR Engine (Graph Interpreter)
A engine de backend (`engine-sdr.ts`) funcionará como um middleware entre a Edge Function e o LLM.

### Fluxo da Engine:
1. **Fetch Workflow:** Busca o fluxo `is_active = true` do usuário.
2. **Context Injection:** Injeta no `system_prompt` uma representação textual do fluxo.
   - Ex: "Você está no nó ID=1. Se o usuário disser 'Sim', vá para nó ID=2. Se disser 'Não', vá para nó ID=3."
3. **State Management:** A cada turno, a IA deve emitir uma tag oculta `<current_node_id>` para que o backend saiba onde a conversa está no próximo turno.
4. **Tool Execution:** Se o fluxo apontar para um nó de `action` (ex: `tool_create_client`), o backend intercepta e executa a função interna correspondente.

## 3. Simulator Hookup
O simulador de chat passará a realizar requisições POST para a Edge Function `ai-assistant` com um flag especial `is_simulation: true`.
- Quando esse flag for detectado, a Edge Function ignorará as restrições de produção (ex: limite de mensagens do corretor) e processará o fluxo específico enviado no payload (permite testar alterações sem salvar).

## 4. Roteamento de Produção (Dispatcher)
No arquivo `supabase/functions/ai-assistant/index.ts`, adicionaremos uma etapa inicial no handler:
```typescript
// Pseudo-código do Dispatcher
const activeWorkflow = await getActiveSDRWorkflow(userId, contactInfo);
if (activeWorkflow) {
   return await processSDRFlow(activeWorkflow, userMessage, conversationHistory);
}
// Fallback para consultoria Amorim AI padrão
```
