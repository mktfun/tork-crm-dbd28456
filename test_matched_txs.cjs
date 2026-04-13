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
        
        console.log("=== CHECK MATCHED TRANSACTIONS STATUS ===");
        const res = await client.query(`
            SELECT 
                ft.status, ft.reconciled, ft.type, ft.archived, ft.is_void,
                COUNT(*) as count, SUM(ft.total_amount) as total
            FROM bank_statement_entries b
            JOIN financial_transactions ft ON ft.id = b.matched_transaction_id
            WHERE b.reconciliation_status = 'matched'
            GROUP BY 1, 2, 3, 4, 5
        `);
        console.table(res.rows);
        
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}
run();
