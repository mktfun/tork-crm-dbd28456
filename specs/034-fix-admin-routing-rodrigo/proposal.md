# Proposal: Ajuste Final de Roteamento Admin/Cliente

## Status
Em análise (Pendente de Aprovação)

## Requisitos e Contexto

### Problema
O número do Rodrigo (`+5511979699832`) está caindo no fluxo de cliente, em vez do fluxo de administrador (Mentor IA), ao falar com o bot da própria corretora dele.
Isso ocorre porque a detecção atual de "Admin" tem duas fraquezas:
1. **Formato do Telefone com e sem o "9"**: Se no banco de dados o telefone foi salvo com 10 dígitos (sem o 9) ou com formatações atípicas, a comparação estrita falha, e o script delega o remetente como cliente.
2. **Histórico Corrompido**: Ele já consta na tabela `clientes` (devido a falhas de testes anteriores ou testes noutras corretoras). Isso pode causar ruídos nas prioridades.
3. **Resolução de Brokerage Primária**: Se o Chatwoot falhar em recuperar a quem pertence aquela caixa de entrada (inbox mapping), o tenant é perdido, o cargo de "Admin" não é avaliado e, por segurança, ele é tratado como "Cliente" genérico.

### O que já existe
- A rotação inicial para separar `senderRole = admin`.
- Tratamento de inserção de novo cliente condicionado a `senderRole !== 'admin'`.

### Solução Proposta
1. **Limpeza da Base**: Criar um arquivo SQL de expurgo deletando expressamente todos os registros na tabela `clientes` cujo telefone corresponda a `%979699832%` para zerar a memória daquele número como cliente na corretora dele e nas outras.
2. **Match Flexível do Nono Dígito**: Atualizar `resolveContext.ts` para aplicar a normalização do "Dígito 9" do Brasil. Se o telefone tiver 11 dígitos (formato celular), converter ele pra sua string normalizada base e flexibilizar, garantindo que `11979699832` seja validado com exatidão tanto contra ele mesmo, quanto contra cadastros antigos de produtor `1179699832`.
3. **Melhorar Resolução de Tenant (Fallback)**: Garantir que se a corretora dele não tiver o InboxId cadastrado explicitamente no sistema, seja tentada a associação via `account_id` do evento para nunca perder a `brokerageId` (a chave mestra do tenant).

### Critérios de Aceite
- [ ] Ao rodar o script de deleção, Rodrigo some da lista de clientes no banco de dados.
- [ ] Rodrigo mandando mensagem é processado PELA REGRA de Admin (`processAdminLogic`), visto que ele baterá com a relação de owner da própria corretora independentemente do uso do 9o Dígito.
