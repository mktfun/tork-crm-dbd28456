

# Plano: Admin Control Center (UI Estática)

## Resumo

Criar `AdminControlCenter.tsx` como componente estático com mock data, contendo tabela de organizações com switches inline de módulos, busca por nome, e Sheet lateral com detalhes/métricas/permissões. Registrar como nova aba "Control Center" na página SuperAdmin existente.

---

## Arquivo novo: `src/components/superadmin/AdminControlCenter.tsx`

### Mock Data
Array local de ~5 organizações com campos: `id`, `name`, `cnpj`, `plan` (Free/Pro/Enterprise), `status` (Ativo/Suspenso), `modules` (`{ crm, portal, ia, config }` booleans), `metrics` (`{ tokensUsed, tokensLimit, storageUsed, storageLimit, usersActive, usersLimit }`).

### Estrutura do componente:
1. **Header**: Título + subtítulo + Input de busca com ícone `Search`, filtrando organizações por nome via `useState`.

2. **Tabela** (shadcn Table): Colunas — Organização (nome + CNPJ em `text-xs text-muted-foreground`), Plano (Badge com cores por tipo), Status (Badge verde/vermelho), Módulos (4x Switch inline para CRM/Portal/IA/Config com labels `text-xs`), Ações (DropdownMenu com item "Ver Detalhes" usando ícone `Eye`).

3. **Sheet lateral** (shadcn Sheet, side="right"): Abre ao clicar "Ver Detalhes". Contém:
   - Header com nome da org
   - **Seção Assinatura**: Select nativo para plano + Button "Suspender Acesso" com ícone `Ban`
   - **Seção Métricas**: 3x Progress bars (Tokens IA, Armazenamento, Usuários) com labels e valores formatados
   - **Seção Permissões Globais**: 4x blocos com Switch + label + descrição do módulo

Estado local (`useState`) para: busca, org selecionada, sheet aberto, toggles de módulos.

---

## Integração na página SuperAdmin

**`src/pages/SuperAdmin.tsx`**: Adicionar nova aba "Control Center" ao `TabsList` existente (ícone `SlidersHorizontal`), renderizando `<AdminControlCenter />` no `TabsContent`.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/superadmin/AdminControlCenter.tsx` | Criar |
| `src/pages/SuperAdmin.tsx` | Editar (nova aba) |

