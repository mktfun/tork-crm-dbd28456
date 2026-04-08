# Design Document: Layout Normalization

## 1. O Novo Padrão de Container
Para manter a consistência sem usar o `RootLayout`, criaremos uma classe de utilidade ou padrão visual para as páginas padrão:

```tsx
<div className="flex-1 overflow-y-auto p-4 md:p-6">
  <div className="max-w-[1600px] mx-auto space-y-6">
    {/* Conteúdo da Página */}
  </div>
</div>
```

As páginas de Ferramenta Full-Screen (Kanban, SDR Builder) ignorarão o `max-w` e o `p-6` para usar 100% da tela.

## 2. SDR Builder: Ajuste de Altura Dinâmica
Atualmente o SDR Builder usa `h-[calc(100vh-140px)]`. Vamos mudar para uma abordagem baseada em flexbox puro:
- `AIAutomationDashboard` será `h-full flex flex-col`.
- `TabsContent` será `flex-1 min-h-0`.
- `SDRBuilderContent` preencherá o container pai totalmente com `h-full`.

## 3. Lista de Páginas para Patch de Layout
- **Dashboard.tsx:** Já tem `p-6 space-y-8`, mas precisa garantir o `overflow-y-auto` interno.
- **Clients.tsx:** Já tem `space-y-6 p-6`.
- **Policies.tsx:** Verificar e adicionar `p-6`.
- **CRM.tsx:** Manter `h-[calc(100vh-6rem)]` mas remover conflitos de padding lateral se necessário.
- **Settings.tsx:** Adicionar margens.
- **FinanceiroERP.tsx:** Adicionar margens.
- **Tasks.tsx:** Adicionar margens.
