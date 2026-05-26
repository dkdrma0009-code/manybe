// Supabase Edge Function: instagram-auth
// Exchanges Facebook OAuth auth code for an Instagram access token,
// fetches account info, and saves to social_channels.
//
// Required secrets (set via `supabase secrets set`):
//   FACEBOOK_APP_ID
//   FACEBOOK_APP_SECRET
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const APP_ID     = Deno.env.get('FACEBOOK_APP_ID')!;
const APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const { code, redirectUri, userId } = await req.json();
    if (!code || !redirectUri || !userId) {
      return json({ error: 'code, redirectUri, userId required' }, 400);
    }

    // 1. Exchange code → short-lived access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `client_id=${APP_ID}&client_secret=${APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`,
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) return json({ error: tokenData.error.message }, 400);
    const shortToken: string = tokenData.access_token;

    // 2. Exchange → long-lived token
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${APP_ID}` +
      `&client_secret=${APP_SECRET}&fb_exchange_token=${shortToken}`,
    );
    const longData = await longRes.json();
    const accessToken: string = longData.access_token ?? shortToken;

    // 3. Get Instagram Business account linked to this Facebook token
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account&access_token=${accessToken}`,
    );
    const igData = await igRes.json();
    const igAccount = igData.data?.find((p: any) => p.instagram_business_account);
    if (!igAccount) {
      return json({ error: 'instagram_no_business_account' }, 400);
    }

    const igId: string = igAccount.instagram_business_account.id;

    // 4. Fetch Instagram account details
    const detailRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?` +
      `fields=username,name,followers_count,media_count,account_type&access_token=${accessToken}`,
    );
    const detail = await detailRes.json();
    if (detail.error) return json({ error: detail.error.message }, 400);

    // Verify Business or Creator account
    if (!['BUSINESS', 'MEDIA_CREATOR'].includes(detail.account_type)) {
      return json({ error: 'instagram_personal_account' }, 400);
    }

    // 5. Save to social_channels
    const { error: dbErr } = await supabase.from('social_channels').upsert({
      user_id: userId,
      platform: 'instagram',
      channel_id: igId,
      channel_name: detail.name ?? detail.username,
      channel_url: `https://instagram.com/${detail.username}`,
      handle: detail.username,
      subscriber_count: detail.followers_count ?? 0,
      view_count: 0,
      video_count: detail.media_count ?? 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });

    if (dbErr) return json({ error: dbErr.message }, 500);

    return json({
      username: detail.username,
      followers: detail.followers_count ?? 0,
      accountType: detail.account_type,
    });
  } catch (err) {
    console.error('instagram-auth error:', err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
