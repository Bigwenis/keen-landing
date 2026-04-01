export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { asin, price, bsr, reviews, rating, sellers, category, rootCategory, categoryPath, title, timestamp } = req.body;

  if (!asin || !timestamp) {
    return res.status(400).json({ error: 'asin and timestamp required' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        asin,
        price:         typeof price === 'number'   ? price   : null,
        bsr:           typeof bsr === 'number'     ? bsr     : null,
        reviews:       typeof reviews === 'number' ? reviews : null,
        rating:        typeof rating === 'number'  ? rating  : null,
        sellers:       typeof sellers === 'number' ? sellers : null,
        category:      category      || null,
        root_category: rootCategory  || null,
        category_path: categoryPath  || null,
        title:         title         || null,
        timestamp
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase error:', err);
      return res.status(500).json({ error: 'Failed to save snapshot', detail: err, url: SUPABASE_URL ? 'set' : 'missing', key: SUPABASE_ANON_KEY ? 'set' : 'missing' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
