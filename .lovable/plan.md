

# Plano: Debounce nos inputs de follow-up

## Problema

Os 3 campos de follow-up (intervalo, tentativas, mensagem) chamam `onSaveConfig` diretamente no `onChange`. Cada tecla dispara uma mutation → invalidação do React Query → re-render do componente → input perde foco.

A missão (`ai_objective`) não tem esse problema porque usa estado local + `useDebounce`.

## Correção

No `StageFlowCard.tsx`, adicionar estado local para os 3 campos de follow-up e usar debounce antes de salvar, seguindo o mesmo padrão já usado para `mission`:

1. Criar 3 estados locais: `followUpInterval`, `followUpMaxAttempts`, `followUpMessage`
2. Inicializar com os valores de `aiSetting`
3. Sincronizar com dados externos (mesmo padrão do `mission` com ref de foco)
4. Usar `useDebounce` (já importado) para auto-save após 1.5s de inatividade
5. Remover as chamadas diretas a `onSaveConfig` dos `onChange`

| Arquivo | Ação |
|---|---|
| `src/components/automation/StageFlowCard.tsx` | Adicionar estado local + debounce para os 3 inputs de follow-up |

Sem migration. Sem deploy.

