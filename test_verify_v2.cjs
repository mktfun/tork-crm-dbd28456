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
        
        console.log("=== CHECKING NEW KPI RESULTS FOR MARCH ===");
        // Get the real user ID
        const userRes = await client.query(`SELECT DISTINCT user_id FROM financial_transactions LIMIT 1`);
        const userId = userRes.rows[0].user_id;
        
        await client.query(`SET request.jwt.claims TO '{"sub":"${userId}", "role":"authenticated"}';`);
        await client.query(`SET ROLE authenticated`);
        
        const res = await client.query(`SELECT get_financial_summary('2026-03-01', '2026-03-31')`);
        console.dir(res.rows[0].get_financial_summary.current, { depth: null });

        console.log("=== CHECKING NEW KPI RESULTS FOR JANUARY ===");
        const res2 = await client.query(`SELECT get_financial_summary('2026-01-01', '2026-01-31')`);
        console.dir(res2.rows[0].get_financial_summary.current, { depth: null });
        
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}
run();
