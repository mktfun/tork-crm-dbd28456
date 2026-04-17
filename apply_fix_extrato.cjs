const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    host: 'db.jaouwhckqqnaxqyfvgyq.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Mktfunil8563*',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/20260417154500_fix_unbanked_transactions_extrato.sql'), 'utf-8');
        await client.query(sql);
        console.log("Migration de banco aplicada com sucesso (get_bank_transactions atualizado)!");
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}
run();
