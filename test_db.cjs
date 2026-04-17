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
        
        console.log("=== BANK STATEMENT ENTRIES ===");
        const res1 = await client.query(`
            SELECT reconciliation_status, COUNT(*) as count, SUM(amount) as sum_amount
            FROM bank_statement_entries
            GROUP BY reconciliation_status
        `);
        console.dir(res1.rows, { depth: null });

        console.log("\n=== FINANCIAL TRANSACTIONS (March 2026) ===");
        const res2 = await client.query(`
            SELECT type, status, reconciled, bank_account_id IS NULL as unbanked, COUNT(*) as count, SUM(total_amount) as sum_amount
            FROM financial_transactions
            WHERE transaction_date >= '2026-03-01' AND transaction_date <= '2026-03-31'
            GROUP BY type, status, reconciled, bank_account_id IS NULL
        `);
        console.dir(res2.rows, { depth: null });

        console.log("\n=== FINANCIAL TRANSACTIONS (All 2026) ===");
        const res3 = await client.query(`
            SELECT type, status, reconciled, COUNT(*) as count, SUM(total_amount) as sum_amount
            FROM financial_transactions
            WHERE EXTRACT(YEAR FROM transaction_date) = 2026
            GROUP BY type, status, reconciled
        `);
        console.dir(res3.rows, { depth: null });

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}

run();
