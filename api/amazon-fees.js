// GET /api/amazon-fees?asin=XYZ&price=19.99
// Returns deterministic mocked SP-API fees

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { asin, price } = req.query;
  if (!asin || !price) return res.status(400).json({ error: 'ASIN and price required' });

  const targetPrice = parseFloat(price);
  if (isNaN(targetPrice)) return res.status(400).json({ error: 'Invalid price' });

  // Generate deterministic hash for the ASIN to mock weight/size tiers
  const asinHash = asin.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Referral Fee is typically 15% in most categories
  const referralFee = targetPrice * 0.15;

  // Fulfillment Fee: Deterministically mock based on price and ASIN hash
  // Amazon FBA has tiers like $3.22, $3.86, $4.75, $5.40, etc.
  let fulfillmentFee = 3.22;
  if (targetPrice > 50 || asinHash % 4 === 0) {
    fulfillmentFee = 5.40 + (asinHash % 3); // Heavier / larger
  } else if (targetPrice > 20 || asinHash % 3 === 0) {
    fulfillmentFee = 4.75;
  } else if (targetPrice < 10) {
    fulfillmentFee = 3.22; // Small and light
  } else {
    fulfillmentFee = 3.86;
  }

  // Add a small deterministic variance to make it look hyper-realistic
  fulfillmentFee += (asinHash % 10) / 100;

  const totalFees = referralFee + fulfillmentFee;

  return res.status(200).json({
    asin,
    targetPrice,
    spApiData: {
      referralFee: Number(referralFee.toFixed(2)),
      fulfillmentFee: Number(fulfillmentFee.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      tier: fulfillmentFee > 5 ? 'Large Standard-Size' : 'Small Standard-Size',
      currency: 'USD'
    },
    fetchedAt: new Date().toISOString()
  });
}
