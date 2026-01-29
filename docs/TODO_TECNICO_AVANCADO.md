# Blueprint Técnico: Assistente Tork - Agente Autônomo e Consultor Especializado

## 1. Introdução e Mapeamento de Arquitetura

Este documento serve como o **Blueprint Técnico** para a conclusão do Assistente Tork, transformando-o em um **Agente Autônomo** com capacidades de CRUD (Create, Read, Update, Delete) e um **Consultor de Seguros** especializado, com base na arquitetura atual:

| Componente | Tecnologia | Localização Principal | Função |
| :--- | :--- | :--- | :--- |
| **Frontend (UI/UX)** | React/Next.js, Tailwind CSS | `/src/components/ai/` | Interface de chat, renderização de respostas estruturadas (`<data_json>`), gestão de estado de carregamento. |
| **Backend (Edge Function)** | Deno/TypeScript | `/supabase/functions/ai-assistant/` | Orquestração da conversa, Rate Limiting (Upstash), RAG (Gemini Embeddings), Execução de Tools. |
| **Inteligência (LLM)** | Gemini (via Lovable API) | - | Geração de texto, raciocínio, seleção e execução de ferramentas. |
| **Base de Dados** | Supabase (PostgreSQL) | - | Armazenamento de dados do CRM, base de conhecimento (RAG) e padrões aprendidos. |

## 2. TODO Priorizado e Detalhamento Técnico

O plano de ação está dividido em três prioridades, focando primeiro na correção dos problemas críticos de UI/UX e, em seguida, na expansão das capacidades do Agente.

### 🔴 Prioridade Crítica (P0) - Estabilidade e Usabilidade

**Objetivo:** Eliminar a duplicidade do loader e garantir que o chat ocupe o espaço correto na tela.

| Item | Descrição | Arquivo(s) Envolvido(s) | Ação Necessária |
| :--- | :--- | :--- | :--- |
| **P0.1** | **Correção Definitiva do Loader Duplicado** | `/src/hooks/useAIConversations.ts` | Garantir que o estado `isLoading` seja gerenciado de forma que o loader inicial (`Pensando...`) seja exibido **apenas** quando `toolExecutions.length === 0` e `message.content === ''`. |
| **P0.2** | **Ajuste Fino das Dimensões do Chat** | `/src/components/ai/AmorimAIFloating.tsx` | Revisar as classes Tailwind CSS (`w-[500px] h-[750px]`) e o posicionamento (`fixed bottom-6 right-6`) para que o chat se encaixe perfeitamente na área desejada (conforme imagem). |
| **P0.3** | **Exibição Clara do Tool Status** | `/src/components/ai/AmorimAIFloating.tsx` | Assegurar que o `ToolExecutionStatus` seja o único indicador visível durante a execução de ferramentas, substituindo qualquer outro loader. |

### 🟡 Prioridade Alta (P1) - Agente Autônomo (CRUD e Kanban)

**Objetivo:** Adicionar ferramentas para que a IA possa modificar o banco de dados e gerenciar o fluxo de trabalho do CRM.

| Item | Descrição | Arquivo(s) Envolvido(s) | Ação Necessária |
| :--- | :--- | :--- | :--- |
| **P1.1** | **Ferramenta de Gestão de Kanban** | `/supabase/functions/ai-assistant/index.ts` | Criar e documentar a ferramenta `move_lead_to_status(lead_id: string, new_status: string)` para que a IA possa mover leads entre as etapas do funil. |
| **P1.2** | **Ferramenta de Criação (Create)** | `/supabase/functions/ai-assistant/index.ts` | Criar `create_client(data: ClientData)` e `create_policy(data: PolicyData)`. A IA deve ser instruída a pedir dados faltantes antes de executar. |
| **P1.3** | **Ferramenta de Atualização (Update)** | `/supabase/functions/ai-assistant/index.ts` | Criar `update_client(id: string, data: Partial<ClientData>)` e `update_policy(id: string, data: Partial<PolicyData>)`. |
| **P1.4** | **Ferramenta de Exclusão (Delete)** | `/supabase/functions/ai-assistant/index.ts` | Criar `delete_client(id: string)` e `delete_policy(id: string)`. A IA deve ser instruída a **SEMPRE** pedir confirmação do usuário antes de executar. |

