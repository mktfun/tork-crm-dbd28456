# Master Spec: 041 Full Screen SDR Builder & Root Layout Fix

## 1. Visão Geral
Este documento detalha a refatoração necessária para permitir que o SDR Visual Builder ocupe 100% da área útil da tela, removendo as restrições de largura e margens herdadas do layout global. O objetivo é transformar a experiência de "janela pequena" em uma estação de trabalho completa e imersiva para automação, mantendo a consistência nas demais páginas do sistema.

## 2. Diagnóstico Técnico
O problema de "quadradinho pequeno" ocorre devido a uma combinação de fatores no `RootLayout.tsx`:
1. **Paddings Fixos:** O container `<main>` possui `p-4 md:p-6`, forçando margens em todos os lados de todas as páginas.
2. **Largura Máxima:** Existe um wrapper `<div className="max-w-[1600px] mx-auto">` que impede que ferramentas de canvas (como o ReactFlow) se expandam em monitores ultra-wide.
3. **Overflow Conflitante:** O `RootLayout` usa `overflow-y-auto`, o que cria barras de rolagem duplas ou corta o canvas do SDR Builder.

## 3. Proposta de Solução (Arquitetura)

### 3.1 Refatoração do RootLayout
Vamos inverter a responsabilidade do padding e da largura máxima:
- O `RootLayout` passará a entregar um container **cru e limpo** (`w-full h-full overflow-hidden`).
- Cada página será responsável por definir seu próprio `padding` e `max-width`.
- Páginas de lista/dashboard (Clientes, Políticas, Início) ganharão o wrapper `p-6 max-w-[1600px] mx-auto`.
- Páginas de "Ferramenta" (CRM Kanban, SDR Builder) usarão `w-full h-full` sem margens.

### 3.2 Ajustes no SDR Builder
- O componente `SDRBuilderContent` será ajustado para remover qualquer `h-[calc(...)]` residual e usar `flex-1 h-full`.
- O canvas do `ReactFlow` ocupará 100% do espaço vertical e horizontal disponível abaixo do Header do dashboard de automação.

## 4. User Stories
- **US1:** Como Administrador, quero abrir o SDR Builder e ver o canvas ocupando toda a largura da minha tela, permitindo desenhar fluxos maiores sem margens brancas nas laterais.
- **US2:** Como Usuário, quero que as telas de formulários e listas continuem centradas e com margens agradáveis, sem que a mudança no layout global as deixe "coladas" no canto da tela.

## 5. Plano de Execução
1. Modificar `RootLayout.tsx` para remover paddings e max-width globais.
2. Atualizar `Dashboard.tsx`, `Clients.tsx`, `Policies.tsx`, `Sinistros.tsx`, `Appointments.tsx`, `FinanceiroERP.tsx`, `Auth.tsx`, `Settings.tsx`, e `Tasks.tsx` injetando o container de margens padrão.
3. Ajustar `AIAutomation.tsx` e `AIAutomationDashboard.tsx` para garantir que o SDR Builder flutue em tela cheia.
