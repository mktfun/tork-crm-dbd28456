# Análise de Pendências - Tork CRM IA Assistente

Após análise do código-fonte e da documentação fornecida, identificamos o estado atual e as melhorias necessárias.

## ✅ O que já foi implementado
- **Interface Flutuante:** `AmorimAIFloating.tsx` com animações Framer Motion.
- **Streaming SSE:** Implementado no backend (`index.ts`) e frontend (`useAIConversations.ts`).
- **Renderização Híbrida:** `AIResponseRenderer.tsx` separa Markdown de JSON estruturado.
- **Componentes Visuais:** `FinancialCard`, `PolicyListCard`, `ClientListCard` e `TableComponent`.
- **Indicador de Ferramentas:** `ToolExecutionStatus.tsx` mostra o progresso das ferramentas.
- **RAG e Contexto:** Integração com base de conhecimento e padrões aprendidos.
- **Rate Limiting:** Configurado com Upstash Redis.

## ⚠️ Problemas Identificados (Baseado no histórico do usuário)
1. **Loader Duplicado:** O usuário relatou que aparecem dois loaders "Pensando...".
2. **Cards Financeiros Espremidos:** Falta de responsividade em telas menores.
3. **Paginação de Apólices:** A IA limita em 10 itens mas não oferece navegação clara ou botão "Ver mais".
4. **Links Clicáveis:** Nem todos os cards estão linkando corretamente para as telas de detalhes.
5. **Overflow de Texto:** Informações saindo da tela em cards de apólices.
6. **Grounding (Dados Inventados):** A IA às vezes cria dados fictícios (ex: emails de exemplo).

## 🚀 Plano de Ação

### 1. Correção do Loader Duplicado
- **Backend:** Garantir que o `tool_start` e `tool_end` sejam enviados corretamente via SSE.
- **Frontend:** Ajustar o `useAIConversations` para gerenciar o estado de `isLoading` e `isStreaming` de forma que apenas um indicador seja exibido.

### 2. Melhoria da Responsividade (Cards Financeiros)
- Ajustar o grid no `FinancialCard.tsx` para usar `grid-cols-1` em mobile e `sm:grid-cols-3` em desktop.
- Garantir que o container pai no chat permita o scroll horizontal ou ajuste o conteúdo.

### 3. Implementação de Paginação Real
- **Backend:** Ajustar as ferramentas para retornar `total_count` e `returned_count`.
- **Frontend:** Adicionar botão "Ver mais" nos componentes `PolicyListCard` e `ClientListCard` que dispare uma nova pergunta para a IA solicitando os próximos itens.

### 4. Refinamento de Links e Overflow
- Validar as rotas no `PolicyListCard.tsx` e `ClientListCard.tsx`.
- Aplicar classes `truncate` e `min-w-0` para evitar quebra de layout.

### 5. Reforço do Grounding
- Atualizar o `BASE_SYSTEM_PROMPT` no `index.ts` com regras mais rígidas contra invenção de dados.
- Adicionar exemplos de "O que fazer quando não encontrar dados".

### 6. Contexto Dinâmico (KPIs)
- Implementar a busca de KPIs reais do CRM antes de chamar a IA para injetar no prompt como `{CRM_SUMMARY}`.
