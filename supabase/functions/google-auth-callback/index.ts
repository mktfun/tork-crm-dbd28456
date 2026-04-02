import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
// This should match the redirect URI configured in Google Cloud
const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || 'http://localhost:54321/functions/v1/google-auth-callback';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:8080';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // State contains auth token or user id
    
    if (!code) {
      if (req.method === 'POST') {
        const body = await req.json();
        return new Response(JSON.stringify({ error: 'Code not provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return Response.redirect(`${FRONTEND_URL}/settings/integrations?error=no_code`);
    }

    // Exchange auth code for access token & refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Error exchanging code:', tokenData);
      return Response.redirect(`${FRONTEND_URL}/settings/integrations?error=exchange_failed`);
    }

    // We need user context. If this is a redirect, we passed user_id in state, or the UI is calling us via POST
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId = '';
    
    if (req.method === 'POST') {
      const authHeader = req.headers.get('Authorization')!;
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      userId = user.id;
    } else {
      // In redirect mode, state is passed. We assume state = user.id for simplicity
      // In production, this should be a signed JWT or secure session token.
      userId = state || '';
      if (!userId) {
        return Response.redirect(`${FRONTEND_URL}/settings/integrations?error=no_user_context`);
      }
    }

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);

    // Save tokens
    const { error: dbError } = await supabase
      .from('google_sync_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expiry: expiryDate.toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (dbError) {
      console.error("DB error saving tokens:", dbError);
      if (req.method === 'GET') {
        return Response.redirect(`${FRONTEND_URL}/settings/integrations?error=db_error`);
      }
      throw dbError;
    }

    if (req.method === 'GET') {
      return Response.redirect(`${FRONTEND_URL}/settings/integrations?success=connected`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Callback error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
