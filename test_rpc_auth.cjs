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
        
        // Find user with largest financial sum in March
        const userRes = await client.query(`
            SELECT user_id, SUM(total_amount) as s 
            FROM financial_transactions 
            WHERE transaction_date >= '2026-03-01' 
            GROUP BY user_id 
            ORDER BY 2 DESC 
            LIMIT 1
        `);
        const userId = userRes.rows[0].user_id;
        
        console.log("Using User ID:", userId);

        await client.query(`SET request.jwt.claims TO '{"sub":"${userId}", "role":"authenticated"}';`);
        await client.query(`SET ROLE authenticated`);
        
        const res = await client.query(`SELECT get_financial_summary('2026-03-01', '2026-03-31')`);
        console.dir(res.rows[0], { depth: null });
        
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}
run();
