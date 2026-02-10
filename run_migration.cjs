const fs = require('fs');
const { Client } = require('pg');
const dns = require('dns');

// Forçar IPv4
dns.setDefaultResultOrder('ipv4first');

const sql = fs.readFileSync('supabase/migrations/20260210100000_accounting_abstraction_layer.sql', 'utf8');

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
        console.log('Conectado ao banco.');
        await client.query(sql);
        console.log('SUCCESS: Migration executada com sucesso!');
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await client.end();
    }
}

run();
