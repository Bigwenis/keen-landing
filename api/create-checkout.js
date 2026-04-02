// Creates a Stripe Checkout session for Pro subscription
// POST /api/create-checkout
// Body: { email, userId }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://keen.technology');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, userId } = req.body;
  if (!email || !userId) return res.status(400).json({ error: 'email and userId required' });

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_PRICE_ID   = process.env.STRIPE_PRICE_ID;

  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        mode:                                 'subscription',
        'line_items[0][price]':               STRIPE_PRICE_ID,
        'line_items[0][quantity]':            '1',
        customer_email:                       email,
        'metadata[userId]':                   userId,
        'subscription_data[metadata][userId]': userId,
        success_url:                          'https://keen.technology/dashboard?upgraded=1',
        cancel_url:                           'https://keen.technology/dashboard',
        allow_promotion_codes:                'true'
      }).toString()
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Stripe error:', session);
      return res.status(500).json({ error: session.error?.message || 'Failed to create checkout session' });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
