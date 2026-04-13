const { Client } = require('pg');

const client = new Client({
    host: 'db.jaouwhckqqnaxqyfvgyq.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Mktfunil8563*',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000 // fail fast
});

async function run() {
    try {
        await client.connect();
        
        console.log("=== CHECK MATCHED NULLS ===");
        const res = await client.query(`
            SELECT 
                amount > 0 as is_revenue,
                COUNT(*) as count, SUM(amount) as sum
            FROM bank_statement_entries 
            WHERE reconciliation_status = 'matched'
              AND matched_transaction_id IS NULL
            GROUP BY 1
        `);
        console.table(res.rows);
        
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}
run();
