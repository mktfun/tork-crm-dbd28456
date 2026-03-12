-- Allow bank_account_id to be NULL in bank_statement_entries for lazy import
ALTER TABLE bank_statement_entries ALTER COLUMN bank_account_id DROP NOT NULL;