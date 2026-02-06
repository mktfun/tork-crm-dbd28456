import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://jaouwhckqqnaxqyfvgyq.supabase.co'
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY not set")
    Deno.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("--- COLUNAS CRM_STAGES ---")
    // For security reasons, we can't query information_schema directly with JS client usually, 
    // but we can try to select one row and see keys if RLS allows, or just check known columns.
    // Best way via script is to check error or just infer.

    // Let's try to fetch one stage to see existing fields
    const { data, error } = await supabase
        .from('crm_stages')
        .select('*')
        .limit(1)

    if (error) {
        console.error("Error fetching stages:", error)
        return
    }

    if (data && data.length > 0) {
        console.log("Existing columns in returned data:", Object.keys(data[0]))
    } else {
        console.log("No stages found to infer columns.")
    }
}

run()
