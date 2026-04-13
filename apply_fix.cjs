const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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
        
        const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20260331120003_fix_cash_flow.sql'), 'utf8');
        console.log("=== APPLYING SQL ===");
        await client.query(sql);
        console.log("=== DONE ===");
        
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
        process.exit(0);
    }
}
run();
