// GET /api/amazon-auth?userId=...
// Mocks the Amazon OAuth callback and updates Supabase via REST API

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.redirect('/dashboard?error=missing_user');
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  // If we don't have Supabase credentials locally, we just mock success
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('[amazon-auth mock] Missing Supabase keys. Redirecting with success.');
    return res.redirect('/dashboard?amazon_linked=1');
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ amazon_connected: true })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase update error:', errorText);
      return res.redirect('/dashboard?error=amazon_link_failed');
    }

    return res.redirect('/dashboard?amazon_linked=1');
  } catch (err) {
    console.error('Amazon Auth error:', err);
    return res.redirect('/dashboard?error=amazon_link_failed');
  }
}
