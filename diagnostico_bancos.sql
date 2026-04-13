-- =====================================================
-- DIAGNÓSTICO: Ver todas as contas bancárias e saldos
-- Cole no SQL Editor para ver o estado atual
-- =====================================================

SELECT 
  ba.id,
  ba.name,
  ba.current_balance,
  ba.initial_balance,
  ba.status,
  ba.created_at::date
FROM bank_accounts ba
ORDER BY ba.name;
