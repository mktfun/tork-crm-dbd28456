

## Redesign da Tela de Automacao de Vendas

Polimento visual e funcional em 6 arquivos, sem alterar logica de negocio, hooks ou edge functions.

---

### Mudancas por arquivo

**1. `AIAutomationDashboard.tsx`**
- Redesign do header: icone em container arredondado + subtitulo descritivo
- Tabs com estilo underline (border-bottom) em vez de pill com `h-12`
- Corrigir indentacao das props de `SalesFlowTimeline` e `AISandbox`

**2. `SalesFlowTimeline.tsx`**
- Compactar header em 1 linha: Select de funil + 3 botoes ghost icon-only (DNA, Settings, Plus)
- Mover contagem de etapas para barra secundaria abaixo do select
- Tooltips mais descritivos ("Configurar persona padrao de IA para este funil")
- Adicionar separadores visuais (div w-px h-4) entre StageFlowCards em vez do connector absoluto

**3. `StageFlowCard.tsx`**
- Remover linha conectora absoluta (`absolute left-6 -bottom-4`)
- Labels expandidas: remover `uppercase tracking-wider`, usar casing normal
- Toggle IA/Manual: largura fixa `w-10 text-center` para evitar layout shift

**4. `IntegrationFlowViz.tsx`**
- Remover `-mt-4` das setas
- Mudar container para `items-end pb-1` e setas para `mb-5`
- Cada step node recebe `flex-1` para distribuicao uniforme

**5. `AISandbox.tsx`**
- Adicionar badge "Gemini Flash" ao lado do titulo do header
- Corrigir hint de "Ctrl+Enter" para "Enter para enviar"
- Sugestoes contextuais baseadas no nome da etapa selecionada (lead, contato, proposta, suporte)
- Adicionar collapsible "Ver system prompt enviado ao Gemini" com preview do prompt montado
- Novo estado local `showPrompt` e funcao `buildSystemPromptPreview` replicada do hook

**6. `AutomationConfigTab.tsx`**
- Adicionar header padrao com icone Settings + titulo + subtitulo
- Remover botoes "Salvar" duplicados dos cards Chatwoot e n8n
- Adicionar botao unico "Salvar Tudo" sticky no rodape
- Card Webhook do CRM: adicionar icone verde `Link` no header

---

### Detalhes tecnicos

**Imports adicionais necessarios:**
- `AISandbox.tsx`: `Badge`, `ChevronRight`, `Sparkles` do lucide + logica de `AI_PERSONA_PRESETS` e `GLOBAL_SYNTAX_RULES` de `aiPresets`
- `AutomationConfigTab.tsx`: `Settings`, `Link` do lucide-react
- `SalesFlowTimeline.tsx`: `React` (para Fragment)

**System prompt preview no Sandbox:**
Replicar a logica de `buildSystemPrompt` do hook `useAISandbox` como funcao pura local no componente `AISandbox.tsx`, recebendo o `sandboxConfig` ja montado. Isso evita alterar o hook.

**Sugestoes contextuais:**
Funcao `getSuggestions(stageName: string)` que faz match por keywords no nome da etapa (lead, contato, proposta, sinistro) e retorna 3 frases relevantes.

**Botao Salvar unificado:**
Os botoes "Testar Conexao", "Sincronizar Etiquetas" e "Enviar Teste" permanecem nos seus respectivos cards. Apenas os botoes "Salvar" sao removidos dos cards e substituidos por um unico botao sticky no final da pagina.

**Nenhuma alteracao em:**
- Hooks (`useAISandbox`, `useCrmAiSettings`, etc.)
- Edge functions
- Props/interfaces de componentes
- Logica de toggle, vibe selection, debounce, reset

