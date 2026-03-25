

# Plano: Evitar que negócios "sumam" ao marcar Ganho/Perda

## Diagnóstico

Os stages de "Perdido" e "Fechado Ganho" existem corretamente no banco (pipeline `7d1e70e0...`). O deal IS sendo movido para o stage correto, mas "desaparece" da visão do usuário por dois motivos:

1. **Coluna off-screen**: O stage "Perdido" é a última coluna (posição 5). Após fechar o modal, o deal sai da coluna atual e vai para a coluna mais à direita, que pode estar fora da área visível (precisa scroll horizontal).

2. **Filtro ativo**: Se o filtro de status estiver em "Abertos", deals em stages de ganho/perda são removidos do `filteredDeals` — o deal desaparece legitimamente do filtro.

## Mudanças

### 1. `KanbanBoard.tsx` — Auto-scroll para coluna alvo

Após o modal de deal fechar e o deal ter sido movido para won/lost, fazer scroll automático da área horizontal do kanban até a coluna de destino.

- Adicionar um `ref` no container de scroll horizontal
- Ao detectar que um deal foi movido para won/lost (via state callback), usar `scrollIntoView` na coluna de destino
- Se o filtro ativo é "Abertos", trocar automaticamente para "Todos" ao marcar ganho/perda

### 2. `DealDetailsModal.tsx` — Callback de stage change

- Adicionar prop `onDealStageChanged?: (dealId: string, newStageId: string) => void`
- Chamar esse callback em `confirmMarkWon` e `confirmMarkLost` após o update, antes de fechar o modal
- O KanbanBoard recebe esse callback e usa para scrollar até a coluna correta

### 3. `KanbanBoard.tsx` — Resetar filtro se necessário

- Na callback `onDealStageChanged`, verificar se o `statusFilter` é 'open'
- Se sim, mudar para 'all' para que o deal permaneça visível
- Mostrar toast informativo: "Filtro alterado para 'Todos' para exibir o negócio movido"

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/crm/KanbanBoard.tsx` | Adicionar ref de scroll, callback de stage change, auto-reset de filtro |
| `src/components/crm/DealDetailsModal.tsx` | Adicionar prop `onDealStageChanged`, chamar nos confirm de won/lost |

## Resultado esperado

- Marcar como Perdido → filtro muda para "Todos" (se necessário) → board scrolla até a coluna "Perdido" → deal visível
- Marcar como Ganho → mesma lógica → deal visível na coluna "Fechado Ganho"

