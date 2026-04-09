# Checklist de Tarefas: 045 SDR Leak Fix & Hardening

## Fase 1: Correção do Build e Hard Stop (Backend)
- [ ] Editar `supabase/functions/ai-assistant/index.ts`.
- [ ] Remover declarações duplicadas de `supabaseUrl`, `supabaseServiceKey` e `supabase`.
- [ ] Mover a inicialização do `createClient` para o topo do bloco `try`.
- [ ] Adicionar logs: `[SDR-START]`, `[SDR-SIMULATION-WORKFLOW]`, `[SDR-RESULT]`.
- [ ] Implementar o `return` obrigatório (Hard Stop) se `is_simulation === true`.

## Fase 2: Engine Determinística (engine-sdr.ts)
- [ ] Validar estrutura de `workflow.nodes` e `workflow.edges` no início de `processSDRFlow`.
- [ ] Adicionar função `sanitizeOutput` e aplicar em todos os retornos de conteúdo.
- [ ] Garantir que o nó de decisão use apenas o LLM para retornar "TRUE" ou "FALSE".

## Fase 3: Blindagem Visual (Frontend)
- [ ] Editar `src/components/automation/builder/SDRSimulator.tsx`.
- [ ] Implementar limpeza de `<thinking>` no texto da mensagem recebida.
- [ ] Adicionar detecção de fallback indevido (Amorim AI) e exibir erro visual amigável.

## Fase 4: Estabilização de Tipagem (TS Fix)
- [ ] Editar `src/components/automation/builder/SDRBuilder.tsx`.
- [ ] Definir interfaces de Config e aplicá-las às variáveis de nó.
- [ ] Editar `src/hooks/useSDRWorkflows.ts`.
- [ ] Adicionar casts de tipo para silenciar erros de inferência da tabela `crm_sdr_workflows`.

## Fase 5: Validação
- [ ] Testar no simulador se, ao mandar "olá", a IA responde exatamente o texto do bloco sem tags técnicas.
- [ ] Verificar se, ao terminar o fluxo, a IA informa que o fim foi atingido.
- [ ] Garantir que o Mentor Amorim continua funcionando no dashboard principal.
