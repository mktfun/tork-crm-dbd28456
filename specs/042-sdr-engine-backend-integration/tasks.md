# Checklist de Tarefas: 042 SDR AI Engine

## Fase 1: Infraestrutura de Dados (Database)
- [ ] Criar migração SQL `create_sdr_workflows_table` no Supabase.
- [ ] Adicionar colunas `nodes`, `edges`, `trigger_config` (jsonb).
- [ ] Habilitar RLS e criar políticas de acesso para `user_id`.

## Fase 2: Integração de Dados no Frontend
- [ ] Criar o hook `src/hooks/useSDRWorkflows.ts` usando TanStack Query.
- [ ] Implementar funções `fetchWorkflows`, `upsertWorkflow` e `deleteWorkflow`.
- [ ] Refatorar `SDRBuilder.tsx` para carregar dados do banco e persistir ao clicar em "Salvar".

## Fase 3: Engine de Backend (Graph Traversal)
- [ ] Criar o arquivo `supabase/functions/ai-assistant/engine-sdr.ts`.
- [ ] Implementar lógica para mapear o nó atual do histórico de chat.
- [ ] Criar prompt dinâmico que descreve o grafo para o LLM.
- [ ] Garantir que decisões do LLM (True/False) movam o ponteiro do fluxo corretamente.

## Fase 4: Conectividade do Simulador
- [ ] Atualizar `SDRSimulator.tsx` para realizar chamadas à Edge Function.
- [ ] Enviar o grafo atual (nodes/edges) no corpo da requisição de simulação.
- [ ] Exibir indicadores de "Processando lógica de fluxo" na UI do simulador.

## Fase 5: Ativação em Produção
- [ ] Modificar `supabase/functions/ai-assistant/index.ts` para interceptar mensagens de contatos externos.
- [ ] Validar se o contato se encaixa nas regras de Gatilho (Trigger) do workflow ativo.
- [ ] Comitar as mudanças (`feat(automation): transform sdr builder into a functional ai engine`).
