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
        
        console.log("=== CALLING get_financial_summary('2026-03-01', '2026-03-31') ===");
        const res = await client.query(`SELECT * FROM get_financial_summary('2026-03-01', '2026-03-31')`);
        console.dir(res.rows[0], { depth: null });

        console.log("=== IDENTIFYING 71k ===");
        const res2 = await client.query(`
            SELECT type, status, reconciled, SUM(total_amount)
            FROM financial_transactions
            WHERE transaction_date BETWEEN '2026-03-01' AND '2026-03-31'
            GROUP BY type, status, reconciled
        `);
        console.dir(res2.rows, { depth: null });

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}

run();
