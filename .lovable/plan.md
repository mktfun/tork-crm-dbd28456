

# Plano: Integrar Control Center com Backend Real

## Contexto

O sistema usa `brokerages` como tabela de organizações (id: number, name, cnpj, slug...). A autenticação admin usa `profiles.role = 'admin'`. Já existe uma função `get_user_role`. Não existe tabela `organizations` — o Control Center deve operar sobre `brokerages`.

---

## TAREFA 1: Migration SQL

### 1a. Adicionar colunas à tabela `brokerages`

```sql
ALTER TABLE public.brokerages
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'Free',
  ADD COLUMN IF NOT EXISTS subscription_valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS has_crm_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_portal_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_ai_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_config_access boolean NOT NULL DEFAULT false;
```

### 1b. Criar tabela `organization_payments`

```sql
CREATE TABLE public.organization_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brokerage_id integer NOT NULL REFERENCES public.brokerages(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  period_added text NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'paid',
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 1c. Função SECURITY DEFINER para check de admin

```sql
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin'
  );
$$;
```

### 1d. RLS Policies

**`brokerages`** — policy para admin atualizar colunas de acesso (a tabela já tem RLS; adicionar policy de UPDATE para admin):

```sql
CREATE POLICY "Admins can update brokerages" ON public.brokerages
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
```

**`organization_payments`**:

```sql
ALTER TABLE public.organization_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select payments" ON public.organization_payments
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert payments" ON public.organization_payments
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
```

---

## TAREFA 2: Hook `useAdminControlCenter.ts`

Criar `src/hooks/useAdminControlCenter.ts` com React Query:

### Queries
- **`useBrokeragesAdmin()`**: Fetch `brokerages` com colunas relevantes (id, name, cnpj, plan_type, subscription_valid_until, has_crm_access, has_portal_access, has_ai_access, has_config_access). QueryKey: `['admin-brokerages']`.

- **`useBrokeragePayments(brokerageId)`**: Fetch `organization_payments` filtrado por brokerage_id, join com `profiles` para nome do admin. QueryKey: `['brokerage-payments', brokerageId]`.

### Mutations
- **`useToggleModuleAccess()`**: UPDATE em `brokerages` a coluna correspondente (has_crm_access, etc.). Invalida `['admin-brokerages']`.

- **`useUpdateBrokeragePlan()`**: UPDATE `plan_type` em `brokerages`. Invalida `['admin-brokerages']`.

- **`useRegisterPayment()`**: INSERT em `organization_payments` + UPDATE `subscription_valid_until` em `brokerages` (calculando nova data baseada no período). Invalida ambas queries.

---

## TAREFA 3: Refatorar `AdminControlCenter.tsx`

- Substituir mock data por dados do hook `useBrokeragesAdmin()`.
- Substituir `Organization` type por tipo derivado da query real.
- `handleModuleToggle` → chamar `toggleModuleAccess.mutate()`.
- `handlePlanChange` → chamar `updateBrokeragePlan.mutate()`.
- `handleSavePayment` → chamar `registerPayment.mutate()`.
- Sheet lateral: carregar `useBrokeragePayments(selectedOrg.id)` na aba Faturamento.
- Adicionar estados de loading/skeleton.
- Nota: `brokerages.id` é `number`, não `string` — ajustar tipos.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar (via tool) |
| `src/hooks/useAdminControlCenter.ts` | Criar |
| `src/components/superadmin/AdminControlCenter.tsx` | Refatorar |

