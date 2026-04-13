# Checklist de Tarefas: 041 Full Screen Layout

## Fase 1: Limpeza do RootLayout
- [ ] Editar `src/layouts/RootLayout.tsx`.
- [ ] Remover `p-4 md:p-6` da tag `<main>`.
- [ ] Remover `max-w-[1600px] mx-auto` da div que envolve o `<Outlet />`.
- [ ] Garantir que o `<main>` tenha `overflow-hidden` por padrão, delegando o scroll para as páginas.

## Fase 2: Blindagem das Páginas Existentes
- [ ] **Dashboard:** Envolver conteúdo em div com `p-6 overflow-y-auto h-full`.
- [ ] **Clientes:** Envolver conteúdo em div com `p-6 overflow-y-auto h-full`.
- [ ] **Políticas:** Envolver conteúdo em div com `p-6 overflow-y-auto h-full`.
- [ ] **CRM Kanban:** Garantir que o Kanban ocupe a tela cheia horizontalmente agora que o `RootLayout` liberou o espaço.

## Fase 3: SDR Builder Imersivo (Full Screen)
- [ ] Editar `src/components/automation/builder/SDRBuilder.tsx`.
- [ ] Mudar a div de retorno de `h-[calc(100vh-140px)]` para `h-full flex-1`.
- [ ] Garantir que o container pai (`AIAutomationDashboard.tsx`) use `flex-1 h-full` nas abas.
- [ ] Verificar se as ferramentas de zoom/pan do ReactFlow continuam funcionando em toda a área expandida.

## Fase 4: Validação
- [ ] Testar em monitor ultra-wide (simulado) para ver se o SDR Builder expande.
- [ ] Testar em Mobile para garantir que as margens continuam funcionando (via paddings internos).
- [ ] Comitar as mudanças (`refactor(layout): enable edge-to-edge display for builder and normalize root container`).
