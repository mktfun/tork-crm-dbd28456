const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Mktfunil8563*@db.jaouwhckqqnaxqyfvgyq.supabase.co:5432/postgres',
});

async function run() {
    await client.connect();

    console.log("--- COLUNAS DE CRM_STAGES ---");
    const res = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'crm_stages'
  `);
    res.rows.forEach(r => console.log(r.column_name));

    console.log("\n--- COLUNAS DE CRM_PIPELINES ---");
    const res2 = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'crm_pipelines'
  `);
    res2.rows.forEach(r => console.log(r.column_name));

    await client.end();
}
run();
