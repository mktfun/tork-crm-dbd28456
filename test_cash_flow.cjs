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
        
        console.log("=== CHECKING AUTH ID FOR CASH FLOW ===");
        const userRes = await client.query(`SELECT DISTINCT user_id FROM financial_transactions LIMIT 1`);
        const userId = userRes.rows[0].user_id;

        await client.query(`SET request.jwt.claims TO '{"sub":"${userId}", "role":"authenticated"}';`);
        await client.query(`SET ROLE authenticated`);
        
        const res = await client.query(`SELECT * FROM get_cash_flow_data('2026-03-01', '2026-03-31', 'month')`);
        console.table(res.rows);

        const res2 = await client.query(`SELECT * FROM get_cash_flow_data('2026-03-01', '2026-03-31', 'day')`);
        console.table(res2.rows);
        
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}
run();
