# Checklist de Tarefas: 037 Automation UI Revamp

Este checklist guia a refatoração do Frontend da Automação para a estética "Liquid Glass" e a introdução do construtor visual.

## Fase 1: Limpeza e Redesign da Configuração Geral (Usuários Normais)
- [ ] Ocultar (mover) a aba de "Configurar Etapas" (com o Sandbox e a Linha do Tempo) do `AIAutomationDashboard.tsx` atual.
- [ ] Recriar a tela de `Automação (Configuração)` como um painel central "Liquid Glass", com fundo translúcido (`backdrop-blur-xl`).
- [ ] Criar "Cards de Persona" para substituir seletores feios de personalidade (ex: O Vendedor, O Técnico), utilizando ícones 3D ou SVG animados.
- [ ] Substituir toggles simples por toggles com efeito glow (que emitem cor primária quando ativos) para ligar a IA em funis inteiros de forma simplificada.
- [ ] Limpar as instruções globais: deixar apenas um input limpo para "Regras do seu Negócio" (as strings técnicas devem ficar ocultas na engine).

## Fase 2: Nova Tela SDR Flow Builder (Admin/Avançado)
- [ ] Criar a rota ou sub-aba "SDR Builder" (disponível apenas para configs avançadas).
- [ ] Implementar a estrutura de Layout do Flow: Sidebar Esquerda (Paleta de Ferramentas), Canvas Central (Grid dot/grid-small), Sidebar Direita (Propriedades).
- [ ] **Canvas Visual:** Renderizar blocos (nós/cards) que representem as Tools que a IA tem acesso (ex: "Criar Lead", "Buscar Apólice").
- [ ] Permitir que o usuário adicione (arraste ou clique) blocos de Tools da Sidebar Esquerda para o Canvas.
- [ ] **Sidebar de Propriedades:** Ao clicar num bloco (Tool) no Canvas, abrir a Sidebar Direita permitindo configurar propriedades simplificadas (ex: Tool "Criar Cliente" -> Checkbox: "Exigir CPF?").
- [ ] Integrar com o estado global da IA, salvando a configuração das Tools no Supabase (seja via `crm_ai_settings` ou um novo campo jsonb de UI/Tools).

## Fase 3: Polimento Premium
- [ ] Refatorar todos os modais da tela de automação para o estilo translúcido minimalista.
- [ ] Adicionar animações `framer-motion` no carregamento da tela e nas trocas de abas.
- [ ] Garantir que não existam erros de TypeScript ou linting nas novas implementações.
- [ ] Remover código do `AIAutomationDashboard.tsx` antigo que não seja mais utilizado, isolando a lógica complexa na tela de SDR Builder.
