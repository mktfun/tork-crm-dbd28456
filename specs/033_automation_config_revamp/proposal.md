# PROPOSAL: UI/UX Revamp da Automação e Configurações (Spec 033)

## 1. Requisitos e User Stories
**Problema:** A tela de `Configurações` dentro da aba de Automações (onde fica o `AutomationConfigTab.tsx`) cresceu muito nas últimas atualizações. Hoje ela é um pergaminho vertical infinito contendo Motor de IA, ElevenLabs, Chatwoot, n8n, Alertas e Inboxes, misturando responsabilidades técnicas e operacionais de forma confusa.

**Objetivo:** Transformar a `AutomationConfigTab` em um painel organizado de categorização. Adotar um padrão de "Configurações Modernas" (ex: Sidebar interna ou Menu em Pílulas superiores) separando os assuntos contextualmente.

## 2. O que JÁ EXISTE (reutilizado)
- O Gerenciamento de Estado: Toda a lógica do `AutomationConfigTab.tsx` (`settings`, `fetchSettings`, `handleSave`, handles de `Test`) funciona perfeitamente, não mudaremos o Core State nem migrações de DTOs ao salvar.
- O mapeamento de Inboxes já reside em um componente próprio (`InboxAgentMapping.tsx`).
- O banco de dados (`brokerages`, `crm_ai_global_config`, `crm_settings`) continuará intocado.

## 3. O que será CRIADO/MODIFICADO
Vamos refatorar **apenas a camada de visão (JSX)** do `AutomationConfigTab.tsx`:
1. **Vertical/Horizontal Tab Menu:** Criar um sub-menu lateral (ou pílulas de navegação baseadas em estado local) contendo as abas:
   - 🧠 **Motor de IA** (Provedor, Chave, ElevenLabs)
   - 🛡️ **Regras & Alertas** (Escalonamento, Telefone Admin, Inbox Mapping)
   - 🔌 **Integrações** (Chatwoot, n8n, Webhook CRM)
2. **Separação de Render:** Os 5 Cards gigantescos não ficarão mais todos numa mesma pilha, mas exibidos condicionalmente dependendo da sub-aba escolhida.
3. **Manteção da Barra Salvar:** A barra inferior "glassmorphism" do `handleSave` continuará englobando e detectando mudanças generalizadas (Global Save).

## 4. Critérios de Aceite
- [ ] A tela de Configurações dentro de Automação de IA deve ter uma navegação secundária intuitiva e dividida por assuntos.
- [ ] Não pode haver quebra funcional — salvar continua persistindo exatamente os mesmos dados de antes onde estiverem inseridos.
- [ ] Visual mais "limpo", priorizando espaço em branco inteligente e menor ruído visual de formulários compridos.
