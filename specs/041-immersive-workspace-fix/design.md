# Design Document: Immersive Layout Architecture

## 1. Refatoração do RootLayout.tsx
O container principal mudará para:
```tsx
<main className="flex-1 overflow-hidden">
   <div className="w-full h-full">
      <Outlet />
   </div>
</main>
```
*Motivo:* Sem `max-w` e sem `padding`, a página interna decide quanto espaço usar.

## 2. Padrão de Página Comum (Data Pages)
As páginas que precisam de respiro usarão o seguinte padrão:
```tsx
<div className="p-4 md:p-6 h-full overflow-y-auto">
  <div className="max-w-[1600px] mx-auto space-y-6">
     {/* Conteúdo */}
  </div>
</div>
```

## 3. SDR Builder (Full Viewport)
No arquivo `SDRBuilder.tsx`, vamos garantir que o container não sofra interferência do simulador:
- O `reactFlowWrapper` (Canvas) terá `position: relative; flex: 1; height: 100%; width: 100%;`.
- O `SDRSimulator` continuará `absolute`, mas garantiremos que o seu pai não tenha `display: flex` que possa tentar encolher o canvas ao detectar o novo elemento.

## 4. Dashboard de Automação
Ajustar as abas para que o conteúdo não tenha margens brancas se for o Builder:
```tsx
<TabsContent value="sdr-builder" className="h-full w-full m-0 p-0 flex flex-col overflow-hidden">
  <SDRBuilder />
</TabsContent>
```
