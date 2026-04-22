// Defensive Intel Endpoint
// GET /api/defensive-intel?asin=XYZ
// Returns deterministic mock data for the Defensive Command Center

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { asin } = req.query;
  if (!asin) return res.status(400).json({ error: 'ASIN required' });

  // Generate deterministic hash for the ASIN
  const asinHash = asin.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Calculate Shield Score (opposite of Apex Vulnerability)
  let baseScore = 65 + (asinHash % 30); // 65 to 94
  const shieldScore = Math.max(0, Math.min(100, baseScore));

  const color = shieldScore >= 80 ? 'green' : shieldScore >= 60 ? 'yellow' : 'red';

  // Threats Generation
  const threats = [];
  const threatTypes = [];

  // Threat 1: Buy Box Hijacker (Critical)
  if (asinHash % 5 === 0) {
    threatTypes.push({
      type: 'critical',
      title: 'Buy Box Hijacker Detected',
      message: `Unauthorized seller 'Direct Fulfillment LLC' detected offering FBM at 15% below your price. Immediate risk of losing the Buy Box. File a trademark violation via Brand Registry.`
    });
  }

  // Threat 2: Review Sabotage (Critical)
  if (asinHash % 7 === 0) {
    threatTypes.push({
      type: 'critical',
      title: 'Potential Review Sabotage',
      message: `Anomalous velocity detected: 4 one-star reviews posted in the last 48 hours mentioning "fake". High probability of a coordinated black-hat attack. Open a high-priority Seller Support ticket.`
    });
  }

  // Threat 3: Keyword Siphoning (Warning)
  if (shieldScore < 85 && asinHash % 2 === 0) {
    threatTypes.push({
      type: 'warning',
      title: 'Active Keyword Siphoning',
      message: `Competitor B0${(asinHash * 7).toString(16).toUpperCase().substring(0, 8)} launched an aggressive Sponsored Video ad targeting your brand name, siphoning ~${8 + (asinHash % 5)}% of top-of-funnel traffic.`
    });
  }

  // Threat 4: Category Margin Compression (Warning)
  if (asinHash % 3 === 0) {
    threatTypes.push({
      type: 'warning',
      title: 'Margin Compression Risk',
      message: `The top 10 competitors in your subcategory dropped their average price by 18% over the last 14 days. Consider a temporary 5% coupon to defend your BSR.`
    });
  }

  // Threat 6: Apex Siphon Vulnerability (Warning)
  if (shieldScore < 70) {
    threatTypes.push({
      type: 'warning',
      title: 'Apex Differentiation Vulnerability',
      message: `Your Defensive Shield Score dropped. Three competitors recently added a complementary accessory to their bundles. Source a complementary item to defend your differentiation angle.`
    });
  }

  // Ensure at least one threat is shown if score is below 80, but limit to max 2-3 to avoid overwhelming
  if (threatTypes.length === 0 && shieldScore < 80) {
    threatTypes.push({
      type: 'warning',
      title: 'Active Keyword Siphoning',
      message: `Competitor B0${(asinHash * 7).toString(16).toUpperCase().substring(0, 8)} launched an aggressive Sponsored Video ad targeting your brand name, siphoning ~${8 + (asinHash % 5)}% of top-of-funnel traffic.`
    });
  }

  // Pick up to 2 threats
  for (let i = 0; i < Math.min(2, threatTypes.length); i++) {
    threats.push(threatTypes[i]);
  }

  // Review Intelligence
  const complaints = [
    "Material feels flimsy compared to previous versions.",
    "Hinges broke after 3 months of use.",
    "The color fades quickly in sunlight.",
    "Hard to clean, the crevices trap dirt.",
    "Battery life is shorter than advertised.",
    "Instructions were extremely confusing."
  ];
  
  const selectedComplaint = complaints[asinHash % complaints.length];
  const complaintPct = 15 + (asinHash % 25);
  
  const reviewIntel = {
    summary: `Warning: ${complaintPct}% of recent 3-star reviews mention a specific structural issue.`,
    insight: selectedComplaint,
    action: `Implement a design fix immediately. Competitors routinely use review scraping to identify these flaws and launch "New & Improved" variations to siphon your sales.`
  };

  // Listing Audit
  const audit = [
    {
      check: 'Gallery Images',
      status: (asinHash % 3) === 0 ? 'Warning' : 'Pass',
      detail: (asinHash % 3) === 0 ? 'Only 5/7 slots used. Add lifestyle images.' : '7/7 slots fully optimized.'
    },
    {
      check: 'A+ Content Depth',
      status: shieldScore < 75 ? 'Fail' : 'Pass',
      detail: shieldScore < 75 ? 'Missing comparison modules. Vulnerable to cross-selling.' : 'Robust A+ content structure.'
    },
    {
      check: 'Video Demonstration',
      status: (asinHash % 2) === 0 ? 'Pass' : 'Fail',
      detail: (asinHash % 2) === 0 ? 'High-converting video active.' : 'No video present. Leaves conversion on the table.'
    }
  ];

  return res.status(200).json({
    asin,
    shieldScore,
    color,
    threats,
    reviewIntel,
    audit,
    lastScanned: Date.now()
  });
}
