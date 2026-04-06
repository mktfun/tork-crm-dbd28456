# 🪐 Antigravity Config Kit

> **Pacote portável de configurações, skills e workflows para Google Antigravity (Gemini Code Assist).**
> Clone este repo e importe em qualquer workspace para obter workflows de Vibe Coding, skills de Design 2026, e regras de orquestração prontas.

---

## 🚀 Como Usar

### Opção 1: Copiar para seu projeto (Recomendado)
```bash
# Clone este repo
git clone https://github.com/davi-449/antigravity-config.git

# Copie as pastas para o seu projeto
cp -r antigravity-config/.agent/ meu-projeto/.agent/
cp -r antigravity-config/.antigravity/ meu-projeto/.antigravity/
```

### Opção 2: Referenciar como submódulo Git
```bash
cd meu-projeto
git submodule add https://github.com/davi-449/antigravity-config.git .agent-config
# Depois crie symlinks ou copie manualmente
```

### Opção 3: Pedir ao Antigravity
Abra o Antigravity no seu workspace e peça:
> "Importe as skills e workflows do repo https://github.com/davi-449/antigravity-config e configure este projeto"

---

## 📂 Estrutura

```
antigravity-config/
├── .agent/                          # Configurações do agente
│   ├── skills/                      # Skills especializadas
│   │   └── ux-ui-architect-2026/    # Design System 2026
│   │       └── SKILL.md             # Skill principal
│   └── workflows/                   # Slash-commands (/vibe-*)
│       ├── vibe-proposal.md         # /vibe-proposal — Planejamento
│       ├── vibe-apply.md            # /vibe-apply — Implementação
│       └── vibe-archive.md          # /vibe-archive — Arquivamento
├── .antigravity/                    # Regras do Antigravity IDE
│   └── rules.md                     # Regras de orquestração
├── templates/                       # Templates reutilizáveis
│   ├── spec-template/               # Template de spec vazia
│   │   ├── proposal.md
│   │   ├── design.md
│   │   └── tasks.md
│   └── project-scaffold.md          # Guia de setup para projetos novos
├── .gitignore
└── README.md
```

---

## 🧩 O que está incluído

### Skills
| Skill | Descrição |
|-------|-----------|
| `ux-ui-architect-2026` | Apple Liquid Glass, Maximalismo Tátil, WCAG 2.2, Engenharia de Conversão, Motion Design |

### Workflows
| Comando | Fase | Descrição |
|---------|------|-----------|
| `/vibe-proposal` | Planejamento | Research (RPI-R), requisitos, BDD scenarios, design doc |
| `/vibe-apply` | Implementação | Execução guiada + Quality Gate UX/UI 2026 |
| `/vibe-archive` | Arquivamento | Move specs finalizadas para archive |

### Metodologias Integradas
- **RPI** (Research → Plan → Implement) — em todos os workflows criativos
- **BDD** (Behavior Driven Design) — cenários Given/When/Then obrigatórios
- **Quality Gate 2026** — checklist visual obrigatório antes de commit

### Rules
- Regras de orquestração Vibe Coding
- Arquitetura de pastas Feature-Sliced Design
- Padrões de Frontend, Backend (Supabase), e Qualidade de Código
- Commits semânticos (Conventional Commits)

---

## 📋 Versão

| Campo | Valor |
|-------|-------|
| Versão | 1.0.0 |
| Autor | DaviCode |
| Última atualização | 2026-04-06 |
| Compatível com | Google Antigravity, Cursor, Windsurf, VS Code + Gemini |

---

## 📄 Licença

MIT — Use, modifique e distribua livremente.