### 🟢 Prioridade Média (P2) - Consultor Especializado e Prompts

**Objetivo:** Refinar a inteligência da IA para atuar como um consultor de seguros de alto nível e preparar a documentação de Prompt Engineering.

| Item | Descrição | Arquivo(s) Envolvido(s) | Ação Necessária |
| :--- | :--- | :--- | :--- |
| **P2.1** | **Refinamento do System Prompt (Consultor)** | `/supabase/functions/ai-assistant/index.ts` | Inserir instruções claras na tag `<mentoria_vendas>` para que a IA use o conhecimento técnico (RAG) para **explicar** as condições de seguro e **orientar** o corretor, em vez de apenas dar a resposta. |
| **P2.2** | **Criação do Prompt Generator (Meta-Prompt)** | `/docs/PROMPT_GENERATOR.md` | Criar um prompt mestre para o Gemini (via Lovable) que será usado para gerar e otimizar os System Prompts do Assistente Tork. Este é o seu pedido de **Arquiteto de Prompts**. |
| **P2.3** | **Validação da Base de Conhecimento (RAG)** | `/scripts/populate_node.js` | Garantir que o script de população de conhecimento da SUSEP esteja funcional e que a tabela `ai_knowledge_base` no Supabase esteja sendo preenchida corretamente. |

## 3. Guia de Prompt Engineering (P2.2)

O objetivo é criar um **Prompt Mestre** que, ao ser executado em um modelo de IA (como o Gemini), gere o System Prompt ideal para o Assistente Tork.

**Prompt Mestre para Geração de System Prompt (PROMPT_GENERATOR.md):**

```markdown
Você é um Engenheiro de Prompts de Nível Sênior, especializado em arquitetura de agentes de IA para CRM e seguros. Sua tarefa é gerar o System Prompt final, em formato Markdown, para o Assistente Tork (Amorim AI).

**Instruções para o Prompt Gerado:**

1.  **Persona:** O agente deve ser um consultor técnico de seguros, mentor de vendas e agente autônomo de CRM.
2.  **Formato:** O prompt deve usar tags XML para estruturar as seções: `<persona>`, `<mentoria_vendas>`, `<knowledge_base_expertise>`, `<rules>`, `<format_instruction>`, e `<tools_guide>`.
3.  **Regras (Rules):** As regras devem ser estritas, incluindo:
    *   Proatividade na execução de ferramentas.
    *   Obrigatoriedade de pedir confirmação para operações de `delete`.
    *   Obrigatoriedade de pedir dados faltantes para operações de `create` e `update`.
    *   Grounding absoluto (nunca inventar dados).
4.  **Tools Guide:** Deve listar as ferramentas atuais (busca, financeiro) e as novas ferramentas CRUD/Kanban (P1.1 a P1.4).
5.  **Conhecimento Técnico:** Deve reforçar o uso do contexto RAG (`<conhecimento_especializado>`) para responder perguntas técnicas de seguros.

**Entrada de Dados (Contexto Atual):**
[Insira aqui o conteúdo atual do BASE_SYSTEM_PROMPT e a lista completa de ferramentas (incluindo as novas CRUD/Kanban)]

**Saída Esperada:**
O System Prompt completo, otimizado e pronto para ser copiado e colado no arquivo `/supabase/functions/ai-assistant/index.ts`.
```

## 4. Próximos Passos

O próximo passo é focar na **Prioridade Crítica (P0)** para resolver os problemas de UI/UX que estão causando frustração. Em seguida, usaremos o **Prompt Generator (P2.2)** para refinar a inteligência da IA antes de implementar as ferramentas CRUD (P1).

---
*Fim do Blueprint Técnico*
---
