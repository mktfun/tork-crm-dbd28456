# Design Document: SDR Hardening & Leak Fix

## 1. Backend: Refatoração do ai-assistant/index.ts
O problema das variáveis duplicadas será resolvido movendo a criação do cliente `supabase` para o topo do `try` e removendo todas as reinicializações subsequentes.

### Fluxo de Execução Exclusivo (SDR/Simulação):
```typescript
if (is_simulation || !isInternal) {
   // ... lógica de roteamento SDR
   if (sdrResult) return Response(sdrResult);
   
   // Hard stop para simulação
   if (is_simulation) {
      return Response({ error: "SDR_FLOW_END", message: "Fim do fluxo." });
   }
}
// O código abaixo DESTE ponto nunca será executado para simulações ou clientes externos.
```

## 2. Engine: Travessia Determinística
Em `engine-sdr.ts`, vamos garantir:
- **Sanitização Universal:** Toda string enviada pela engine passará por `text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")`.
- **Match de Nós:** Se um nó for de Decisão, o LLM avaliará apenas para retornar TRUE/FALSE, nunca conteúdo.
- **Instrução Pura:** Nós de Instrução Livre receberão um prompt de sistema que proíbe tags técnicas.

## 3. Frontend: Segurança no Simulador
A função `handleSend` no `SDRSimulator.tsx` receberá uma camada de inspeção:
```tsx
const assistantMsg = { 
   text: response.message.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim()
};

const isFallback = assistantMsg.text.includes("Amorim AI") || assistantMsg.text.includes("Mentor");
if (isFallback) {
   assistantMsg.text = "⚠️ Erro de Roteamento: A IA caiu no modo mentor indevidamente.";
}
```

## 4. TypeScript: Tipagem do Config
No `SDRBuilder.tsx`, definiremos:
```typescript
interface NodeConfig {
   target_audience?: string;
   condition?: string;
   message_template?: string;
   prompt_override?: string;
   // ... etc
}
```
Isso permitirá usar `selectedNode.data.config.condition` sem que o TS reclame que `data` é um objeto qualquer.
