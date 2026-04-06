# Design: Isolamento Multi-Tenant do Dispatcher

## Estratégia de Arquitetura

O webhook de entrada do Supabase Edge Functions atua como o "porteiro". Ele já está com grande parte do código em uso na produção, então utilizaremos Antigravity para refatorar (modificar) o código ao invés do Stitch MCP para reescrever dezenas de linhas. 

### Modelagem da Detecção Restrita (resolveContext.ts)

A falha primária ocorreu por falta de um filtro obrigatório da corretora (Tenant) na busca de donos/produtores. 
Para resolver o problema, o algoritmo `resolveContext` deve proceder no seguinte formato para a Etapa 3 (Auto-detect):

```typescript
// Fluxo Teórico
function isSamePhone(input: string, dbPhone: string) {
  // normaliza para últimos 11 dígitos, ignorando tudo que não é numérico
}

// 1. Obtém a lista estrita dos contatos associados exaustivamente à corretora em escopo
// `brokerageId` vem da caixa orgânica ativada via token ou profile
const { data: producers } = supabase.from('producers').eq('brokerage_id', brokerageId);

// 2. Busca estritamente com lógica O(n) no runtime
const matchedProducer = producers.find(p => isSamePhone(input, p.phone));

// 3. Promove para Admin Apenas e SE o Tenant for compatível 
// Repetir a mesma lógica pra donos de agência (brokerages.user_id = brokerages[id].phone)
```

Essa mudança preserva o funcionamento que "simplesmente funciona" caso os donos liguem testando no ambiente deles mesmos, mas bloqueia o escalonamento horizontal lateral que ocorria antes por causa de queries genéricas de substring via `.ilike`.

### Prompt Isolation em `processAdminLogic.ts`

- A tag interna `[MODO WHATSAPP ATIVADO...]` antes concatenada hardcoded antes da variável de finalização vai ser extinta do arquivo `processAdminLogic`.
- Em seu lugar, caso precisemos setar "Responda como Whatsapp" nas guidelines geradas, isso deve ocorrer num system prompt builder (não modificado neste update já que o problema primário era vazar o prompt e confirmar a ação interativamente repetidas vezes).

### SQL Manual CleanUp

Script necessário no final da tarefa para purgar a sujeira do teste que vazou entre projetos:
```sql
DELETE FROM admin_chat_history 
WHERE phone_number LIKE '%956076123%';
```
