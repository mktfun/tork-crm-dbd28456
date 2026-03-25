

# Plano: Produtos padrão (Sinistro/Endosso) + Verificar fluxo Admin no Dispatcher

## 1. Adicionar "Sinistro" e "Endosso" como produtos padrão

Atualmente a migration de setup (`20260319185230`) insere 5 produtos padrão:
- Seguro Auto, Seguro Vida, Seguro Residencial, Consórcio, Fiança Locatícia

Faltam **Sinistro** e **Endosso** que são processos comuns de corretora.

**Mudança**: Nova migration SQL para inserir esses dois produtos para todos os usuários que ainda não os possuem:

```sql
INSERT INTO crm_products (user_id, name, description, is_active)
SELECT u.user_id, p.name, p.description, true
FROM (SELECT DISTINCT user_id FROM crm_products) u
CROSS JOIN (VALUES
  ('Sinistro', 'Abertura e acompanhamento de sinistros'),
  ('Endosso', 'Alterações e endossos em apólices vigentes')
) AS p(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM crm_products cp
  WHERE cp.user_id = u.user_id AND cp.name = p.name
);
```

Isso adiciona para usuários existentes. Para novos usuários, a function de onboarding já precisaria ser atualizada — mas como ela vive na migration `20260319185230`, criaremos uma nova migration que garante retrocompatibilidade.

---

## 2. Verificar fluxo Admin no Dispatcher

O fluxo atual quando o admin (produtor/dono da corretora) envia mensagem:

```text
resolveContext.ts:
  1. Resolve assignee → userId (do corretor dono da inbox)
  2. Sender phone match producers/brokerages → role = 'admin'
  3. Client resolution → SKIPPED (role === 'admin', linha 118)

index.ts:
  4. aiEnabled check → bypassed para admin (linha 92)
  5. resolveDeal → SKIPPED (role !== 'admin', no resolveDeal)
     → currentDeal = null, currentStage = null
  6. buildPrompt → ADMIN MODE (RAG + capabilities)
  7. dispatch to n8n → payload com role='admin', sem deal
```

**Problema potencial identificado**: Na linha 118 do `resolveContext.ts`, quando `role === 'admin'`, o cliente NÃO é auto-registrado. Isso está correto (admin é o dono, não um cliente). Mas o `clientId` fica `null` se o admin não está na tabela `clientes`. O `userId` continua sendo do assignee, o que está correto — o admin está usando a inbox do corretor.

**Ação**: Nenhuma mudança de código necessária no fluxo admin — a lógica está correta. Porém, recomendo testar no Chatwoot com o número do produtor/corretora para confirmar que:
- Log mostra `👑 Sender is a producer → admin mode`
- Payload no n8n tem `role: 'admin'`
- Não tenta criar deal nem auto-registrar como cliente

---

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| Nova migration SQL | Inserir Sinistro e Endosso para todos os usuários existentes |

## Resultado esperado

- Todos os usuários passam a ter "Sinistro" e "Endosso" na lista de produtos
- Fluxo admin no dispatcher confirmado como correto (sem mudança de código)

