-- Issue 4: Drop ambiguous 2-param overload of reconcile_insurance_aggregate_fifo
DROP FUNCTION IF EXISTS reconcile_insurance_aggregate_fifo(uuid, uuid);