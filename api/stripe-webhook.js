// Stripe webhook handler
// Listens for checkout.session.completed and customer.subscription.deleted
// Marks users as Pro in Supabase profiles table

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function verifyStripeSignature(payload, signature, secret) {
  // Manual Stripe signature verification (no SDK needed)
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, val] = part.split('=');
    acc[key] = val;
    return acc;
  }, {});

  const timestamp = parts.t;
  const sig       = parts.v1;
  if (!timestamp || !sig) return false;

  const signedPayload = `${timestamp}.${payload}`;

  // Use Web Crypto API (available in Vercel Edge/Node)
  const enc     = new TextEncoder();
  const keyData = enc.encode(secret);
  const msgData = enc.encode(signedPayload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const computed = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // Timing-safe comparison
  if (computed.length !== sig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return mismatch === 0;
}

async function setUserPro(userId, isPro, supabaseUrl, supabaseKey) {
  // Upsert into profiles table
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      id:         userId,
      is_pro:     isPro,
      updated_at: new Date().toISOString()
    })
  });
  if (!response.ok) {
    const err = await response.text();
    console.error('Supabase profile update error:', err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_URL    = process.env.SUPABASE_URL;
  const SUPABASE_KEY    = process.env.SUPABASE_ANON_KEY;

  if (!WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  const rawBody   = await getRawBody(req);
  const payload   = rawBody.toString('utf8');
  const signature = req.headers['stripe-signature'];

  const valid = await verifyStripeSignature(payload, signature, WEBHOOK_SECRET);
  if (!valid) {
    console.error('Invalid Stripe signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(payload);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId  = session.metadata?.userId;
      if (userId) {
        await setUserPro(userId, true, SUPABASE_URL, SUPABASE_KEY);
        console.log('Marked user as Pro:', userId);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId       = subscription.metadata?.userId;
      if (userId) {
        await setUserPro(userId, false, SUPABASE_URL, SUPABASE_KEY);
        console.log('Revoked Pro for user:', userId);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Handler error' });
  }
}
