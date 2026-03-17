

# Plano: Polimento Glass Theme + KPI Metrics

## Análise do Estado Atual

Após inspeção, **AISandbox.tsx** e **AutomationConfigTab.tsx** já implementam Card, ScrollArea, Avatar e a estrutura solicitada nas iterações anteriores. As mudanças reais necessárias são mínimas:

### Já implementado (não precisa alterar)
- AISandbox: `Card` com `backdrop-blur-sm`, `ScrollArea`, `Avatar` com Bot/User, Input + Send no `CardFooter`
- AutomationConfigTab: Cards para "Motor de Inteligência" e "Chatwoot" com grid e Labels

### O que falta

**1. Refinar classes Glass no AISandbox.tsx** (ajustes cosméticos)
- Adicionar `rounded-tr-none` no balão do usuário e `rounded-tl-none` no balão da IA — já está com `rounded-xl` mas os cantos cortados não estão aplicados (linhas 227-233 já têm isso, na verdade). Verificado: já implementado.

**2. Painel de KPI Metrics no AIAutomationDashboard.tsx** (nova seção)
- Este é o item realmente novo. Adicionar uma barra de KPI Cards no topo da aba "etapas", acima do grid de colunas (linha 198).
- 3 Cards em `grid grid-cols-1 md:grid-cols-3 gap-4 px-4 pt-4`:
  - **Total de Conversas**: count de mensagens processadas (placeholder estático por agora, sem tabela de logs de conversas)
  - **Etapas Ativas**: count de `aiSettings.filter(s => s.is_active).length`
  - **Taxa de Automação**: percentual de etapas com IA ativa vs total de etapas
- Cada KPI: `<Card className="bg-card/80 backdrop-blur-sm border-border/50">` com valor em `text-2xl font-bold` e label em `text-xs text-muted-foreground`

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/components/automation/AIAutomationDashboard.tsx` | Adicionar barra de KPI Cards no topo da aba "etapas" |

Escopo cirúrgico: ~30 linhas adicionadas em um único arquivo. Os demais já estão conformes com o design system.

