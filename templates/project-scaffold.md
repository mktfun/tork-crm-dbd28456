# 🚀 Guia de Setup — Novo Projeto com Antigravity Config

## Passo 1: Criar o projeto

### Landing Page (Vite + React + TS + Tailwind)
```bash
npx -y create-vite@latest ./ -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install framer-motion lucide-react clsx tailwind-merge
```

### Aplicação Web (Next.js)
```bash
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --no-import-alias
npm install framer-motion lucide-react clsx tailwind-merge
```

---

## Passo 2: Importar Antigravity Config

```bash
# Clone o config kit
git clone https://github.com/davi-449/antigravity-config.git /tmp/ag-config

# Copie as configs para o projeto
cp -r /tmp/ag-config/.agent/ .agent/
cp -r /tmp/ag-config/.antigravity/ .antigravity/

# (Opcional) Copie templates de spec
cp -r /tmp/ag-config/templates/ templates/

# Limpe
rm -rf /tmp/ag-config
```

### No Windows (PowerShell):
```powershell
git clone https://github.com/davi-449/antigravity-config.git "$env:TEMP\ag-config"
Copy-Item -Path "$env:TEMP\ag-config\.agent" -Destination ".\.agent" -Recurse -Force
Copy-Item -Path "$env:TEMP\ag-config\.antigravity" -Destination ".\.antigravity" -Recurse -Force
Copy-Item -Path "$env:TEMP\ag-config\templates" -Destination ".\templates" -Recurse -Force
Remove-Item "$env:TEMP\ag-config" -Recurse -Force
```

---

## Passo 3: Criar primeira spec

```bash
mkdir -p specs/001-minha-feature
cp templates/spec-template/* specs/001-minha-feature/
```

---

## Passo 4: Iniciar o Antigravity

Abra o projeto no editor com Antigravity e use:
```
/vibe-proposal
```

O agente vai ler as rules, skills e workflows automaticamente, e começar o ciclo de planejamento guiado.

---

## Checklist de Projeto Pronto

- [ ] `.agent/skills/ux-ui-architect-2026/SKILL.md` existe
- [ ] `.agent/workflows/vibe-proposal.md` existe
- [ ] `.agent/workflows/vibe-apply.md` existe
- [ ] `.agent/workflows/vibe-archive.md` existe
- [ ] `.antigravity/rules.md` existe
- [ ] `specs/` diretório criado
- [ ] `package.json` configurado
- [ ] Git inicializado
