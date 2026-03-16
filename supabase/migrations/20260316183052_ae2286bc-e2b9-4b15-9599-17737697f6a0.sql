
-- Step 1: Re-point reconciled_statement_id from duplicate entries to the kept batch (8eb8b8e7)
-- Match by description + amount + transaction_date
UPDATE financial_transactions ft
SET reconciled_statement_id = kept.id
FROM bank_statement_entries dup
JOIN bank_statement_entries kept 
  ON kept.import_batch_id = '8eb8b8e7-0f4e-403e-a4e9-f39cfc15a953'
  AND kept.description = dup.description
  AND kept.amount = dup.amount
  AND kept.transaction_date = dup.transaction_date
WHERE ft.reconciled_statement_id = dup.id
  AND dup.import_batch_id IN (
    '07177a1e-94fc-496f-a2ff-7e235d686e01',
    '2e19ef96-67f4-4344-9fce-b830ad261b45',
    '7385533d-d191-48a1-a6a7-b4a5ac0cfb29'
  );

-- Step 2: Clear any remaining references that couldn't be matched (manual imports)
UPDATE financial_transactions
SET reconciled_statement_id = NULL
WHERE reconciled_statement_id IN (
  SELECT id FROM bank_statement_entries
  WHERE import_batch_id IN (
    '07177a1e-94fc-496f-a2ff-7e235d686e01',
    '2e19ef96-67f4-4344-9fce-b830ad261b45',
    '7385533d-d191-48a1-a6a7-b4a5ac0cfb29',
    '6959773a-194a-4468-9e9c-a57d4e00b558',
    'd429ef7d-2865-4be0-82e4-2e43d7fba1c5',
    '9c08a607-22a3-4e7d-8bf8-3c792a96bd1a',
    '32a5a003-2954-47b3-9d61-591ea938d723'
  )
);

-- Also clear matched_transaction_id on the duplicate entries
UPDATE bank_statement_entries
SET matched_transaction_id = NULL, reconciliation_status = 'pending'
WHERE import_batch_id IN (
  '07177a1e-94fc-496f-a2ff-7e235d686e01',
  '2e19ef96-67f4-4344-9fce-b830ad261b45',
  '7385533d-d191-48a1-a6a7-b4a5ac0cfb29',
  '6959773a-194a-4468-9e9c-a57d4e00b558',
  'd429ef7d-2865-4be0-82e4-2e43d7fba1c5',
  '9c08a607-22a3-4e7d-8bf8-3c792a96bd1a',
  '32a5a003-2954-47b3-9d61-591ea938d723'
);

-- Step 3: Now safe to delete duplicate entries
DELETE FROM bank_statement_entries
WHERE import_batch_id IN (
  '07177a1e-94fc-496f-a2ff-7e235d686e01',
  '2e19ef96-67f4-4344-9fce-b830ad261b45',
  '7385533d-d191-48a1-a6a7-b4a5ac0cfb29',
  '6959773a-194a-4468-9e9c-a57d4e00b558',
  'd429ef7d-2865-4be0-82e4-2e43d7fba1c5',
  '9c08a607-22a3-4e7d-8bf8-3c792a96bd1a',
  '32a5a003-2954-47b3-9d61-591ea938d723'
);

-- Step 4: Delete import history records
DELETE FROM bank_import_history
WHERE id IN (
  '07177a1e-94fc-496f-a2ff-7e235d686e01',
  '2e19ef96-67f4-4344-9fce-b830ad261b45',
  '7385533d-d191-48a1-a6a7-b4a5ac0cfb29',
  '6959773a-194a-4468-9e9c-a57d4e00b558',
  'd429ef7d-2865-4be0-82e4-2e43d7fba1c5',
  '9c08a607-22a3-4e7d-8bf8-3c792a96bd1a',
  '32a5a003-2954-47b3-9d61-591ea938d723'
);
