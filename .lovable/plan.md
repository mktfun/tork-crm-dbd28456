

# Plano: Mover Produtos para CRM + Limpar PortalInbox

## Resumo

Duas ações: (1) mover "Produtos" da sidebar principal para dentro da tela CRM como uma aba, (2) remover as abas "Admin" e "Portal" do PortalInbox, deixando só a listagem de solicitações limpa.

---

## 1. Mover Produtos para dentro do CRM

**`src/pages/CRM.tsx`**: Adicionar uma nova aba "Produtos" ao `TabsList` existente (ao lado de Pipeline/Analytics). O conteúdo dessa aba renderiza `<ProductsManager />`.

**`src/components/layout/GlassSidebar.tsx`**: Remover o item `{ id: 'products', name: 'Produtos', icon: Package, path: '/dashboard/products' }` da seção "Comercial".

**`src/App.tsx`**: Remover a rota `<Route path="products" element={<ProductSettings />} />`. Remover o import de `ProductSettings`.

---

## 2. Limpar PortalInbox (remover abas Admin e Portal)

**`src/pages/PortalInbox.tsx`**:
- Remover `PortalAdminPlaceholder`, `PortalTab` e todo o wrapper de `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`
- Remover imports de `LayoutDashboard`, `Globe`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `PortalSettings`, `Input`, `Label`
- Manter apenas o header simples + `RequestsFilters` + `RequestsList` + `RequestDetailsSheet` diretamente no return
- Ajustar título/subtexto para "Solicitações do Portal" sem menção a admin/portal

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/CRM.tsx` | Editar — nova aba "Produtos" |
| `src/pages/PortalInbox.tsx` | Editar — remover abas, simplificar |
| `src/components/layout/GlassSidebar.tsx` | Editar — remover item Produtos |
| `src/App.tsx` | Editar — remover rota /products e import |

