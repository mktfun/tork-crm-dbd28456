# Checklist de Solução: Discrepância de Valores Órfãos

- [ ] Verificar a existência do componente originário `UnbankedTransactionsAlert.tsx` (se está inativo ou deleto completamente).
- [ ] Ativar/Recriar o Alert do `UnbankedTransactionsAlert` dentro do Header superior de `CaixaTab.tsx`.
- [ ] Modificar `BankDashboardView.tsx` (quando ID == 'todos') para mostrar além do consolidado vinculado, o Total Geral Virtual que restringe a conta "não bancária" batendo globalmente com `get_financial_summary`.
- [ ] Mapear as transações órfãs num botão (opcional) `Designar a um Banco` utilizando hooks nativos.
- [ ] Empilhar os checks e notificar o usuário com um walkthrough da prova visual da UI no preview.
