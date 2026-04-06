import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { getValidGoogleToken } from "../_shared/google-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Push new appointments to Google Calendar
async function pushAppointments(supabase: any, userId: string, accessToken: string) {
  // Find appointments where google_event_id is null
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .is('google_event_id', null)
    .limit(50); // limit batch size

  if (error || !appointments || appointments.length === 0) return 0;

  let pushed = 0;
  for (const app of appointments) {
    try {
      // Create date format that Google Calendar likes
      const startDateTime = new Date(`${app.date}T${app.time}-03:00`); // Assuming UTC-3 for Brasilia
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // +1 hour duration

      const event = {
        summary: app.title,
        description: app.notes || '',
        start: { dateTime: startDateTime.toISOString() },
        end: { dateTime: endDateTime.toISOString() },
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        const data = await response.json();
        await supabase
          .from('appointments')
          .update({
            google_event_id: data.id,
            google_synced_at: new Date().toISOString()
          })
          .eq('id', app.id);
        pushed++;
      }
    } catch (e) {
      console.error(`Error pushing appointment ${app.id}:`, e);
    }
  }
  return pushed;
}

// Push new tasks to Google Tasks
async function pushTasks(supabase: any, userId: string, accessToken: string) {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .is('google_task_id', null)
    .limit(50);

  if (error || !tasks || tasks.length === 0) return 0;

  let pushed = 0;
  for (const task of tasks) {
    try {
      const gTask = {
        title: task.title,
        notes: task.description || '',
        due: new Date(task.due_date).toISOString(),
        status: task.status === 'Concluída' ? 'completed' : 'needsAction'
      };

      const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gTask),
      });

      if (response.ok) {
        const data = await response.json();
        await supabase
          .from('tasks')
          .update({
            google_task_id: data.id,
            google_synced_at: new Date().toISOString()
          })
          .eq('id', task.id);
        pushed++;
      }
    } catch (e) {
      console.error(`Error pushing task ${task.id}:`, e);
    }
  }
  return pushed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active users to sync
    const { data: usersToSync, error } = await supabase
      .from('google_sync_tokens')
      .select('user_id, is_active')
      .eq('is_active', true);

    if (error) throw error;

    const results = [];

    for (const syncRecord of usersToSync) {
      const userId = syncRecord.user_id;
      const accessToken = await getValidGoogleToken(supabase, userId);
      
      if (!accessToken) {
        console.warn(`Could not get valid token for user ${userId}`);
        continue;
      }

      // 1. Push Appointments
      const pushedAppts = await pushAppointments(supabase, userId, accessToken);
      
      // 2. Push Tasks
      const pushedTasks = await pushTasks(supabase, userId, accessToken);

      // (Note: Pull from Google -> Supabase would be implemented here using syncToken)

      results.push({ userId, pushedAppts, pushedTasks });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Task error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
