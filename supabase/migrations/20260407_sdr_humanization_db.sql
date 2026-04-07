-- Spec 031: SDR Humanization & Escalation
-- Migration: sdr_humanization_db

-- Adiciona timestamp de muting da IA por cliente
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS ai_muted_until TIMESTAMPTZ;

-- Adiciona telefone de alerta do admin na corretora
ALTER TABLE brokerages ADD COLUMN IF NOT EXISTS admin_alert_phone VARCHAR;
