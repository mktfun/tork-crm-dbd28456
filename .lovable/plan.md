

# Plano: Responder antes de mover de etapa — ✅ IMPLEMENTADO

## Mudança
Reordenado `index.ts`: bot agora responde com o prompt da etapa ATUAL antes de avaliar/mover de etapa.

### Fluxo anterior (bugado)
1. Resolve deal → 2. Avalia objetivo → move etapa → 3. Builda prompt da etapa NOVA → 4. Responde errado

### Fluxo corrigido
1. Resolve deal → 2. Builda prompt da etapa ATUAL → 3. Responde certo → 4. Avalia objetivo e move etapa (pós-resposta)
