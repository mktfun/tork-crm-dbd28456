# Design Document: Automation UI Revamp

## 1. Arquitetura da Interface (Stitch MCP)

A nova tela de Automação de IA `/src/pages/AIAutomation.tsx` será dividida em duas rotas ou abas principais, totalmente separadas para evitar confusão cognitiva.

### 1.1 Configuração Geral (Visão do Usuário Final)
- **Painel Central "Liquid Glass":** Utilizará um container principal com fundo translúcido (blur pesado, bordas sutis neon/primárias).
- **Cards de Personalidade (Personas):** Em vez de selects dropdown feios, apresentaremos cards selecionáveis de "Modo de Operação" (O Amigo, O Vendedor Agressivo, O Consultor Técnico, O Geral), com avatares ou ícones grandes.
- **Toggles "Magical":** Ativar a IA nos funis (ex: "Automóvel", "Saúde") deve parecer "ligar um reator", com um botão toggle que brilhe quando ativo (usando `framer-motion`).
- **Instruções Base:** Apenas um campo de texto focado no objetivo primário da empresa, ocultando os detalhes de sistema (ex: ocultar os prompts técnicos de RLS).

### 1.2 SDR Flow Builder (Visão Avançada/Admin)
- **Inspiração:** n8n, Flowise, ou um diagrama de blocos simples usando `reactflow` ou grids personalizados conectáveis.
- **Estrutura:** 
  - **Left Sidebar:** Paleta de "Tools" (ex: CRUD Clientes, Consultar Financeiro, Buscar Apólice, Agendar).
  - **Canvas:** Uma malha sutil pontilhada (`bg-grid-small`) onde as "Tools Ativas" podem ser visualizadas. Em vez de conexões complexas lógicas ("se A então B"), será um construtor de **Capabilities** (Capacidades) por etapa.
  - **Right Sidebar (Propriedades):** Ao clicar em uma Tool no Canvas, abre-se uma gaveta (Drawer/Sidebar) para editar opções limitadas: "Obrigatório ter CPF?", "Permitir deletar?".

## 2. Padrão Estético "Liquid Glass 2026"
- **Cores e Efeitos:** Abundância de fundos transparentes (`bg-white/5` dark mode, ou `bg-black/5` light mode) com `backdrop-blur-xl`, `border-white/10`.
- **Botões Premium:** Botões com gradiente suave e box-shadow brilhante quando o mouse passar por cima (Glow Effect).
- **Referências:** Estilo do Cursor AI, Framer, Vercel, Stripe. Nada de cards com fundo branco chapado num fundo cinza claro.

## 3. Modelo de Dados (Supabase MCP)
Nesta fase inicial, a prioridade é o **Frontend**. A estrutura existente no banco (tabelas `crm_ai_settings`, `crm_ai_global_config`) não precisa sofrer grandes migrações lógicas ainda, mas poderá ser adaptada para armazenar o layout dos nós do SDR (caso seja usado `reactflow`), adicionando um campo `ui_layout (jsonb)`. A separação do prompt global em blocos menores (ferramentas ativas, persona) já é compatível com o sistema dinâmico.
