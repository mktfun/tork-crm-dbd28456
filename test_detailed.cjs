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
        
        console.log("=== STATEMENT ENTRIES (MATCHED) ===");
        const res1 = await client.query(`
            SELECT 
                CASE WHEN amount > 0 THEN 'revenue' ELSE 'expense' END as type,
                COUNT(*), SUM(ABS(amount))
            FROM bank_statement_entries
            WHERE reconciliation_status = 'matched'
            GROUP BY 1
        `);
        console.dir(res1.rows, { depth: null });

        console.log("=== STATEMENT ENTRIES (PENDING) ===");
        const res2 = await client.query(`
            SELECT 
                CASE WHEN amount > 0 THEN 'revenue' ELSE 'expense' END as type,
                COUNT(*), SUM(ABS(amount))
            FROM bank_statement_entries
            WHERE reconciliation_status = 'pending'
            GROUP BY 1
        `);
        console.dir(res2.rows, { depth: null });

        console.log("=== FINANCIAL TRANSACTIONS SUMS (By Month) ===");
        const res3 = await client.query(`
            SELECT 
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                type, status, reconciled, SUM(total_amount), SUM(paid_amount)
            FROM financial_transactions
            GROUP BY 1, 2, 3, 4
            ORDER BY 1, 2, 3
        `);
        console.dir(res3.rows, { depth: null });

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}

run();
