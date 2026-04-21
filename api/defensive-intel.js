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

  // Threats
  const threats = [];
  if (shieldScore < 70) {
    threats.push({
      type: 'critical',
      title: 'Active Siphon Detected',
      message: `Competitor B0${(asinHash * 7).toString(16).toUpperCase().substring(0, 8)} is capturing ~${12 + (asinHash % 15)}% of your branded search volume.`
    });
  }
  if (asinHash % 2 === 0) {
    threats.push({
      type: 'warning',
      title: 'Price Undercutting',
      message: `3 competitors in your sub-category dropped prices by >10% in the last 72 hours.`
    });
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
