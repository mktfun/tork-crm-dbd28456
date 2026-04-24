# Vibe Proposal: Resolução da Discrepância "Visão Global x Visão Bancos"

## Contexto do Problema ("Não tá batendo")

Após restaurarmos as transações de Janeiro de 2026 (que estavam erroneamente ocultas no banco de dados) e corrigirmos o hook do Dashboard Principal, o painel central ("Transações" e "Top KPIs") passou a exibir a **realidade global do sistema** com perfeição:

* **Top KPIs:**
  * **Recebido no Período:** R$ 60.110,81
  * **Despesas no Período:** R$ 64.663,73
  * **Vencendo no Período:** R$ 7.772,47
  * **Total Geral a Receber:** R$ 94.587,98

Entretanto, ao olhar as abas **Visão Bancos / Caixa**, os valores contidos **nos Cards dos Bancos** apontam algo diferente:
* **Receitas nos Bancos:** R$ 44.605,15  *(Faltam ~15.5k em relação ao Global)*
* **Despesas nos Bancos:** R$ 62.201,87 *(Faltam ~2.4k em relação ao Global)*

### A Causa Raiz (Research)
Após auditar o banco de dados e os RPCs customizados de vocês (`get_financial_summary` vs `get_bank_transactions`), encontrei a causa arquitetural exata:
1. **O Top KPI (`get_financial_summary`)** varre TODA a tabela `financial_transactions`. Ele não se importa se a transação está numa conta Bradesco, Itaú ou dentro do seu "colchão". Se for "Receita" e "Pago", ele soma.
2. **O Painel de Bancos (`useBankTransactions`)**, por outro lado, filtra EXCLUSIVAMENTE pelo balancete bancário (`financial_ledger`) buscando transações que têm obrigatoriamente um `bank_account_id` válido.

**Conclusão**: O sistema de vocês permite possuir "Transações Sem Banco" (Transações Órfãs/Unbanked). Você possui aproximadamente R$ 15.500 em receitas que constam como pagas no sistema, mas **nunca foram alocadas a um Banco cadastrado no CRM**. 

Isso provavelmente ocorreu durante antigas sessões de Importação (onde não se exigiu selecionar o banco) ou adições manuais. O próprio código do TorkCRM tinha originalmente um componente chamado `<UnbankedTransactionsAlert />` na aba Bancos avisando exatamente sobre isso, mas que foi desativado/comentado em versões anteriores.

---

## Proposta de Solução (3 Frentes)

Para resolver esse ruído no funil sem corromper as regras de negócios, faremos o seguinte:

### 1. Ressurreição e Refinamento do "Unbanked Alert"
Descomentar e embelezar o `<UnbankedTransactionsAlert />` na aba Bancos. Toda vez que houver discrepância (transações órfãs), um alerta amigável avisará: *"Você possui R$ 15.5k recebidos sem banco destino. Clique aqui para vincular."*

### 2. Visão Dinâmica do "Todos os Bancos"
Quando você clica no Card Consolidado ("Todos os Bancos") no módulo Caixa, ele usa internamente `bank_account_id = null`. Modificar essa consulta ou o cálculo da Interface para renderizar uma aba explícita de "Dinheiro Não-Bancarizado / Em Caixa Físico" a fim de igualar a somatória total (Bancos + Não Bancarizado = Top KPI Global).

### 3. Melhoria na Tela de Conciliação
Aproveitar o Hook nativo já existente chamado `useAssignBankToTransactions` para dar à tela de "Transações" um filtro ou botão rápido: `[Ver Transações Sem Banco]`, permitindo que você as vincule ao Bradesco/Itaú/Sicredi em massa, zerando o problema da discrepância de forma estruturada.

---

## Próximos Passos
Tudo isso é um trabalho puramente de React/Ajustes de UI baseados nos próprios Hooks do seu repositório. O "Gap" já foi mapeado matematicamente. Se você validar o plano, eu executo o `@/vibe-apply` integrando essas visualizações agora mesmo!
