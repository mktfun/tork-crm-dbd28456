

# Plano: Aumentar limite de caracteres do input da IA para 4000

## Mudanca

No arquivo `src/components/ai/AmorimAIFloating.tsx`, linha 44:

```typescript
// De:
const MAX_INPUT_CHARS = 1000;

// Para:
const MAX_INPUT_CHARS = 4000;
```

Uma unica linha. Tudo que referencia `MAX_INPUT_CHARS` (validacao, contador, indicador vermelho a 90%) ja se ajusta automaticamente.

