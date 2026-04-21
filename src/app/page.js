"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [asin, setAsin] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (asin.trim() && asin.trim().length >= 10) {
      router.push(`/analyze/${asin.trim().toUpperCase()}`);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Arial, sans-serif' }}>
      {/* Hero Section */}
      <section style={{ padding: '100px 20px', textAlign: 'center', background: 'linear-gradient(135deg, #000, #111)' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px' }}>
          More data was never the problem. The problem is the moment before you commit: Should I launch this, or shouldn't I?
        </h1>
        <p style={{ fontSize: '24px', marginBottom: '40px' }}>
          Keen turns any Amazon listing into a 1–99 Apex Score, a plain-English brief, and an honest answer: build a brand around this, or keep looking.
        </p>
        <button style={{ padding: '15px 30px', fontSize: '18px', background: '#00f', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Install Free — Track 10 Products
        </button>
      </section>

      {/* The Problem Section */}
      <section style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>The Problem</h2>
        <p style={{ fontSize: '18px', maxWidth: '800px', margin: '0 auto' }}>
          Private label research got heavier, not sharper. You open ten tabs. You compare listings that all look the same. You chase an idea that seems promising — until you notice the reviews are thin, or a giant is already siphoning the profit.
        </p>
        <p style={{ fontSize: '18px', maxWidth: '800px', margin: '20px auto' }}>
          Every existing tool offered to fix this by giving you more data. More data was never the problem. The problem is the moment before you commit: Should I launch this, or shouldn't I? That moment is what Keen is built for.
        </p>
      </section>

      {/* What Keen Actually Does Section */}
      <section style={{ padding: '100px 20px' }}>
        <h2 style={{ fontSize: '36px', textAlign: 'center', marginBottom: '40px' }}>What Keen Actually Does</h2>
        <p style={{ fontSize: '18px', textAlign: 'center', marginBottom: '40px' }}>
          Click the Keen icon on any Amazon search result. In seconds, you get:
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: '300px', margin: '20px' }}>
            <h3>The Apex Score (1–99)</h3>
            <p>A category-weighted vulnerability index. We audit Review Decay to find top-sellers who are bleeding customer trust so you can strike.</p>
          </div>
          <div style={{ maxWidth: '300px', margin: '20px' }}>
            <h3>The Siphon Blueprint</h3>
            <p>A plain-English brief. Not a dashboard—an actual written read on what's weak, what's risky, and where a better brand takes share.</p>
          </div>
          <div style={{ maxWidth: '300px', margin: '20px' }}>
            <h3>The Defensive Shield</h3>
            <p>Don't just find a gap—keep it. Keen monitors your category 24/7. If a competitor fixes the "weakness" you used to beat them, we tell you immediately. Get alerts when your tracked ASIN's Apex Score drops by >15 points in 7 days. Run mandatory Shield Audits on restocks to ensure your specs stay ahead. Backend siphon detection compares your blueprint against new sub-category arrivals.</p>
          </div>
          <div style={{ maxWidth: '300px', margin: '20px' }}>
            <h3>Review Sentiment Tracker</h3>
            <p>We watch your reviews like a hawk. If your Apex Score drops because of a bad manufacturing batch, Keen tells you exactly what "Edge" you are losing before the 1-stars tank your rank.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', marginBottom: '40px' }}>Disruptor Pricing</h2>
        <p style={{ fontSize: '18px', marginBottom: '40px' }}>Precision over noise. Value over bloat.</p>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
          <div style={{ border: '1px solid #fff', padding: '20px', margin: '20px', maxWidth: '300px' }}>
            <h3>The Scout ($24/mo)</h3>
            <p>Unlimited Apex Score extension. The "no-brainer" for 80% of sellers.</p>
          </div>
          <div style={{ border: '1px solid #fff', padding: '20px', margin: '20px', maxWidth: '300px' }}>
            <h3>The Hunter ($49/mo)</h3>
            <p>10 Siphon Blueprints/mo + The Alibaba Sourcing Bridge.</p>
          </div>
          <div style={{ border: '1px solid #fff', padding: '20px', margin: '20px', maxWidth: '300px' }}>
            <h3>The Empire ($99/mo)</h3>
            <p>Unlimited Blueprints + Apex Architect (AI Listing Generator).</p>
          </div>
        </div>
        <p style={{ fontSize: '18px', marginTop: '40px' }}>
          The "Switch & Save" Credit: Show us a receipt for canceling a bloated competitor, and we'll give you 3 months of Keen for free.
        </p>
      </section>

      {/* Testimonial Section */}
      <section style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', marginBottom: '40px' }}>From One Operator to Another</h2>
        <blockquote style={{ fontSize: '18px', maxWidth: '800px', margin: '0 auto', fontStyle: 'italic' }}>
          "Keen was built by a private label seller who got stuck in the same research spiral as everyone else. Ten tabs. Three subscriptions. Still no answer. So I built the tool I wanted. The bet is simple: if it works for me, it works for the operators one step behind me, and the operators one step ahead."
        </blockquote>
        <p style={{ fontSize: '18px', marginTop: '20px' }}>— Bill, Founder</p>
      </section>

      {/* Brand Promise Section */}
      <section style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', marginBottom: '40px' }}>The Brand Promise</h2>
        <p style={{ fontSize: '24px' }}>Fewer tabs. Faster conviction. Defensive brand security.</p>
        <div style={{ marginTop: '40px' }}>
          <button style={{ padding: '15px 30px', fontSize: '18px', background: '#00f', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', margin: '10px' }}>
            Install Free
          </button>
          <button style={{ padding: '15px 30px', fontSize: '18px', background: '#f00', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', margin: '10px' }}>
            Join the Founding 500
          </button>
        </div>
      </section>

      {/* Search Form at Bottom */}
      <section style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', marginBottom: '40px' }}>Try It Now</h2>
        <form onSubmit={handleSearch} style={{ maxWidth: '600px', margin: '0 auto' }}>
          <input 
            type="text" 
            placeholder="Paste Amazon ASIN here..." 
            value={asin}
            onChange={(e) => setAsin(e.target.value)}
            style={{
              width: '100%',
              padding: '20px',
              fontSize: '18px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              marginBottom: '20px'
            }}
          />
          <button 
            type="submit" 
            disabled={!asin.trim()}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              background: asin.trim() ? '#00f' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: asin.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Analyze ASIN
          </button>
        </form>
      </section>
    </main>
  );
}
            position: 'absolute',
            right: '8px',
            top: '8px',
            bottom: '8px',
            padding: '0 24px',
            borderRadius: '10px',
            background: 'var(--accent)',
            color: '#000',
            fontWeight: 800,
            fontSize: '15px',
            border: 'none',
            cursor: asin.trim() ? 'pointer' : 'default',
            opacity: asin.trim() ? 1 : 0.5,
            transition: 'all 0.2s ease'
          }}
        >
          Analyze
        </button>
      </form>

      {/* Aesthetic grid blur backdrops */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'var(--accent)', filter: 'blur(300px)', opacity: 0.1, zIndex: -1, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'var(--green)', filter: 'blur(300px)', opacity: 0.05, zIndex: -1, pointerEvents: 'none' }} />

    </main>
  );
}
