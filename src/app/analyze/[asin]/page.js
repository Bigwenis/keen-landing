"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function AnalyzePage() {
  const params = useParams();
  const currentAsin = params?.asin;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mocks for true margin calculator
  const [sellingPrice, setSellingPrice] = useState(39.99);
  const [fbaFee, setFbaFee] = useState(5.21); // E.g., large standard Size Tier
  const [referralFee, setReferralFee] = useState(6.00); // 15%
  const [cogs, setCogs] = useState(9.50); // Alibaba mock

  useEffect(() => {
    if (!currentAsin) return;
    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:3000/api/blueprint/${currentAsin}`);
        const json = await res.json();
        setData(json);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }
    fetchData();
  }, [currentAsin]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--text-3)' }}>
        Generating Blueprint...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--red)' }}>
        Failed to pull intelligence radar.
      </div>
    );
  }

  const badgeColorClass = `apex-${data.color}`;
  const netMargin = sellingPrice - fbaFee - referralFee - cogs;
  const netMarginPct = (netMargin / sellingPrice) * 100;

  return (
    <main style={{ padding: '60px 40px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Keen Differentiation Blueprint
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Target: {currentAsin}</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '4px' }}>Apex Vulnerability</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: `var(--${data.color})` }}>{data.apexScore}/100</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Left Col: Blueprint Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
             <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Execution Angle</h2>
             <p style={{ color: 'var(--text-2)', lineHeight: 1.6, fontSize: '15px' }}>
               {data.blueprint.siphonAngle}
             </p>
          </div>

          <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '16px', padding: '24px' }}>
             <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: 'var(--accent)' }}>Structural Must-Fix</h2>
             <p style={{ color: 'var(--text-1)', lineHeight: 1.6, fontSize: '15px', fontWeight: 600 }}>
               {data.blueprint.mustFix}
             </p>
             <p style={{ color: 'var(--text-3)', marginTop: '12px', fontSize: '13px' }}>
               Note: Applying this wedge will systematically siphon ~18% conversion share over 60 days based on similar category attacks.
             </p>
          </div>

        </div>

        {/* Right Col: Sourcing Bridge */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '6px 12px', background: 'rgba(56, 189, 248, 0.1)', borderBottomLeftRadius: '16px', color: 'var(--accent)', fontSize: '10px', fontWeight: 800 }}>PRO TIER</div>

          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Alibaba Sourcing Bridge</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '24px' }}>Calculate exact TRUE margins by stress-testing Alibaba COGS against live Amazon FBA fees.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)' }}>Target Selling Price</label>
                <span style={{ fontWeight: 800 }}>${sellingPrice.toFixed(2)}</span>
              </div>
              <input type="range" min="10" max="150" step="1" value={sellingPrice} onChange={e => {
                setSellingPrice(Number(e.target.value));
                setReferralFee(Number(e.target.value) * 0.15);
              }} style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)' }}>Alibaba Sourcing COGS</label>
                <span style={{ fontWeight: 800, color: 'var(--red)' }}>-${cogs.toFixed(2)}</span>
              </div>
              <input type="range" min="1" max="50" step="0.5" value={cogs} onChange={e => setCogs(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--red)' }} />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-2)' }}>FBA Fulfillment Fee (Lock)</span>
                <span style={{ color: 'var(--red)' }}>-${fbaFee.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-2)' }}>Referral Fee (15%)</span>
                <span style={{ color: 'var(--red)' }}>-${referralFee.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>True Profit Extrapolated</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: netMarginPct >= 20 ? 'var(--green)' : 'var(--yellow)' }}>${netMargin.toFixed(2)}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-3)', fontWeight: 600 }}>{netMarginPct.toFixed(1)}% Net Margin</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
