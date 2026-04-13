# Master Spec: 038 Layout Fixing & SDR Builder Expansion

## 1. Visão Geral
Este documento aborda a necessidade imediata de refatorar problemas visuais e de layout na recém-criada tela de Automação de IA (AIAutomation), resolvendo o comportamento de "tela aninhada/margins esquisitas" e bugs de responsividade no eixo vertical. Adicionalmente, amplia o escopo do "SDR Visual Builder", adicionando novas capacidades modulares para que o usuário possa definir ações e decisões da IA através de blocos na interface gráfica.

## 2. Requisitos e Lacunas Atuais
- **R1 (Problema de Container Duplo):** A página `AIAutomationDashboard.tsx` introduziu backgrounds redundantes (`bg-background/50` sobre outro fundo) que criam margens visíveis. Quando a aba é trocada (ex: para Avançado), o layout não estica para `h-full`, causando "agitação" visual na altura.
- **R2 (Modo Escuro no ReactFlow):** Os nós do construtor SDR atuais têm classes CSS fixas que não contrastam bem no modo escuro (ficam brancos num fundo claro ou escuro sem legibilidade).
- **R3 (Escalabilidade do Agente SDR):** O usuário precisa de novas "Tools" (Nodes/Blocos) para definir o comportamento da IA. Precisamos adicionar blocos focados em ações de CRM e "Processamento Cognitivo".

## 3. Soluções e Expansões
### 3.1 Correção de Layout "Liquid Glass"
- A remoção das classes `bg-background/50` e `p-4` redundantes no nível do Dashboard.
- O uso de `flex-1 w-full h-full` absoluto no contêiner raiz, garantindo que o `TabsContent` absorva todo o espaço do `Outlet` do `RootLayout` sem piscar ao trocar de abas.
- O container do `LiquidAutomationConfig` e do `AutomationConfigTab` será ajustado para fluir naturalmente com barras de rolagem nativas, enquanto apenas o `SDRBuilder` ficará com `overflow-hidden` (para o Canvas ocupar a tela).

### 3.2 Novos Nós do SDR Builder (ReactFlow)
Adicionaremos os seguintes blocos modulares na barra de ferramentas lateral:
1. **Decisão (Condicional):** Um bloco "Se... Então..." (Ex: Se cliente pedir cotação).
2. **Ação: Mover Negociação:** Um bloco para a IA arrastar o lead no Kanban automaticamente.
3. **Ação: Marcar Ganho/Perda:** Ação de fechamento de venda ou recusa.
4. **Ação: Enviar Texto Automático:** Define um texto padronizado para a IA cuspir.
5. **Ação: Prompt Livre (Instrução Dinâmica):** O usuário digita uma ordem específica em texto limpo e a IA entende como uma "Tool" ou "Regra" daquela etapa.

## 4. User Stories
- **US1:** Como Usuário, quero navegar entre as abas da tela de automação sem ver a tela encolher e esticar de forma bugada, e não quero ver um "fundo dentro de um fundo".
- **US2:** Como Administrador, quero usar a tela de construtor do SDR no modo noturno e conseguir ler claramente os ícones e textos dentro das ferramentas no Canvas.
- **US3:** Como Estrategista de Vendas, quero poder arrastar um bloco de "Marcar Ganho/Perda" e conectá-lo na jornada da minha IA.
