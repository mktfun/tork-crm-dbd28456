# TASKS: UI/UX Revamp da Automação e Configurações (Spec 033)

## Fase 1: Arquitetura Base da Nova Nav
- [x] Adicionar state local `activeSection` no componente principal em `AutomationConfigTab.tsx` para gerir o sub-roteamento (`'ai' | 'rules' | 'integrations'`).
- [x] Construir layout de 2 colunas usando subconjunto flex/grid.
- [x] Construir o Sub-menu vertical da esquerda usando botões estilizados (destaque no ativo, hover no inativo, ícones como Brain, Shield, Plug).

## Fase 2: Organização de Componentes/Cards Existentes
- [x] Reposicionar os Cards de Motor e ElevenLabs dentro do check in-memory da aba `'ai'`.
- [x] Reposicionar os Cards de Alerta SDR e Mapeamento de Inboxes para a aba `'rules'`.
- [x] Reposicionar os Cards de Chatwoot, n8n, e Webhook endpoint na aba `'integrations'`.

## Fase 3: Ajustes Finos (UX)
- [x] Garantir que o container da direita não perca padding ou margin excessão no alinhamento com a nova barra lateral.
- [x] Confirmar que o layout reage a dispositivos menores (esconder barra lateral ou transformar em pills horizontais se for mobile `< md`).
- [x] Checar botão 'Salvar Configurações' ainda ancorado corretamente no root abaixo.

## Fase 4: Avaliação
- [x] Testar acesso ao /automation
- [x] Validar lint e build de componentes (passou localmente no vite build 5.4 sem erros de compilação JSX).
