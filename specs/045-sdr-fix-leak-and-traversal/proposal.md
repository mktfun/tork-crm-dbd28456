# Master Spec: 045 SDR Fix Leak & Graph Traversal Hardening

## 1. Visão Geral
Este documento detalha as correções críticas para selar de vez o vazamento de lógica entre o Assistente Amorim (Mentor) e o SDR, além de destravar o build das Edge Functions e garantir que o simulador siga estritamente o desenho do fluxo. O foco é eliminar duplicidade de variáveis no backend, adicionar sanitização no frontend e tornar o motor de grafos determinístico.

## 2. Diagnóstico Técnico
- **Erro de Build (Backend):** O arquivo `ai-assistant/index.ts` possui declarações duplicadas de `supabaseUrl`, `supabaseServiceKey` e `supabase` no mesmo escopo, impedindo o deploy da versão blindada.
- **Roteamento Frágil:** A engine SDR ainda permite fallback silencioso para o prompt de Mentor se o próximo nó não for identificado.
- **Vazamento Visual:** O simulador não remove as tags `<thinking>` nem identifica quando uma resposta "invadiu" o modo mentor indevidamente.
- **Erros de Tipagem (Frontend):** O builder SDR possui acessos a propriedades (`node.data.config`) que o TypeScript não reconhece, podendo quebrar o build do projeto inteiro.

## 3. Soluções Propostas

### 3.1 Hardening do Backend (`ai-assistant`)
1. **Limpeza de Build:** Remover declarações redundantes e unificar a instância do cliente Supabase.
2. **Isolamento de Contexto:** Se `is_simulation: true`, a função deve retornar **obrigatoriamente** um erro de "Fim de Fluxo" caso a engine SDR não retorne uma mensagem, nunca permitindo que o código avance para o `BASE_SYSTEM_PROMPT` do Mentor.
3. **Logs de Diagnóstico:** Adicionar logs estruturados (`SDR_ROUTING_START`, `SDR_ENGINE_SUCCESS`) para facilitar a depuração.

### 3.2 Inteligência Determinística (`engine-sdr.ts`)
- Garantir que se o nó for do tipo `message`, a IA use exatamente o texto do template, sem invenções.
- Sanitizar a saída de nós do tipo `action_custom_prompt` para garantir que o LLM não tente usar `<thinking>`.

### 3.3 Blindagem do Simulador (`SDRSimulator.tsx`)
- Implementar RegEx para remover `<thinking>...</thinking>` do texto antes de exibir no balão.
- Detectar "Sinais de Mentor" (ex: "Sou o Amorim AI") e exibir um aviso de erro: *"⚠️ A simulação vazou para o assistente genérico. Verifique o roteamento."*

### 3.4 Tipagem Estrita do Builder (`SDRBuilder.tsx`)
- Criar interfaces TypeScript para os diferentes tipos de configuração de nó (`TriggerConfig`, `DecisionConfig`, etc.) para eliminar os erros de `unknown`.

## 4. User Stories
- **US1:** Como Usuário, quero que o simulador me responda apenas o que desenhei, sem nunca mostrar tags de pensamento técnico.
- **US2:** Como Administrador, quero salvar meu fluxo e ter certeza de que o build da função no Supabase não vai falhar por variáveis duplicadas.

## 5. Plano de Execução
1. **Fix Backend Build:** Corrigir duplicidade em `index.ts`.
2. **Seal Fallback:** Bloquear avanço para Mentor em requisições SDR.
3. **Enhance Engine:** Tornar travessia de nós 100% determinística.
4. **Sanitize Frontend:** Adicionar filtro anti-leak no Simulador.
5. **Fix TS Errors:** Tipar o builder e os hooks de workflow.
