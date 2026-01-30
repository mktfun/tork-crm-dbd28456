-- Migration: Remover função SQL redundante calculate_projected_cash_flow
-- Motivo: Esta função foi criada recentemente mas duplica funcionalidade já existente
-- no sistema de provisões. A implementação antiga é mais completa e deve ser mantida.

DROP FUNCTION IF EXISTS calculate_projected_cash_flow(INTEGER);

-- Comentário explicativo para histórico
COMMENT ON SCHEMA public IS 'Removida função calculate_projected_cash_flow redundante em 2026-01-30';
