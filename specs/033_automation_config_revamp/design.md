# DESIGN: UI/UX Revamp da Automação e Configurações (Spec 033)

## 1. Arquitetura UI no `AutomationConfigTab.tsx`

Como o componente já detém de todo o estado lógico (`useState` hooks para Chatwoot, n8n, AI, etc), dividir em múltiplos arquivos causaria uma dor de cabeça com *Context* ou "Lifting State Up" desnecessário, afinal eles não são reaproveitados em outro local senão ali.

Portanto, a solução estrutural ideal com **Antigravity** é:
- Refatorar o retorno JSX substituindo o layout simples empilhado (Stack Vertical) por um layout em Grade com 2 Columnas (Estilo painel Dashboard lateral): `grid-cols-4` (ou `12`).
- A coluna da ESQUERDA `col-span-1` se torna um Nav de categorias (`ul>li` estilizados como botoões de toggle vertical).
- A coluna da DIREITA `col-span-3` muda renderização dinamicamente por um pequeno router in-memory (`activeSection`).

## 2. Mapa de Sessões (Nav)

| Seção | Título Menu | Conteúdo Renderizado (Cards Originais Reutilizados) |
|-------|-------------|-----------------------------------------------------|
| `ai` | 🧠 IA & Síntese | - Motor de Inteligência <br/> - ElevenLabs (Voz do SDR) |
| `rules`| 🛡️ Regras SDR | - Alertas do SDR (Admin Phone) <br/> - Mapeamento de Inboxes (`<InboxAgentMapping />`) |
| `integrations`| 🔌 Integrações | - Chat Tork (Chatwoot keys) <br/> - Webhook CRM <br/> - n8n Avançado |

## 3. Comportamento Mantido
A faixa Glassmorphism flutuante na base da janela contendo "Salvar Configurações" abraçará o container root do `AutomationConfigTab` em `flex-1`, mantendo-se sempre visível ao scroll para que o usuário altere algo em `ai`, navegue para `rules`, mude lá também, e salve tudo em um botão final globalmente de uma única vez.
