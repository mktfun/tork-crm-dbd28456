-- Migration: Drop old get_bank_transactions overload to fix PGRST203
-- Date: 2026-02-11 12:30:00

-- Drop the specific 3-argument version that causes ambiguity
DROP FUNCTION IF EXISTS get_bank_transactions(uuid, integer, integer);
