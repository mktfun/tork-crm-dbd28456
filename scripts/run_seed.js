// Execute the seed SQL script using Node.js pg module
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Mktfunil8563*@db.jaouwhckqqnaxqyfvgyq.supabase.co:5432/postgres';

async function runSeed() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected!');

        const sqlPath = path.join(__dirname, 'seed_test_data.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing seed script...');
        await client.query(sql);
        console.log('Seed script executed successfully!');
    } catch (error) {
        console.error('Error:', error.message);
        if (error.detail) console.error('Detail:', error.detail);
    } finally {
        await client.end();
    }
}

runSeed();
