
# Plano: Implementação de Vínculo Multi-Tenant (Conta/Vendedor)

## Contexto Atual

O sistema possui a seguinte estrutura:

```text
+----------------+       +----------------+       +----------------+
|    profiles    |------>|  brokerages    |       |  crm_settings  |
+----------------+       +----------------+       +----------------+
| id (uuid)      |       | id (bigint)    |       | user_id        |
| email (unique) |<------| user_id        |       | chatwoot_*     |
| nome_completo  |       | chatwoot_*     |       +----------------+
+----------------+       +----------------+

+----------------+       +----------------+       +----------------+
|    clientes    |       |   crm_deals    |       |  crm_stages    |
+----------------+       +----------------+       +----------------+
| user_id        |       | user_id        |       | user_id        |
| chatwoot_id    |       | client_id      |       | pipeline_id    |
+----------------+       | stage_id       |       | chatwoot_label |
                         +----------------+       +----------------+
```

### Problemas Identificados

1. **Resolução de Identidade Hardcoded**: O webhook atual (`chatwoot-webhook`) resolve o `user_id` através de `crm_settings.chatwoot_account_id`, que é configurado manualmente por cada usuário.

2. **Sem Mapeamento de Agentes**: Não existe tabela para mapear `assignee.email` (agente do Chatwoot) → `profiles.id` (vendedor do CRM).

3. **Chatwoot Configurado em Dois Lugares**: `crm_settings` (por usuário) e `brokerages` (por corretora). Isso gera ambiguidade sobre qual configuração usar.

4. **Ownership de Clientes**: Quando um cliente já existe (`clientes`), o `user_id` dele deve ser preservado como dono do atendimento, mas isso não está implementado.

---

## Solução Proposta

### 1. Nova Tabela: `chatwoot_inbox_agents`

Mapeia inboxes do Chatwoot para vendedores do CRM.

```sql
CREATE TABLE chatwoot_inbox_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brokerage_id bigint REFERENCES brokerages(id) ON DELETE CASCADE,
  inbox_id bigint NOT NULL,
  inbox_name text,
  agent_email text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX ON chatwoot_inbox_agents(brokerage_id, inbox_id, agent_email);
```

**Por que esta tabela?**
- Permite que múltiplos agentes do Chatwoot sejam mapeados para vendedores
- `is_default = true` define o vendedor padrão de uma inbox quando não há assignee

### 2. Alterar Fluxo do Webhook (`chatwoot-webhook`)

Lógica atual (simplificada):
```text
[Webhook Chatwoot] → Busca crm_settings por account_id → user_id fixo
```

Nova lógica:
```text
[Webhook Chatwoot]
       ↓
1. Buscar brokerage por chatwoot_account_id
       ↓
2. Tentar resolver vendedor:
   a) Se payload.meta.assignee.email existe:
      → Buscar em profiles.email → user_id
      → OU buscar em chatwoot_inbox_agents
   b) Se não, fallback para:
      → chatwoot_inbox_agents.is_default = true
      → OU brokerages.user_id (dono da corretora)
       ↓
3. Se cliente já existe (busca por phone/email):
   → Usar clientes.user_id como owner (preservar dono)
   → Senão, usar vendedor resolvido no passo 2
```

### 3. Migração de Dados

A configuração do Chatwoot deve ser centralizada na tabela `brokerages`:

1. Migrar dados de `crm_settings.chatwoot_*` para `brokerages.chatwoot_*`
2. Adicionar coluna `brokerage_id` em tabelas que precisam de contexto multi-tenant

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/xxx_chatwoot_inbox_agents.sql` | Criar nova tabela |
| `supabase/functions/chatwoot-webhook/index.ts` | Implementar resolução dinâmica de vendedor |
| `supabase/functions/chatwoot-sync/index.ts` | Buscar config de `brokerages` em vez de `crm_settings` |
| `src/pages/settings/ChatTorkSettings.tsx` | Adicionar UI para gerenciar mapeamento inbox → agente |

---

## Seção Técnica

### Migração SQL

```sql
-- 1. Criar tabela de mapeamento
CREATE TABLE chatwoot_inbox_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brokerage_id bigint NOT NULL REFERENCES brokerages(id) ON DELETE CASCADE,
  inbox_id bigint NOT NULL,
  inbox_name text,
  agent_email text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_inbox_agent UNIQUE(brokerage_id, inbox_id, agent_email)
);

