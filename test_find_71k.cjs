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
        
        console.log("=== WHICH MONTHS SUM TO ~71k? ===");
        const res = await client.query(`
            SELECT 
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                SUM(total_amount) as sum_total,
                SUM(paid_amount) as sum_paid
            FROM financial_transactions
            WHERE type IN ('revenue', 'income', 'Entrada')
              AND COALESCE(is_void, false) = false
              AND COALESCE(archived, false) = false
              AND COALESCE(status, 'pending') != 'ignored'
              AND COALESCE(reconciled, false) = true
            GROUP BY 1
            ORDER BY 1
        `);
        console.dir(res.rows, { depth: null });

        console.log("=== WHAT ABOUT RECONCILED = FALSE? ===");
        const res2 = await client.query(`
            SELECT 
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                SUM(total_amount) as sum_total
            FROM financial_transactions
            WHERE type IN ('revenue', 'income', 'Entrada')
              AND COALESCE(is_void, false) = false
              AND COALESCE(archived, false) = false
              AND COALESCE(status, 'pending') != 'ignored'
              AND COALESCE(reconciled, false) = false
            GROUP BY 1
            ORDER BY 1
        `);
        console.dir(res2.rows, { depth: null });
        
        console.log("=== LET'S CHECK IF ANY COMBINATION SUMS TO 71733 ===");
        const res3 = await client.query(`
            SELECT SUM(total_amount), SUM(paid_amount) 
            FROM financial_transactions 
            WHERE type IN ('revenue', 'income', 'Entrada')
        `);
        console.dir(res3.rows, { depth: null });

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}

run();
