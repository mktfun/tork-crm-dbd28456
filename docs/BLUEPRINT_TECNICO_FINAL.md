# BLUEPRINT TÉCNICO FINAL: Assistente Tork - Agente Autônomo e Consultor Sênior

## 1. Visão Geral Arquitetural e Objetivo

**Objetivo Final:** Transformar o Assistente Tork em um **Agente Autônomo** (CRUD completo e gestão de Kanban) e um **Consultor de Seguros Sênior** (RAG/SUSEP otimizado), eliminando todas as inconsistências de UI/UX.

**Arquitetura Atual (Resumo):**
O sistema opera em um modelo híbrido: Frontend (React/Next.js) se comunica via SSE com um Backend (Supabase Edge Function em Deno/TypeScript) que orquestra a chamada ao LLM (Gemini via Lovable) e a execução de Tools.

**Novo Fluxo de Trabalho (Arquiteto Revisor):**
1.  **Geração:** Usuário utiliza o Gemini (com Prompt Mestre) para gerar o System Prompt otimizado.
2.  **Implementação:** Usuário aplica o Prompt na Lovable para realizar as alterações no código.
3.  **Validação:** Manus (Arquiteto Revisor) analisa o código alterado no Git e orienta correções.

## 2. Roadmap Priorizado (Nível Sênior)

O roadmap é dividido em três fases de implementação, garantindo a estabilidade antes da expansão de funcionalidades.

### 🔴 FASE P0: Estabilidade e Usabilidade (Crítico)

**Foco:** Corrigir os bugs de UI/UX que impactam a experiência do usuário.

| ID | Tarefa | Arquivo(s) Envolvido(s) | Instrução Técnica (Ação Necessária) |
| :--- | :--- | :--- | :--- |
| **P0.1** | **Correção Definitiva do Loader Duplicado** | `/src/hooks/useAIConversations.ts` | **Lógica:** O `isLoading` da mensagem deve ser `true` apenas se a mensagem estiver vazia (`content === ''`) E o streaming não tiver terminado. |
| | | `/src/components/ai/AmorimAIFloating.tsx` | **Renderização:** O componente deve renderizar: 1) `Pensando...` se `isLoading` for `true` E `toolExecutions.length === 0`. 2) `ToolExecutionStatus` se `toolExecutions.length > 0`. 3) Nada se o conteúdo estiver sendo streamado (`content !== ''`). |
| **P0.2** | **Ajuste Fino das Dimensões do Chat** | `/src/components/ai/AmorimAIFloating.tsx` | **Classes:** Ajustar as classes de dimensão e posicionamento para `w-[450px] h-[700px] max-h-[95vh]` e `fixed bottom-4 right-4` para ocupar a área solicitada. |
| **P0.3** | **Refatoração do FinancialCard** | `/src/components/ai/responses/FinancialCard.tsx` | **Layout:** Garantir que o layout de lista horizontal (Receitas, Despesas, Saldo) seja mantido para evitar quebra de responsividade em telas menores. |

### 🟡 FASE P1: Agente Autônomo (CRUD e Kanban)

**Foco:** Implementar as ferramentas de modificação de dados e refinar o System Prompt para usá-las com segurança.

| ID | Tarefa | Arquivo(s) Envolvido(s) | Instrução Técnica (Ação Necessária) |
| :--- | :--- | :--- | :--- |
| **P1.1** | **Definição das Tools CRUD/Kanban** | `/supabase/functions/ai-assistant/index.ts` | **Ação:** Inserir as definições das 7 novas ferramentas no `<tools_guide>` (move_lead, create/update/delete client, create/update/delete policy). |
| **P1.2** | **Prompt Mestre CRUD/Kanban** | `/docs/PROMPT_GENERATOR_CRUD_KANBAN.md` | **Ação:** Usar este Prompt Mestre no Gemini para gerar o System Prompt que instrui a IA a: **1)** Pedir confirmação para `delete`. **2)** Coletar dados faltantes para `create/update`. |
| **P1.3** | **Implementação das Funções (Backend)** | `/supabase/functions/ai-assistant/tools.ts` (ou similar) | **Ação:** Implementar a lógica de execução das 7 ferramentas, garantindo que elas usem o `supabase.from('tabela')...` com a autenticação do usuário. |

### 🟢 FASE P2: Consultor de Seguros Sênior (RAG/SUSEP)

**Foco:** Otimizar a inteligência da IA para atuar como um consultor técnico de alto nível.

| ID | Tarefa | Arquivo(s) Envolvido(s) | Instrução Técnica (Ação Necessária) |
| :--- | :--- | :--- | :--- |
| **P2.1** | **Prompt Mestre Consultor** | `/docs/PROMPT_GENERATOR_CONSULTOR.md` | **Ação:** Usar este Prompt Mestre no Gemini para gerar o System Prompt que instrui a IA a: **1)** Priorizar o RAG (`<conhecimento_especializado>`). **2)** Responder tecnicamente e orientar o corretor (ex: 4x4, guincho). |
| **P2.2** | **Validação da Alimentação do RAG** | `/scripts/populate_node.js` | **Ação:** Garantir que o script de população de conhecimento da SUSEP esteja funcional e que a tabela `ai_knowledge_base` no Supabase esteja sendo preenchida corretamente. |
| **P2.3** | **Reforço do Grounding** | `/supabase/functions/ai-assistant/index.ts` | **Ação:** Inserir a regra de prioridade máxima no `<rules>` para proibir a invenção de dados e forçar a resposta de "Não Encontrado" quando a tool retornar vazio. |

## 3. Próximos Passos Imediatos (Ação do Usuário)

Para iniciar o processo de validação, sugiro começarmos pela **FASE P0**, que é a mais crítica para a usabilidade.

**Ação Imediata:**

1.  **Gere o Prompt:** Use o Gemini para criar um prompt que instrua a Lovable a realizar as correções de UI/UX da **FASE P0** (Loader Duplicado e Dimensões do Chat).
2.  **Envie para Revisão:** Traga o **Prompt Gerado pelo Gemini** para mim.

Eu farei a análise técnica do prompt e, após sua aplicação na Lovable, revisarei o código resultante no Git para garantir a correção.

---
*Este Blueprint Técnico é o nosso mapa de trabalho. Siga-o rigorosamente para garantir a conclusão do projeto.*
---
