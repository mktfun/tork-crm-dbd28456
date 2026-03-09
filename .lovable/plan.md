

# Fix: SQL Query for Corrupted Premium Values

The query I provided referenced a `description` column that doesn't exist in the `apolices` table. Here's the corrected query to run in the SQL Editor:

```sql
SELECT id, policy_number, premium_value, commission_rate, status, created_at
FROM apolices
WHERE premium_value < 1000 AND premium_value > 0
ORDER BY created_at DESC;
```

This will list policies with suspiciously low `premium_value` that may have been truncated by the comma/dot formatting issue. Share the results and I'll generate the corrective UPDATE statements.

