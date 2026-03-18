

# Plano: Módulo de Produtos (CRM) + Funis Padrão + Frontend

## Resumo

4 mudanças: criar tabela `crm_products`, adicionar `product_id` em `crm_deals`, atualizar seed de onboarding com funis e produtos padrão, criar tela de gestão de produtos em Settings, e integrar `ProductSelect` nos formulários de Deal.

---

## MUDANÇA 1: Banco de Dados (2 Migrations)

### Migration A — Tabela `crm_products`

```sql
CREATE TABLE public.crm_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_products_user_id ON public.crm_products(user_id);
ALTER TABLE public.crm_products ENABLE ROW LEVEL SECURITY;

-- RLS (padrão user_id como todo o CRM)
CREATE POLICY "Users can view own products" ON public.crm_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.crm_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.crm_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.crm_products FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_crm_products_updated_at BEFORE UPDATE ON public.crm_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

**Nota**: `company_id` é nullable (produto pode existir sem vínculo direto a seguradora). `user_id` é a chave de ownership para RLS, consistente com todo o sistema.

### Migration B — Coluna `product_id` em `crm_deals`

```sql
ALTER TABLE public.crm_deals ADD COLUMN product_id UUID REFERENCES public.crm_products(id) ON DELETE SET NULL;
CREATE INDEX idx_crm_deals_product_id ON public.crm_deals(product_id);
```

---

## MUDANÇA 2: Seed de Onboarding (`seed_user_defaults`)

Atualizar a função SQL `seed_user_defaults` via nova migration com `CREATE OR REPLACE FUNCTION`:

- Adicionar criação de 2 pipelines padrão: **"Seguros"** (is_default=true) e **"Sinistros e Assistência"** (is_default=false), com etapas padrão para cada um.
- Inserir 5 produtos padrão na `crm_products`: "Seguro Auto", "Seguro Vida", "Seguro Residencial", "Consórcio", "Fiança Locatícia".

Esses registros usam `p_user_id` como `user_id`, sem `company_id` (genéricos).

---

## MUDANÇA 3: Frontend — Tela de Produtos

### Novos arquivos:

| Arquivo | Função |
|---|---|
| `src/hooks/useProducts.ts` | Hook com `useQuery`/`useMutation` para CRUD de `crm_products` |
| `src/components/settings/ProductsManager.tsx` | Componente principal: DataTable + botão criar |
| `src/components/settings/ProductDialog.tsx` | Dialog modal para criar/editar produto |
| `src/pages/settings/ProductSettings.tsx` | Page wrapper |

### Rota:
- Em `App.tsx`: adicionar `<Route path="products" element={<ProductSettings />} />` dentro do bloco `settings`.
- Em `SettingsLayout.tsx` e `SettingsNavigation.tsx`: adicionar tab "Produtos" com ícone `Package` entre Ramos e Chat Tork.

### Layout da tela:
- Header: "Produtos / Ramos" com subtexto descritivo
- DataTable com colunas: Nome, Descrição (truncada), Status (Badge verde/cinza), Ações (DropdownMenu com Editar/Desativar/Excluir)
- `ProductDialog`: form com campos Nome, Descrição (textarea), toggle is_active
- Deleção: soft delete (is_active=false) se houver deals vinculados, hard delete se não houver

---

## MUDANÇA 4: ProductSelect nos Formulários de Deal

### Novo componente:
`src/components/crm/ProductSelect.tsx` — Select/Combobox que busca `crm_products` ativos via `useProducts` hook.

### Integração:
- **`NewDealModal.tsx`**: Adicionar campo `product_id` no `formData`, renderizar `<ProductSelect>` entre Pipeline/Etapa e Valor, passar no `createDeal.mutateAsync`.
- **`DealDetailsModal.tsx`**: Adicionar `product_id` ao `formData` de edição, exibir na seção de detalhes, incluir no `handleSave`. Exibir como Badge o nome do produto no header do deal.
- **`useCRMDeals.ts`**: Expandir a query do `createDeal` e `updateDeal` para incluir `product_id`. Adicionar join no select: `product:crm_products(id, name)`.
- **Interface `CRMDeal`**: Adicionar `product_id` e `product?: { id: string; name: string }`.

---

## Arquivos afetados

| Arquivo | Tipo |
|---|---|
| Nova migration SQL (crm_products + alter crm_deals) | Criar |
| Nova migration SQL (seed_user_defaults atualizado) | Criar |
| `src/hooks/useProducts.ts` | Criar |
| `src/components/settings/ProductsManager.tsx` | Criar |
| `src/components/settings/ProductDialog.tsx` | Criar |
| `src/pages/settings/ProductSettings.tsx` | Criar |
| `src/components/crm/ProductSelect.tsx` | Criar |
| `src/App.tsx` | Editar (nova rota) |
| `src/layouts/SettingsLayout.tsx` | Editar (nova tab) |
| `src/components/settings/SettingsNavigation.tsx` | Editar (novo item) |
| `src/hooks/useCRMDeals.ts` | Editar (product_id no CRUD + join) |
| `src/components/crm/NewDealModal.tsx` | Editar (ProductSelect) |
| `src/components/crm/DealDetailsModal.tsx` | Editar (ProductSelect + exibição) |

