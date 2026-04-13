import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';

export async function refreshGoogleToken(refreshToken: string) {
  const url = 'https://oauth2.googleapis.com/token';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to refresh Google token:', errorBody);
    throw new Error('Failed to refresh Google token');
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in, // in seconds
    // Sometimes refresh_token is also returned if the old one expires
    refresh_token: data.refresh_token || refreshToken,
  };
}

// Function to safely check and refresh token from DB for a given user
export async function getValidGoogleToken(supabase: any, userId: string) {
  const { data: tokenData, error } = await supabase
    .from('google_sync_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !tokenData) {
    return null;
  }

  const expiryDate = new Date(tokenData.token_expiry);
  const now = new Date();
  
  // If token expires in less than 5 minutes, refresh it
  if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      console.log(`Refreshing Google token for user ${userId}`);
      const refreshed = await refreshGoogleToken(tokenData.refresh_token);
      
      const newExpiry = new Date();
      newExpiry.setSeconds(newExpiry.getSeconds() + refreshed.expires_in);
      
      const { error: updateError } = await supabase
        .from('google_sync_tokens')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          token_expiry: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
        
      if (updateError) {
        console.error('Failed to save refreshed token:', updateError);
      }
      
      return refreshed.access_token;
    } catch (e) {
      console.error('Failed to obtain new access token:', e);
      return null;
    }
  }

  return tokenData.access_token;
}