-- 2. RLS para multi-tenant
ALTER TABLE chatwoot_inbox_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their brokerage agents"
ON chatwoot_inbox_agents FOR ALL
TO authenticated
USING (
  brokerage_id IN (
    SELECT id FROM brokerages WHERE user_id = auth.uid()
  )
);

-- 3. Migrar configurações existentes de crm_settings para brokerages
UPDATE brokerages b
SET 
  chatwoot_url = COALESCE(b.chatwoot_url, cs.chatwoot_url),
  chatwoot_token = COALESCE(b.chatwoot_token, cs.chatwoot_api_key),
  chatwoot_account_id = COALESCE(b.chatwoot_account_id, cs.chatwoot_account_id)
FROM crm_settings cs
WHERE cs.user_id = b.user_id
  AND cs.chatwoot_url IS NOT NULL;
```

### Função de Resolução de Vendedor

```typescript
// supabase/functions/chatwoot-webhook/index.ts

interface VendorResolution {
  user_id: string;
  source: 'assignee_email' | 'inbox_agent' | 'existing_client' | 'brokerage_owner';
}

async function resolveVendor(
  supabase: any,
  brokerageId: number,
  payload: any
): Promise<VendorResolution | null> {
  
  // 1. Tentar por assignee.email
  const assigneeEmail = payload?.meta?.assignee?.email;
  if (assigneeEmail) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', assigneeEmail)
      .maybeSingle();
    
    if (profile) {
      return { user_id: profile.id, source: 'assignee_email' };
    }
  }
  
  // 2. Tentar por inbox_id + mapeamento
  const inboxId = payload?.inbox?.id;
  if (inboxId) {
    const { data: inboxAgent } = await supabase
      .from('chatwoot_inbox_agents')
      .select('user_id')
      .eq('brokerage_id', brokerageId)
      .eq('inbox_id', inboxId)
      .or(`agent_email.eq.${assigneeEmail},is_default.eq.true`)
      .order('is_default', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (inboxAgent?.user_id) {
      return { user_id: inboxAgent.user_id, source: 'inbox_agent' };
    }
  }
  
  // 3. Fallback: dono da corretora
  const { data: brokerage } = await supabase
    .from('brokerages')
    .select('user_id')
    .eq('id', brokerageId)
    .single();
  
  if (brokerage) {
    return { user_id: brokerage.user_id, source: 'brokerage_owner' };
  }
  
  return null;
}

// Uso no handler:
const vendor = await resolveVendor(supabase, brokerage.id, body);

// Se cliente já existe, preservar dono
const existingClient = await findClientByPhoneOrEmail(contact);
const finalOwnerId = existingClient?.user_id || vendor?.user_id;
```

### Alteração na UI de Configuração

Adicionar nova seção em `ChatTorkSettings.tsx`:

```typescript
// Novo componente para mapear inboxes
<AppCard className="p-6">
  <h3>Mapeamento de Inboxes</h3>
  <p>Configure qual vendedor receberá os atendimentos de cada inbox.</p>
  
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Inbox</TableHead>
        <TableHead>Vendedor Padrão</TableHead>
        <TableHead>Ações</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {inboxes.map(inbox => (
        <TableRow key={inbox.id}>
          <TableCell>{inbox.name}</TableCell>
          <TableCell>
            <Select onValueChange={(value) => updateInboxAgent(inbox.id, value)}>
              {users.map(user => (
                <SelectItem value={user.id}>{user.nome_completo}</SelectItem>
              ))}
            </Select>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</AppCard>
```

---

## Resultado Esperado

1. **Identificação Dinâmica**: Vendedor resolvido pelo email do agente ou mapeamento de inbox
2. **Preservação de Ownership**: Clientes existentes mantêm seu vendedor original
3. **Multi-Tenant Pronto**: Cada corretora gerencia seus próprios mapeamentos
4. **Fallback Seguro**: Se não encontrar agente, usa o dono da corretora

---

## Etapas de Implementação

1. **Migração SQL**: Criar tabela `chatwoot_inbox_agents` com RLS
2. **Webhook**: Atualizar `chatwoot-webhook` com `resolveVendor()`
3. **Sync**: Atualizar `chatwoot-sync` para usar config de `brokerages`
4. **UI**: Adicionar tela de mapeamento em Configurações do Chat Tork
5. **Testes**: Validar com webhooks simulados e multi-usuário
