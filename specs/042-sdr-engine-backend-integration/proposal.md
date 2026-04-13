# Master Spec: 042 SDR AI Engine & Backend Integration

## 1. Visão Geral
Este documento define a transição do "SDR Visual Builder" de uma ferramenta de desenho para uma engine de execução real. Vamos implementar a persistência dos fluxos no Supabase, criar a lógica de "travessia de grafos" (Graph Traversal) no backend e conectar o simulador de chat à inteligência real da IA, permitindo que as automações desenhadas assumam conversas reais com clientes.

## 2. Requisitos de Produção
- **R1: Persistência de Dados:** Criar tabelas para armazenar os workflows (nodes, edges, config) vinculados ao usuário.
- **R2: SDR Engine (Edge Function):** Implementar um módulo na Edge Function `ai-assistant` que consiga interpretar o JSON do ReactFlow e decidir qual o "próximo nó" baseado na intenção do usuário.
- **R3: Conectividade do Simulador:** O `SDRSimulator.tsx` deve parar de usar mensagens mockadas e realizar chamadas reais para a Edge Function em "modo de teste".
- **R4: Roteamento de Gatilho (Trigger Routing):** O sistema deve identificar se uma mensagem recebida de um cliente deve disparar um fluxo SDR específico baseado nas regras configuradas no nó "Início da Conversa".

## 3. Arquitetura de Execução

### 3.1 Esquema de Banco de Dados
Nova tabela `crm_sdr_workflows`:
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `name`: TEXT
- `is_active`: BOOLEAN
- `nodes`: JSONB (Estrutura do ReactFlow)
- `edges`: JSONB (Estrutura do ReactFlow)
- `trigger_config`: JSONB (Alvo, Funil, Etapa)

### 3.2 Lógica da Engine (The Graph Runner)
A IA não receberá apenas o prompt de texto. Ela receberá a **Topologia do Fluxo** como contexto.
1. **Identificação do Estado:** O sistema localiza em qual nó a conversa parou (armazenado no histórico ou metadados da conversa).
2. **Decisão do Próximo Passo:**
   - Se o nó atual é uma **Decisão**, a IA avalia a mensagem do usuário contra a regra do nó e escolhe a saída `true` ou `false`.
   - Se o nó atual é uma **Ação/Ferramenta**, a engine executa a respectiva tool do Supabase e segue para `success` ou `error`.
   - Se o nó atual é uma **Mensagem**, a IA apenas emite o texto e aguarda.

## 4. User Stories
- **US1:** Como Administrador, quero clicar em "Publicar" e saber que meu desenho de fluxo foi salvo com segurança no banco de dados.
- **US2:** Como Corretor, quero que um lead que entre no meu funil de "Auto" receba automaticamente a primeira mensagem do fluxo SDR que eu desenhei.
- **US3:** Como Usuário, quero usar o simulador e ver a IA realmente executando as condicionais (ex: se eu disser que não tenho interesse, ela deve seguir o caminho de 'Perda' que eu desenhei).

## 5. Plano de Execução
1. **Database:** Criar migração para `crm_sdr_workflows`.
2. **Hook de Frontend:** Criar `useSDRWorkflows` para salvar/carregar dados reais no Builder.
3. **Backend Engine:** Criar `supabase/functions/ai-assistant/engine-sdr.ts`.
4. **Simulator Integration:** Atualizar `SDRSimulator.tsx` para chamar a Edge Function via API.
5. **Dispatcher Update:** Modificar a lógica principal do assistente para dar prioridade ao fluxo SDR ativo antes de cair na consultoria genérica.
