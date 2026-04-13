# Design: Roteamento Corrigido e Cleanup

## Arquitetura das Modificações

### 1. Account Fallback (`resolveContext.ts`)
A raiz de falhas eventuais no reconhecimento em fluxos é o Chatwoot não possuir um `inbox_id` mapeado, portanto a constante `brokerageId` retorna como nula e a Etapa 3 (a verificação do Admin/Owner) é evadida.
**Adição Funcional:** Se `!brokerageId` falhar após as tentativas (Assignee Email e Inbox Mapping), usar `body.account?.id` procurando a corretora associada. Isso amarra todas as rotas de escape do tenant.

### 2. Normalização Universal (9º Dígito Móvel)
Muitas falhas no Brasil ocorrem porque no cadastro de corretores o telefone pode não possuir o 9 ("1179699832") enquanto o WhatsApp remete obrigatoriamente a string plena (`11979699832`).

Na etapa 3 onde ocorre o array `.find()`, a normalização será atualizada para extrair sempre os últimos 10 dígitos (ignorando o nono condicional) do BD e comparar contra os mesmos 10 dígitos "core" oriundos do payload.
Isso estabiliza o match exato sem ceder a colisões amplas globais.

### 3. Remoção do Status Cliente Duplicado
Um arquivo de migração extra (`SQL`) será enviado para intervir na tabela clientes:
```sql
DELETE FROM clientes WHERE phone LIKE '%979699832%';
```
Com a migração ativada, a entidade de cliente do Rodrigo evaporará do sandbox das ferramentas, extinguindo a prioridade passiva que os fluxos SDR têm tentado invadir.
