// Stripe Checkout Mock API
// POST /api/create-checkout
// Body: { email: 'user@example.com', userId: 'user_uuid' }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, userId } = req.body;
  
  if (!email || !userId) {
    return res.status(400).json({ error: 'Missing user details' });
  }

  // NOTE: In production, this would initialize the Stripe SDK with process.env.STRIPE_SECRET_KEY
  // and call stripe.checkout.sessions.create({...})
  
  // Since we are validating the flow for Phase 1 Demo:
  console.log(`[MOCK STRIPE] Generating checkout for ${email} (User: ${userId})`);

  // We immediately "upgrade" the user in Supabase by setting is_pro = true
  // This requires the Supabase Service Role Key for Admin access (using Anon for mock purposes)
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ssojvbsrbbcxebadphiz.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2p2YnNyYmJjeGViYWRwaGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDg3MTcsImV4cCI6MjA5MDU4NDcxN30.-ch2RbedQOSWejvl_AJg_Hkeomwlf4_mwNQuVw2Roic';

  try {
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ is_pro: true })
    });

    if (!updateRes.ok) {
      console.error('Failed to update Supabase profile', await updateRes.text());
    } else {
      console.log('Successfully upgraded user to Pro in database');
    }
  } catch (err) {
    console.error('Network error updating profile', err);
  }

  // Return a redirect back to the dashboard with the success query parameter
  // For local testing, we fallback to relative path if host isn't available
  const domain = req.headers.host ? `http://${req.headers.host}` : '';
  const successUrl = `${domain}/dashboard.html?upgraded=1`;

  return res.status(200).json({
    url: successUrl
  });
}
