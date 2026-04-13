const { Client } = require('pg');

const client = new Client({
    host: 'db.jaouwhckqqnaxqyfvgyq.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Mktfunil8563*',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
});

async function run() {
    try {
        await client.connect();

        console.log("=== CHECKING FOR 71733 ===");
        const res1 = await client.query(`
            SELECT 
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                SUM(total_amount) as total,
                SUM(paid_amount) as paid
            FROM financial_transactions
            WHERE type IN ('revenue', 'income', 'Entrada')
              AND COALESCE(is_void, false) = false
              AND COALESCE(status, 'pending') != 'ignored'
              AND COALESCE(reconciled, false) = true
            GROUP BY 1
        `);
        console.table(res1.rows);

        console.log("=== CHECKING FOR 23086.75 (Expense) ===");
        const res2 = await client.query(`
            SELECT 
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                SUM(total_amount) as total,
                SUM(paid_amount) as paid
            FROM financial_transactions
            WHERE type IN ('expense', 'despesa', 'Saída')
              AND COALESCE(is_void, false) = false
              AND COALESCE(status, 'pending') != 'ignored'
              AND COALESCE(reconciled, false) = true
            GROUP BY 1
        `);
        console.table(res2.rows);

        console.log("=== RECENT BANK ENTRIES ===");
        const res3 = await client.query(`
            SELECT reconciliation_status, COUNT(*), SUM(amount)
            FROM bank_statement_entries
            WHERE amount > 0 
            GROUP BY 1
        `);
        console.table(res3.rows);

        console.log("=== CHECKING WHERE DRE HAS DATA ===");
        const res4 = await client.query(`
            SELECT 
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                fa.type,
                COUNT(*) as ledgers,
                SUM(ABS(fl.amount)) as sum_amount
            FROM financial_ledger fl
            JOIN financial_transactions ft ON fl.transaction_id = ft.id
            JOIN financial_accounts fa ON fl.account_id = fa.id
            WHERE fa.type IN ('revenue', 'expense')
            GROUP BY 1, 2
            ORDER BY 1
        `);
        console.table(res4.rows);

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}
run();
