# Design Document: Layout & SDR Expansion

## 1. Arquitetura Visual (Fixes)

### O Problema do Container "Inception"
A aba atual tem a classe `<div className="h-full flex flex-col min-h-0 bg-background/50">` e repousa no `RootLayout`, que já aplica um background próprio e preenche o viewport. Ao aplicarmos mais classes de `bg` e padding ou limitarmos com barras que não expandem na troca (`overflow-hidden`), o conteúdo parece preso numa janela menor.

### A Correção de Layout:
- Vamos **REMOVER** `bg-background/50` de `AIAutomationDashboard.tsx`.
- O `<Tabs>` deve ocupar toda a área útil, usando `className="flex-1 flex flex-col h-full w-full relative"`.
- A aba de **SDR Builder** continuará preenchendo até a base e desativando o scroll do documento para permitir o *pan & zoom* do canvas do `ReactFlow`.
- O cabeçalho de botões (TabList) ficará alinhado de forma natural (sem margens desnecessárias) e usará o fundo da página (glassmorphism contínuo).

## 2. Refinamento de Estilos (ReactFlow Dark Mode)
Para nós da "SDR Builder":
- Os Cards usarão `bg-card text-card-foreground border-border`.
- Retiraremos strings baseadas exclusivamente em `bg-[cor]-500/10`, combinando elas com `dark:bg-[cor]-900/40 dark:border-[cor]-500/50` para dar vivacidade ao fundo negro, e garantiremos que o texto use `text-foreground`.
- O componente de propriedades (Right Sidebar) precisa ter seu fundo adaptado para `bg-background/95 dark:bg-background/80 backdrop-blur-xl`.

## 3. Estrutura dos Novos Nodes (Ferramentas e Ações)
O arquivo `SDRBuilder.tsx` incluirá novas opções na Paleta (Left Sidebar):

```typescript
const AVAILABLE_TOOLS = [
  { type: 'tool_create_client', label: '👤 Criar Cliente', color: 'bg-emerald-500/10 dark:bg-emerald-900/30 border-emerald-500/30' },
  { type: 'tool_search_policy', label: '📄 Buscar Apólice', color: 'bg-blue-500/10 dark:bg-blue-900/30 border-blue-500/30' },
  { type: 'tool_financial', label: '💰 Consultar Financeiro', color: 'bg-amber-500/10 dark:bg-amber-900/30 border-amber-500/30' },
  // Novos
  { type: 'action_move_deal', label: '🔄 Mover Negociação', color: 'bg-indigo-500/10 dark:bg-indigo-900/30 border-indigo-500/30' },
  { type: 'action_close_deal', label: '🏆 Ganho / ❌ Perda', color: 'bg-red-500/10 dark:bg-red-900/30 border-red-500/30' },
  { type: 'action_send_text', label: '💬 Enviar Texto Padrão', color: 'bg-cyan-500/10 dark:bg-cyan-900/30 border-cyan-500/30' },
  { type: 'action_custom_prompt', label: '🧠 Instrução Livre', color: 'bg-fuchsia-500/10 dark:bg-fuchsia-900/30 border-fuchsia-500/30' },
  { type: 'decision_condition', label: '🔀 Decisão (Se... Então)', color: 'bg-yellow-500/10 dark:bg-yellow-900/30 border-yellow-500/30' },
];
```

Cada um dos novos blocos terá, quando clicado, seu próprio conjunto simplificado de propriedades no painel lateral (Ex: O "Instrução Livre" terá um `<Textarea>` na sidebar da direita; o "Mover Negociação" exibirá os IDs das etapas do funil).
