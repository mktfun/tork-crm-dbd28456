# Checklist de Tarefas: 041 Immersive Layout Fix

## Fase 1: RootLayout & Global CSS
- [ ] Editar `src/layouts/RootLayout.tsx`.
- [ ] Remover `p-4 md:p-6` da tag `<main>`.
- [ ] Remover o `div` com `max-w-[1600px] mx-auto` que envolve o `<Outlet />`.
- [ ] Garantir que o `<main>` tenha `flex flex-col flex-1 overflow-hidden`.

## Fase 2: Blindagem das Páginas de Dados (Restaurar Paddings)
- [ ] **Dashboard:** Envolver conteúdo em `<div className="p-4 md:p-6 h-full overflow-y-auto space-y-8">`.
- [ ] **Clientes:** Envolver conteúdo em `<div className="p-4 md:p-6 h-full overflow-y-auto space-y-6">`.
- [ ] **Políticas:** Envolver conteúdo em `<div className="p-4 md:p-6 h-full overflow-y-auto space-y-6">`.
- [ ] **CRM Kanban:** Garantir que o container do CRM preencha o novo espaço Edge-to-Edge.

## Fase 3: SDR Builder (Fix Layout Squeeze)
- [ ] Editar `src/components/automation/AIAutomationDashboard.tsx`.
- [ ] Alterar o `TabsContent` das abas para remover margens (`m-0 p-0`) e forçar `h-full`.
- [ ] Editar `src/components/automation/builder/SDRBuilder.tsx`.
- [ ] Garantir que a `div` de retorno principal use `h-full w-full flex flex-col`.
- [ ] Certificar que o `reactFlowWrapper` tenha `relative flex-1 w-full h-full overflow-hidden`.
- [ ] Ajustar o `SDRSimulator` para não interferir no flex-box do canvas (assegurar `absolute`).

## Fase 4: Validação
- [ ] Testar se o SDR Builder encosta nas bordas da tela.
- [ ] Abrir o Simulador e verificar se o canvas (desenho) permanece centralizado e estável.
- [ ] Verificar se as páginas de lista (Clientes) continuam centralizadas e com margens.
- [ ] Comitar as mudanças (`refactor(layout): enable full-screen workspace and fix SDR builder squeeze bug`).
