const fs = require('fs');
const { Client } = require('pg');
const dns = require('dns');

// Forçar IPv4
dns.setDefaultResultOrder('ipv4first');

const filePath = process.argv[2];
if (!filePath) {
  console.error('ERROR: É necessário passar o caminho do arquivo SQL como argumento.');
  process.exit(1);
}

const sql = fs.readFileSync(filePath, 'utf8');

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
        console.log(`SUCCESS: Migration ${filePath} executada com sucesso!`);
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}

run();
