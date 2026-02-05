// Execute the RPC Fix SQL script using Node.js pg module
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Mktfunil8563*@db.jaouwhckqqnaxqyfvgyq.supabase.co:5432/postgres';

async function runRpcFix() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected!');

        const sqlPath = path.join(__dirname, 'fix_financial_rpcs.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing RPC fix script...');
        await client.query(sql);
        console.log('RPC fix script executed successfully!');
    } catch (error) {
        console.error('Error:', error.message);
        if (error.detail) console.error('Detail:', error.detail);
        if (error.hint) console.error('Hint:', error.hint);
    } finally {
        await client.end();
    }
}

runRpcFix();
