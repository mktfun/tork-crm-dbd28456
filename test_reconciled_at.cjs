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
        
        console.log("=== MONTHS GROUPED BY reconciled_at ===");
        const res = await client.query(`
            SELECT 
                TO_CHAR(COALESCE(reconciled_at::date, transaction_date), 'YYYY-MM') as month,
                SUM(CASE WHEN type IN ('revenue', 'income', 'Entrada') THEN 
                    CASE WHEN COALESCE(reconciled,false)=true THEN total_amount
                         WHEN COALESCE(paid_amount,0) > 0 THEN paid_amount ELSE 0 END
                ELSE 0 END) as total,
                SUM(CASE WHEN type IN ('expense', 'despesa', 'Saída') THEN 
                    CASE WHEN COALESCE(reconciled,false)=true THEN total_amount
                         WHEN COALESCE(paid_amount,0) > 0 THEN paid_amount ELSE 0 END
                ELSE 0 END) as exp_total
            FROM financial_transactions
            WHERE COALESCE(is_void, false) = false
              AND COALESCE(archived, false) = false
              AND COALESCE(status, 'pending') != 'ignored'
              AND (COALESCE(reconciled, false) = true OR COALESCE(paid_amount, 0) > 0)
            GROUP BY 1
            ORDER BY 1
        `);
        console.table(res.rows);
        
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}
run();
