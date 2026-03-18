

# Plano: Tela de Detalhes da Corretora (via Control Center)

## Contexto

Já existe uma página `OrganizationDetails.tsx` em `/superadmin/organizations/:id` com abas básicas (Visão Geral, Usuários, Chat Tork, Configurações). O Control Center atualmente abre um Sheet lateral ao clicar "Ver Detalhes". O objetivo é que o "Ver Detalhes" do Control Center navegue para a página completa de detalhes, enriquecida com as informações de plano, módulos e faturamento.

## Alterações

### 1. `AdminControlCenter.tsx` — Navegar em vez de abrir Sheet

- Importar `useNavigate` do react-router-dom.
- Alterar `openDetails()` para navegar para `/superadmin/organizations/{org.id}` em vez de abrir o Sheet.
- Remover o Sheet lateral, o Dialog de pagamento e todo o estado associado (simplificar o componente para ser apenas a tabela).

### 2. `OrganizationDetails.tsx` — Absorver funcionalidades do Control Center

Adicionar duas novas abas ao lado das existentes:

**Aba "Plano & Módulos"**:
- Card com Select para plano (Free/Pro) + Badge de status (Ativo/Vencido) + data de vencimento.
- Seção de métricas (Progress bars: Tokens IA, Armazenamento).
- 4 cards de permissões globais com Switch + descrição (CRM, Portal, IA, Config) — mesmo layout que existia no Sheet.

**Aba "Faturamento"**:
- Card de status de vencimento (data + badge Ativo/Vencido).
- Botão "Registrar Pagamento Manual" abrindo Dialog.
- Tabela de histórico de pagamentos.
- Dialog de registro de pagamento (valor, período, data).

### 3. `useOrganizationDetails.ts` — Incluir campos de controle

Adicionar ao retorno: `plan_type`, `subscription_valid_until`, `has_crm_access`, `has_portal_access`, `has_ai_access`, `has_config_access` (vindos da query ao `brokerages`).

### 4. Hooks reutilizados

Reutilizar `useBrokeragePayments`, `useToggleModuleAccess`, `useUpdateBrokeragePlan` e `useRegisterPayment` do `useAdminControlCenter.ts` na página de detalhes.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/superadmin/AdminControlCenter.tsx` | Simplificar (remover Sheet/Dialog, navegar) |
| `src/pages/OrganizationDetails.tsx` | Adicionar abas Plano & Módulos + Faturamento |
| `src/hooks/useOrganizationDetails.ts` | Incluir campos de plano/módulos |

