

# Plano: Auto-registrar clientes novos no dispatcher

## Problema identificado

O dispatcher **não cria clientes novos**. Quando "Davi" manda mensagem, o telefone dele não bate com nenhum registro na tabela `clientes`. O `clientId` fica `null`, e o bloco de `autoCreateDeal` (linha 824) nunca executa porque está dentro do `if (clientId)` (linha 790).

Resultado: a mensagem vai pro n8n sem deal, sem stage, sem system prompt customizado.

## Solução

Adicionar auto-registro de cliente no dispatcher. Após a busca falhar (linha 779-781), se `clientId` for null e houver `contactPhone` ou `contactEmail`, criar automaticamente o cliente na tabela `clientes` e depois seguir o fluxo normal de `autoCreateDeal`.

## Mudança (apenas no dispatcher)

Após a linha 781 (`clientId = clientData?.id || null`), antes do guard de `ai_enabled`, adicionar:

```typescript
// Auto-register new client from Chatwoot contact
if (!clientId && userId && role !== 'admin') {
  const newClientName = sender?.name || 'Contato Chatwoot'
  const newPhone = contactPhone ? contactPhone.replace(/\D/g, '') : ''
  const newEmail = contactEmail || ''
  
  const { data: newClient, error: clientErr } = await supabase
    .from('clientes')
    .insert({
      user_id: userId,
      name: newClientName,
      phone: newPhone,
      email: newEmail,
      chatwoot_contact_id: sender?.id || null,
      observations: 'Cadastrado automaticamente via Chatwoot',
    })
    .select('id, name, ai_enabled')
    .single()

  if (newClient && !clientErr) {
    clientData = newClient
    clientId = newClient.id
    console.log(`✅ Auto-registered client: "${newClientName}" (${clientId})`)
  } else {
    console.warn('⚠️ Failed to auto-register client:', clientErr?.message)
  }
}
```

Isso faz com que o fluxo continue normalmente: `clientId` agora existe, entra no `if (clientId)` (linha 790), não acha deals, e entra no `autoCreateDeal` (linha 824-837) que classifica com IA e cria a negociação.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/chatwoot-dispatcher/index.ts` | Adicionar bloco de auto-registro entre linhas 781-783 |

Sem migration, sem mudança de schema. Apenas lógica no dispatcher.

