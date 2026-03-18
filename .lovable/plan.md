

# Redesign Premium do AutomationConfigTab

## Resumo

Reorganizar visualmente o `AutomationConfigTab.tsx` em 4 Cards premium com headers icônicos + badges, e uma barra sticky glassmorphism no rodapé. Toda a lógica (estados, hooks, handlers, Supabase) permanece intacta.

## Mudanças no arquivo `AutomationConfigTab.tsx`

### 1. Cards com Headers Premium

Cada card terá um header com ícone colorido em container arredondado + Badge de status:

| Card | Ícone | Cor | Badge |
|---|---|---|---|
| Chat Tork (Chatwoot) | `MessageCircle` | `bg-blue-500/10 text-blue-500` | "Integração" |
| Webhook do CRM | `Link` | `bg-emerald-500/10 text-emerald-500` | "Endpoint" |
| n8n Automação | `Zap` | `bg-amber-500/10 text-amber-500` | "Webhook" |
| Mapeamento de Inboxes | `Users` | `bg-purple-500/10 text-purple-500` | "Roteamento" |

Cada header usa o padrão existente (`CardHeader` + `CardTitle` + `CardDescription`) com o ícone em `w-10 h-10 rounded-xl` e um `Badge` do shadcn ao lado do título.

### 2. Card 2 — Webhook com Alert Info

O bloco de instruções atual (linhas 600-611) será convertido para usar o componente `Alert` + `AlertDescription` do shadcn com `variant="default"` e ícone `Info`, dando aspecto de painel informativo em vez de div manual.

### 3. Card 4 — Wrapper para InboxAgentMapping

Envolver `<InboxAgentMapping />` num Card com o header de ícone roxo `Users` + Badge "Roteamento". O componente interno não será alterado.

### 4. Sticky Save Bar — Glassmorphism

Substituir a barra sticky atual (linhas 680-686) por:

```tsx
<div className="sticky bottom-0 z-10 -mx-6 px-6 py-4 bg-background/60 backdrop-blur-xl border-t border-border/50">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Shield className="h-3.5 w-3.5" />
      <span>Credenciais armazenadas com criptografia AES-256</span>
    </div>
    <Button onClick={handleSave} disabled={saving} size="lg">
      {saving ? <Loader2 /> : <Save />}
      Salvar Configurações
    </Button>
  </div>
</div>
```

### 5. Imports adicionais

- `Badge` de `@/components/ui/badge`
- `Alert, AlertDescription` de `@/components/ui/alert`
- `Zap, Shield, Info, Users` de `lucide-react`

### 6. Motor de IA (Card existente)

Já está bem estruturado — apenas alinhar o estilo do header com o novo padrão (Badge "IA" ao lado do título, mesma estrutura dos outros cards).

## Arquivo afetado

Apenas `src/components/automation/AutomationConfigTab.tsx` — rewrite do JSX de retorno (linhas 365-689), mantendo todos os estados, handlers e lógica inalterados.

