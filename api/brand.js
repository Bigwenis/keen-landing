// Brand Intelligence endpoint
// GET /api/brand?brand=BrandName
// Returns all ASINs tracked for a brand with aggregated metrics and trends

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { brand } = req.query;
  if (!brand) return res.status(400).json({ error: 'brand required' });

  let searchBrand = brand;
  const isAsin = /^[A-Z0-9]{10}$/i.test(brand.trim());
  const SUPABASE_URL     = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    // If the input is an ASIN, fetch its brand first
    if (isAsin) {
      const asinRes = await fetch(
        `${SUPABASE_URL}/rest/v1/snapshots?asin=eq.${encodeURIComponent(brand.trim().toUpperCase())}&select=brand&limit=1`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (asinRes.ok) {
        const asinRows = await asinRes.json();
        if (asinRows.length > 0 && asinRows[0].brand) {
          searchBrand = asinRows[0].brand;
        } else {
          return res.status(404).json({ error: 'No data found for this ASIN' });
        }
      }
    }

    // Fetch all snapshots for this brand (case-insensitive via ilike)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/snapshots?brand=ilike.${encodeURIComponent(searchBrand)}&order=timestamp.asc&select=asin,price,bsr,reviews,rating,sellers,title,category,root_category,timestamp&limit=50000`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase error:', err);
      return res.status(500).json({ error: 'Failed to fetch brand data' });
    }

    const rows = await response.json();

    if (!rows.length) {
      return res.status(404).json({ error: 'No data found for this brand' });
    }

    // Group by ASIN
    const byAsin = {};
    for (const row of rows) {
      if (!byAsin[row.asin]) {
        byAsin[row.asin] = {
          asin:         row.asin,
          title:        row.title,
          category:     row.category,
          rootCategory: row.root_category,
          snapshots:    []
        };
      }
      if (row.title) byAsin[row.asin].title = row.title;
      byAsin[row.asin].snapshots.push(row);
    }

    const avg    = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const asins  = [];
    let totalSnapshotCount = 0;

    for (const [asin, data] of Object.entries(byAsin)) {
      const snaps   = data.snapshots;
      const first   = snaps[0];
      const latest  = snaps[snaps.length - 1];
      totalSnapshotCount += snaps.length;

      const prices  = snaps.filter(s => typeof s.price   === 'number').map(s => s.price);
      const bsrs    = snaps.filter(s => typeof s.bsr     === 'number').map(s => s.bsr);
      const reviews = snaps.filter(s => typeof s.reviews === 'number').map(s => s.reviews);
      const ratings = snaps.filter(s => typeof s.rating  === 'number').map(s => s.rating);

      // BSR trend
      const firstBsr  = snaps.find(s => typeof s.bsr === 'number');
      const latestBsr = [...snaps].reverse().find(s => typeof s.bsr === 'number');
      const bsrTrend  = (firstBsr && latestBsr && firstBsr !== latestBsr) ? {
        first:    firstBsr.bsr,
        current:  latestBsr.bsr,
        delta:    latestBsr.bsr - firstBsr.bsr,
        pctMove:  +((latestBsr.bsr - firstBsr.bsr) / firstBsr.bsr * 100).toFixed(1),
        improved: latestBsr.bsr < firstBsr.bsr
      } : null;

      // Price trend
      const firstPrice  = snaps.find(s => typeof s.price === 'number');
      const latestPrice = [...snaps].reverse().find(s => typeof s.price === 'number');
      const priceTrend  = (firstPrice && latestPrice && firstPrice !== latestPrice) ? {
        first:   firstPrice.price,
        current: latestPrice.price,
        delta:   +(latestPrice.price - firstPrice.price).toFixed(2)
      } : null;

      // Review velocity (reviews gained over tracked period)
      const firstReview  = snaps.find(s => typeof s.reviews === 'number');
      const latestReview = [...snaps].reverse().find(s => typeof s.reviews === 'number');
      let reviewVelocity = null;
      if (firstReview && latestReview && firstReview !== latestReview) {
        const daysTracked = Math.max(1, (latestReview.timestamp - firstReview.timestamp) / 86400000);
        const gained = latestReview.reviews - firstReview.reviews;
        reviewVelocity = {
          gained,
          perDay:  +(gained / daysTracked).toFixed(1),
          perWeek: +((gained / daysTracked) * 7).toFixed(0)
        };
      }

      // Calculate Apex Blueprint deterministically
      const asinHash = asin.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const fauxReviews = 10 + (asinHash % 2000);
      let score = 85; 
      if (fauxReviews > 1000) score = 40;
      else if (fauxReviews > 500) score = 65;
      else if (fauxReviews > 200) score = 82;
      else if (fauxReviews > 50) score = 92;
      else score = 98;
      const asinMod = asinHash % 25;
      score = Math.max(0, Math.min(100, score - 12 + asinMod));
      
      let color = 'red'; // 0-59
      if (score >= 80) color = 'green';
      else if (score >= 60) color = 'yellow';

      const siphonAngle = score >= 80 
        ? "High vulnerability detected. Competitor relies entirely on legacy rank without modern listing fundamentals." 
        : "Listing is entrenched. Proceed only if your Alibaba sourcing wedge allows for 30%+ margin suppression.";
      const mustFix = score >= 80 
        ? "Overhaul gallery images and introduce A+ content."
        : "Match existing A+ content depth and offer 20% price wedge.";
      
      // Procedural Mock Data for Product Cockpit 
      // 1. Listing Fundamentals Grade
      const listingScore = 40 + (asinHash % 55); 
      let listingGrade = 'C';
      if (listingScore >= 90) listingGrade = 'A';
      else if (listingScore >= 80) listingGrade = 'B';
      else if (listingScore < 60) listingGrade = 'D';

      const listingStatus = {
        grade: listingGrade,
        score: listingScore,
        images: 3 + (asinHash % 5), 
        hasVideo: (asinHash % 2) === 0,
        hasAplus: listingScore > 80,
        titleLength: 60 + (asinHash % 120),
        weakness: listingScore < 70 ? 'Missing A+ Content & Video' : 'Sub-optimal keyword density in bullets'
      };

      // 2. PPC Keyword Matrix
      const baseVol = 5000 + (asinHash * 10 % 25000);
      const ppcKeywords = [
        { term: 'main keyword target', volume: baseVol, cpc: +(0.8 + (asinHash % 150) / 100).toFixed(2), competition: 'High' },
        { term: 'secondary longtail search', volume: Math.round(baseVol * 0.4), cpc: +(0.4 + (asinHash % 80) / 100).toFixed(2), competition: 'Medium' },
        { term: 'bundle specific term', volume: Math.round(baseVol * 0.15), cpc: +(0.2 + (asinHash % 40) / 100).toFixed(2), competition: 'Low' }
      ];

      // 3. Bundle Architects
      const ideasPool = ["Vacuum Sealer Pump", "Premium Silicone Lids", "Travel Case", "Cleaning Brush Kit", "Magnetic Attachments", "Heavy-Duty Handles", "Replacement Filters", "Gift Box Setup"];
      const bundleIdeas = [
        { 
          product: ideasPool[asinHash % ideasPool.length], 
          velocity: 1500 + (asinHash % 3000), 
          logic: "Connected product with high standalone search volume. Visually separates listing." 
        },
        { 
          product: ideasPool[(asinHash + 3) % ideasPool.length], 
          velocity: 800 + (asinHash % 1500), 
          logic: "Low-cost Alibaba sourcing add-on that boosts perceived retail value by $8." 
        }
      ];

      asins.push({
        asin,
        title:         data.title,
        category:      data.category,
        rootCategory:  data.rootCategory,
        snapshotCount: snaps.length,
        firstSeen:     first.timestamp,
        lastSeen:      latest.timestamp,
        blueprint: {
          apexScore: score,
          color,
          mustFix,
          siphonAngle
        },
        cockpit: {
          listing: listingStatus,
          ppc: ppcKeywords,
          bundles: bundleIdeas
        },
        current: {
          price:   typeof latest.price   === 'number' ? latest.price   : null,
          bsr:     typeof latest.bsr     === 'number' ? latest.bsr     : null,
          reviews: typeof latest.reviews === 'number' ? latest.reviews : null,
          rating:  typeof latest.rating  === 'number' ? latest.rating  : null,
          sellers: typeof latest.sellers === 'number' ? latest.sellers : null
        },
        averages: {
          price:  prices.length  ? +avg(prices).toFixed(2)        : null,
          bsr:    bsrs.length    ? Math.round(avg(bsrs))          : null,
          rating: ratings.length ? +avg(ratings).toFixed(2)       : null
        },
        trends: {
          bsr:     bsrTrend,
          price:   priceTrend,
          reviews: reviewVelocity
        }
      });
    }

    // Sort by current BSR (best rank first)
    asins.sort((a, b) => {
      const aBsr = a.current.bsr || 9999999;
      const bBsr = b.current.bsr || 9999999;
      return aBsr - bBsr;
    });

    // Brand-level summary
    const allCurrentPrices  = asins.map(a => a.current.price).filter(v => typeof v === 'number');
    const allCurrentBsr     = asins.map(a => a.current.bsr).filter(v => typeof v === 'number');
    const allCurrentReviews = asins.map(a => a.current.reviews).filter(v => typeof v === 'number');

    const climbingAsins  = asins.filter(a => a.trends.bsr && a.trends.bsr.improved);
    const decliningAsins = asins.filter(a => a.trends.bsr && !a.trends.bsr.improved);

    return res.status(200).json({
      brand: searchBrand,
      asinCount: asins.length,
      totalSnapshotCount,
      summary: {
        price: allCurrentPrices.length ? {
          min: +Math.min(...allCurrentPrices).toFixed(2),
          max: +Math.max(...allCurrentPrices).toFixed(2),
          avg: +avg(allCurrentPrices).toFixed(2)
        } : null,
        bsr: allCurrentBsr.length ? {
          best:  Math.min(...allCurrentBsr),
          worst: Math.max(...allCurrentBsr),
          avg:   Math.round(avg(allCurrentBsr))
        } : null,
        totalReviews: allCurrentReviews.length ? allCurrentReviews.reduce((a, b) => a + b, 0) : null,
        climbingCount:  climbingAsins.length,
        decliningCount: decliningAsins.length
      },
      asins,
      generatedAt: Date.now()
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
