# Master Spec: 044 SDR Engine Realization & Leak Prevention

## 1. Visão Geral
Esta especificação transforma a "Engine SDR" de um esqueleto mockado em um executor de grafos robusto e inteligente. Vamos eliminar o vazamento para o modo Mentor (Amorim AI), implementar chamadas reais ao LLM para tomadas de decisão dentro do fluxo e garantir que as "Instruções Livres" do usuário sejam seguidas à risca pela IA.

## 2. Diagnóstico e Correção de Vazamento
- **Causa Raiz:** O arquivo `ai-assistant/index.ts` permitia que requisições de simulação ou de clientes externos continuassem para a lógica do Mentor caso o motor SDR retornasse nulo ou falhasse.
- **A Solução (The Hard Stop):** Implementar um ponto de interrupção absoluta. Se a requisição for identificada como SDR (Simulação ou Cliente), o processo **DEVE** terminar na Engine SDR, retornando sucesso ou um erro amigável, mas **NUNCA** prosseguindo para o prompt do Mentor Amorim.

## 3. Inteligência da Engine (Graph Runner v2)
Vamos implementar funções reais de resolução de nós em `engine-sdr.ts`:

### 3.1 Nó de Decisão (The Evaluator)
- A engine fará uma chamada rápida ao modelo **Gemini Flash** (por ser mais barato e rápido para decisões binárias).
- O prompt será estritamente: "Dada a mensagem do usuário X e a condição Y, responda apenas TRUE ou FALSE".
- O resultado moverá o ponteiro do fluxo para a saída correspondente no Canvas.

### 3.2 Nó de Instrução Livre (The Dynamic Agent)
- Quando o fluxo atingir este nó, o LLM receberá a instrução digitada pelo usuário no Builder como a sua "Missão Atual".
- O contexto será limitado apenas ao que foi definido naquele bloco, impedindo alucinações sobre ferramentas do CRM que não foram liberadas no fluxo.

### 3.3 Nó de Mensagem
- Retornará o template definido, mas permitirá injeção de variáveis simples futuramente (ex: {nome_cliente}).

## 4. Estabilidade do Simulador
- O Simulador deve gerenciar o estado do `current_node_id` através dos metadados.
- Se o simulador for reiniciado, o estado deve ser resetado para o `trigger`.

## 5. Plano de Execução
1. **Dispatcher Hardening:** Modificar `ai-assistant/index.ts` para forçar o encerramento após a engine SDR.
2. **LLM Integration (Engine):** Implementar a chamada ao `resolveUserModel` dentro da engine SDR para avaliar condições e gerar respostas.
3. **Instruction Node Implementation:** Garantir que o conteúdo do bloco "Instrução Livre" seja o guia soberano da resposta.
4. **No-Thinking Policy:** Forçar uma instrução de sistema na engine SDR que proíbe explicitamente o uso de tags `<thinking>` ou qualquer vazamento técnico para o cliente.
