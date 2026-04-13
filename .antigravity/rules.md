# 🪐 Antigravity Vibe Coding Orchestration Rules

## 1. Core Principles

- **Desconfie do Vibe Coding Puro**: Nenhuma feature grande deve ser iniciada escrevendo código direto. Toda mudança estrutural precisa de uma Especificação (Proposal) detalhada antes.
- **Isolamento de Responsabilidade**: Você (Antigravity) coordena e "costura". Deixe tarefas massivas de banco de dados para o `Supabase MCP` e construção visual pesada para as `Stitch Skills` ou Lovable.
- **Contexto é Rei**: Sempre leia os arquivos de spec (`proposal.md`, `design.md`, `tasks.md`) antes de tocar em qualquer código. Esses documentos são a verdade absoluta do projeto.

---

## 2. Arquitetura de Pastas (Hierarquia Obrigatória)

> [!IMPORTANT]
> Ao criar ou refatorar qualquer projeto, siga esta estrutura de diretórios. Ela garante que a IA mantenha contexto, e que o humano consiga navegar o projeto sem precisar perguntar "onde fica o quê?".

### 2.1 Raiz do Projeto (Workspace)

```
meu-projeto/
├── .agent/                    # Config do agente (Antigravity, Cursor, etc)
│   └── workflows/             # Slash-commands customizados (/vibe-proposal, etc)
├── .antigravity/              # Regras e contexto do Antigravity IDE
│   └── rules.md               # ESTE ARQUIVO — regras de orquestração
├── specs/                     # Especificações de features (Spec-Kit / Vibe)
│   ├── 001-auth/              # Cada feature = uma subpasta com ID sequencial
│   │   ├── proposal.md        # Requisitos, user stories, critérios de aceite
│   │   ├── design.md          # Decisões de UI (Stitch) e DB (Supabase)
│   │   └── tasks.md           # Checklist granular de implementação
│   └── archive/               # Features já finalizadas e arquivadas
├── src/                       # Código-fonte principal
│   ├── app/                   # Rotas e páginas (Next.js/Vite)
│   ├── components/            # Componentes compartilhados/genéricos
│   │   └── ui/                # Primitivos do Shadcn (Button, Card, etc)
│   ├── features/              # ⭐ Feature-Sliced Design
│   │   ├── auth/              # Tudo de autenticação junto
│   │   │   ├── components/    # Componentes exclusivos desta feature
│   │   │   ├── hooks/         # Hooks React exclusivos
│   │   │   ├── api/           # Chamadas ao Supabase / Edge Functions
│   │   │   └── types/         # Tipagens locais da feature
│   │   ├── dashboard/
│   │   └── settings/
│   ├── lib/                   # Utilitários, helpers, clients (supabase.ts, utils.ts)
│   ├── types/                 # Tipagens globais (database.types.ts do Supabase)
│   └── styles/                # CSS global, tokens de design, variáveis
├── supabase/                  # Infraestrutura Supabase
│   ├── migrations/            # SQL de migração (gerados via CLI)
│   ├── functions/             # Edge Functions serverless
│   └── seed.sql               # Dados iniciais de desenvolvimento
├── public/                    # Assets estáticos (imagens, favicons)
├── .env.local                 # Variáveis de ambiente (NUNCA commitar)
├── package.json
└── tsconfig.json
```

### 2.2 Regras de Hierarquia

1. **Feature-Sliced Design**: Nunca jogue componentes, hooks e lógica de API soltos em pastas genéricas. Agrupe por **domínio de negócio** dentro de `src/features/`. Apenas componentes realmente compartilhados (como botões, inputs, modais genéricos) ficam em `src/components/`.
2. **Tipagens Supabase**: O arquivo `src/types/database.types.ts` é **auto-gerado** pelo comando `supabase gen types typescript`. Nunca edite manualmente.
3. **Migrações são sequenciais**: Cada arquivo em `supabase/migrations/` segue o formato `YYYYMMDDHHMMSS_descricao.sql`. Nunca altere uma migração após aplicá-la.
4. **Specs são temporárias**: A pasta `specs/` só contém trabalho em andamento. Depois de implementado e validado, mova para `specs/archive/`.
5. **Um componente = um arquivo**: Evite arquivos com múltiplos componentes exportados. Exceção: variantes pequenas de um mesmo componente base (ex: `Button` e `IconButton`).

---

## 3. Padrões de Frontend (UI/UX)

- Se a UI requer centenas de linhas JSX e CSS, não digite isso à mão. Use a skill `stitch-loop` ou `react-components` para gerar a base, e então refine.
- Puxe componentes primitivos do `shadcn/ui` (usando a skill do Stitch correspondente, se instalada).
- Quando o usuário mencionar que gerou algo no **Lovable**, foque em transformar os componentes estáticos do Lovable em **Componentes Inteligentes** amarrando-os a um backend real (Supabase).
- **Sempre exporte Requisitos Visuais** para o arquivo `design.md` dentro de uma especificação Vibe (Fase 1).
- **Naming conventions para componentes**: PascalCase para componentes (`UserCard.tsx`), camelCase para hooks (`useAuth.ts`), kebab-case para arquivos de estilo (`user-card.module.css`).

---

## 4. Padrões de Backend (Supabase)

- **Migrações são a Lei**: Nunca altere tabelas numa string solta. Use `supabase migration new "descricao"` via CLI.
- **Sincronização TypeScript**: Após cada alteração no banco, regenere tipagens: `supabase gen types typescript --local > src/types/database.types.ts`.
- **Row Level Security (RLS)**: Toda tabela pública deve ter políticas RLS ativas. Sem exceção.
- **Segredos**: NunCA hardcode chaves de API. Use variáveis de ambiente (`.env.local`) e o Supabase Vault para segredos server-side.
- **Edge Functions**: Para lógica server-side complexa (webhooks, integrações, jobs), use `supabase/functions/`. Cada function = uma pasta com `index.ts`.

---

## 5. Workflows Vibe (Sequência Obrigatória)

Todo desenvolvimento segue essa sequência rigorosa:

| Fase           | Slash Command    | O que faz                             | Gera código? |
| -------------- | ---------------- | ------------------------------------- | :----------: |
| 1. Planejar    | `/vibe-proposal` | Engenharia de requisitos + design doc |      ❌      |
| 2. Implementar | `/vibe-apply`    | Execução guiada por tasks.md          |      ✅      |
| 3. Arquivar    | `/vibe-archive`  | Move specs finalizadas para archive   |      ❌      |

---

## 6. Qualidade de Código

- **Zero `any` no TypeScript.** Se o tipo é desconhecido, use `unknown` e faça narrowing.
- **Imports limpos**: Ao finalizar um `/vibe-apply`, remova imports não usados e resolva warnings de lint.
- **Responsividade**: Toda UI deve funcionar em mobile, desktop e tablet. Use unidades relativas e media queries ou containers.
- **Acessibilidade (a11y)**: Labels em inputs, alt em imagens, contraste adequado, navegação via teclado.
- **Commits semânticos**: Use prefixos `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` nos commits.
- **Sem código morto**: Se uma função/componente não é mais usado, delete. Não comente "pra usar depois".
