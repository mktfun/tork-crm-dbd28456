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
        
        const res = await client.query(`
            SELECT routine_definition 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
              AND routine_name = 'get_financial_summary'
        `);
        console.log("=== ACTUAL get_financial_summary RPC DEFINITION ===");
        console.log(res.rows[0]?.routine_definition || 'Not found');
        
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}
run();
