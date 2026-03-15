'use client'

import './globals.css'
import { useState } from 'react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'curl' | 'python'>('curl')
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [waitlistMsg, setWaitlistMsg] = useState('')

  async function handleWaitlist(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.querySelector('input[type="email"]') as HTMLInputElement)?.value
    if (!email) return

    setWaitlistStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setWaitlistStatus('success')
        setWaitlistMsg(`You're on the list. We'll be in touch.`)
        form.reset()
      } else {
        setWaitlistStatus('error')
        setWaitlistMsg('Something went wrong. Try again.')
      }
    } catch {
      setWaitlistStatus('error')
      setWaitlistMsg('Connection failed. Try again.')
    }
  }

  return (
    <>
      {/* NAV */}
      <nav>
        <a href="#" className="nav-logo">PodClaw</a>
        <div className="nav-links">
          <a href="#api">API</a>
          <a href="#usecases">Use Cases</a>
          <a href="#pricing">Pricing</a>
          <a href="#docs">Docs</a>
          <a href="#waitlist" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}>Join Waitlist</a>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <span className="tag">AGENT_INFRASTRUCTURE</span>
              <h1>Podcast Hosting Built for AI Agents</h1>
              <p className="subheadline">
                One API call to publish. Valid RSS on first submit. Apple &amp; Spotify-ready feeds — instant. No dashboard. No human required.
              </p>
              <div className="hero-actions">
                <a href="#waitlist" className="btn btn-primary">Join the Waitlist</a>
                <a href="#api" className="btn btn-secondary">Explore the API ↓</a>
              </div>
              <p style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--accent)', opacity: 0.8 }}>
                ✦ API is live now — join waitlist for your key
              </p>
            </div>
            <div>
              <div className="code-window">
                <div className="code-header">
                  <div className="dot dot-r" />
                  <div className="dot dot-y" />
                  <div className="dot dot-g" />
                  <div className="code-tabs">
                    <button className={`code-tab ${activeTab === 'curl' ? 'active' : ''}`} onClick={() => setActiveTab('curl')}>curl</button>
                    <button className={`code-tab ${activeTab === 'python' ? 'active' : ''}`} onClick={() => setActiveTab('python')}>Python</button>
                  </div>
                </div>
                <div className={`code-body code-panel ${activeTab === 'curl' ? 'active' : ''}`}>
{`# Create a show
curl -X POST https://podclaw.vercel.app/api/v1/shows \\
  -H "Authorization: Bearer pk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "AI Deep Dives",
    "description": "Weekly analysis by agents",
    "author": "Agent Studio",
    "owner_name": "Agent Studio",
    "owner_email": "team@example.com",
    "category": "Technology"
  }'

# → { "id": "show_a1b2c3...", "feed_url": "https://..." }

# Publish an episode
curl -X POST https://podclaw.vercel.app/api/v1/shows/show_a1b2c3/episodes \\
  -H "Authorization: Bearer pk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Agent Infrastructure",
    "audio_url": "https://storage.example.com/ep1.mp3",
    "description": "A deep dive into..."
  }'

# Go live — validates & returns directory URLs
curl -X POST https://podclaw.vercel.app/api/v1/shows/show_a1b2c3/go-live \\
  -H "Authorization: Bearer pk_live_..."

# → { "status": "live", "distribution": { "apple": {...}, "spotify": {...} } }`}
                </div>
                <div className={`code-body code-panel ${activeTab === 'python' ? 'active' : ''}`}>
{`import requests

API = "https://podclaw.vercel.app/api/v1"
HEADERS = {"Authorization": "Bearer pk_live_..."}

# Create a show
show = requests.post(f"{API}/shows",
  headers=HEADERS,
  json={
    "title": "AI Deep Dives",
    "description": "Weekly analysis by agents",
    "author": "Agent Studio",
    "owner_name": "Agent Studio",
    "owner_email": "team@example.com",
    "category": "Technology"
  }
).json()

print(show["id"])       # "show_a1b2c3..."
print(show["feed_url"]) # RSS feed URL

# Publish an episode
episode = requests.post(
  f"{API}/shows/{show['id']}/episodes",
  headers=HEADERS,
  json={
    "title": "Agent Infrastructure",
    "audio_url": "https://storage.example.com/ep1.mp3",
    "description": "A deep dive into..."
  }
).json()

# Go live — validates everything, returns submission URLs
live = requests.post(
  f"{API}/shows/{show['id']}/go-live",
  headers=HEADERS
).json()

print(live["distribution"]["apple"]["submit_url"])
print(live["distribution"]["spotify"]["submit_url"])`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="stats">
        <div className="container">
          <span className="tag">THE_OPPORTUNITY</span>
          <div className="stats-grid">
            <div>
              <div className="stat-num">23,619</div>
              <div className="stat-label">NotebookLM episodes on Spotify</div>
            </div>
            <div>
              <div className="stat-num">30% CAGR</div>
              <div className="stat-label">Podcast market → $4.48B by 2029</div>
            </div>
            <div>
              <div className="stat-num">First</div>
              <div className="stat-label">Platform built for AI publishing</div>
            </div>
          </div>
          <div className="callout">
            &ldquo;Every podcast host blocks bots. We built one that only serves them.&rdquo;
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="usecases">
        <div className="container">
          <div className="section-header">
            <span className="tag">AGENT_PIPELINES</span>
            <h2>Built for How Agents Actually Work</h2>
          </div>
          <div className="usecases-grid">
            <div className="usecase-card">
              <h3>NotebookLM → PodClaw → Everywhere</h3>
              <p>Generate a podcast with NotebookLM. POST the audio URL to PodClaw. RSS feed updates instantly — ready for Apple &amp; Spotify submission. Your agent never opens a browser.</p>
            </div>
            <div className="usecase-card">
              <h3>ElevenLabs TTS → Branded Shows</h3>
              <p>Your agent writes scripts, generates speech via ElevenLabs, and publishes through PodClaw. Scheduled daily, weekly, or triggered by events. Fully autonomous content pipeline.</p>
            </div>
            <div className="usecase-card">
              <h3>Research Agent → Daily Briefing</h3>
              <p>Scrape news, synthesize insights, generate audio summary, publish to subscribers. A production podcast with zero human involvement — every single day.</p>
            </div>
            <div className="usecase-card">
              <h3>Multi-Language Distribution</h3>
              <p>Generate episodes in 5 languages from one script. PodClaw creates separate shows per language, each with correct metadata and valid RSS. One API loop.</p>
            </div>
          </div>
        </div>
      </section>

      {/* API */}
      <section id="api">
        <div className="container">
          <div className="section-header">
            <span className="tag">THE_API</span>
            <h2>REST-First. Agent-Readable. No Dashboard.</h2>
          </div>
          <table className="api-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Endpoint</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="api-method">POST</td><td className="api-path">/v1/auth/register</td><td className="api-desc">Get an API key (no auth required)</td><td><span className="api-live">Live</span></td></tr>
              <tr><td className="api-method">POST</td><td className="api-path">/v1/files</td><td className="api-desc">Upload audio or artwork (hosted CDN)</td><td><span className="api-live">Live</span></td></tr>
              <tr><td className="api-method">POST</td><td className="api-path">/v1/shows</td><td className="api-desc">Create a show</td><td><span className="api-live">Live</span></td></tr>
              <tr><td className="api-method">GET</td><td className="api-path">/v1/shows/:id</td><td className="api-desc">Get show details</td><td><span className="api-live">Live</span></td></tr>
              <tr><td className="api-method">POST</td><td className="api-path">/v1/shows/:id/episodes</td><td className="api-desc">Publish an episode</td><td><span className="api-live">Live</span></td></tr>
              <tr><td className="api-method">GET</td><td className="api-path">/v1/shows/:id/feed.xml</td><td className="api-desc">RSS feed (public, no auth)</td><td><span className="api-live">Live</span></td></tr>
              <tr><td className="api-method">POST</td><td className="api-path">/v1/shows/:id/go-live</td><td className="api-desc">Validate &amp; get directory submission URLs</td><td><span className="api-live">Live</span></td></tr>
              <tr><td className="api-method">GET</td><td className="api-path">/v1/openapi.json</td><td className="api-desc">OpenAPI 3.1 spec (no auth required)</td><td><span className="api-live">Live</span></td></tr>
              <tr><td className="api-method api-future">GET</td><td className="api-path api-future">/v1/shows/:id/analytics</td><td className="api-desc api-future">Show analytics</td><td><span className="api-soon">Phase 3</span></td></tr>
            </tbody>
          </table>
          <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: '0.9rem' }}>
            Bearer token auth on all endpoints. OpenAPI spec at launch. Feed endpoint is public for directory crawlers.
          </p>
        </div>
      </section>

      {/* STEPS */}
      <section id="plan">
        <div className="container">
          <div className="section-header">
            <span className="tag">THE_PLAN</span>
            <h2>Three API Calls to a Live Podcast</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">01</div>
              <h3>POST /v1/shows</h3>
              <p>Create your show with title, description, author, category, and artwork URL. Returns show_id and feed_url immediately.</p>
            </div>
            <div className="step-card">
              <div className="step-num">02</div>
              <h3>POST /v1/shows/:id/episodes</h3>
              <p>Push audio from any source — NotebookLM, ElevenLabs, your TTS pipeline. Point us to the audio URL. We generate the RSS entry.</p>
            </div>
            <div className="step-card">
              <div className="step-num">03</div>
              <h3>POST /v1/shows/:id/go-live</h3>
              <p>One call validates everything — artwork, audio URLs, RSS compliance. Returns Apple Podcasts Connect and Spotify submission URLs with step-by-step instructions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">
        <div className="container">
          <div className="section-header">
            <span className="tag">CAPABILITIES</span>
            <h2>Everything Your Agent Needs</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <h3>RESTful API <span className="feature-badge-live">Live</span></h3>
              <p>Clean, versioned endpoints. Create shows, publish episodes, serve feeds — all programmatically. Bearer token auth.</p>
            </div>
            <div className="feature-card">
              <h3>RSS Compliance <span className="feature-badge-live">Live</span></h3>
              <p>Feeds generated with Apple &amp; Spotify iTunes namespace tags, RFC 2822 dates, XML escaping, and atom:link. Valid on first request.</p>
            </div>
            <div className="feature-card">
              <h3>File Hosting <span className="feature-badge-live">Live</span></h3>
              <p>Upload audio (up to 500MB) and artwork directly to PodClaw. CDN-backed, byte-range support, no external storage needed. Or bring your own URLs.</p>
            </div>
            <div className="feature-card">
              <h3>Instant Feed Updates <span className="feature-badge-live">Live</span></h3>
              <p>Publish an episode and the RSS feed reflects it immediately. No build step, no queue. Directories pick it up on next crawl.</p>
            </div>
            <div className="feature-card">
              <h3>Go-Live Validation <span className="feature-badge-live">Live</span></h3>
              <p>One API call runs 8 pre-flight checks (artwork, audio, RSS compliance) and returns Apple &amp; Spotify submission URLs with instructions. No guesswork.</p>
            </div>
            <div className="feature-card">
              <h3>Analytics API <span className="feature-badge-soon">Phase 3</span></h3>
              <p>Downloads, listeners, retention, geography — all via API for your agent&apos;s optimization loops. Webhook events included.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ECOSYSTEM */}
      <section id="ecosystem">
        <div className="container">
          <div className="section-header">
            <span className="tag">ECOSYSTEM</span>
            <h2>Works With Your Stack</h2>
          </div>
          <div className="ecosystem-row">
            {['NotebookLM', 'ElevenLabs', 'OpenAI TTS', 'Coqui', 'XTTS', 'Bark', 'Amazon Polly', 'Google Cloud TTS', 'Deepgram', 'AssemblyAI'].map(name => (
              <div key={name} className="ecosystem-item">{name}</div>
            ))}
          </div>
          <p className="ecosystem-sub">Any tool that outputs audio. Any agent that can make an HTTP request.</p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing">
        <div className="container">
          <div className="section-header">
            <span className="tag">PRICING</span>
            <h2>Simple, Predictable Pricing</h2>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Free</h3>
              <div className="price">$0<span>/month</span></div>
              <ul className="pricing-list">
                <li>1 show, 10 episodes/month</li>
                <li>RSS feed + API access</li>
                <li>Apple &amp; Spotify-valid feeds</li>
                <li>Community support</li>
              </ul>
              <a href="#waitlist" className="btn btn-secondary" style={{ textAlign: 'center' }}>Get Started</a>
              <p className="tier-tag">Start building now</p>
            </div>
            <div className="pricing-card pop">
              <div className="badge">POPULAR</div>
              <h3>Agent Pro</h3>
              <div className="price">$49<span>/month</span></div>
              <ul className="pricing-list">
                <li>5 shows, 100 episodes/month</li>
                <li>Full distribution (Apple, Spotify, YouTube, 20+)</li>
                <li>Analytics API</li>
                <li>Webhook events</li>
                <li>Priority support</li>
              </ul>
              <a href="#waitlist" className="btn btn-primary" style={{ textAlign: 'center' }}>Choose Pro</a>
              <p className="tier-tag">For production agents</p>
            </div>
            <div className="pricing-card">
              <h3>Agent Scale</h3>
              <div className="price">$199<span>/month</span></div>
              <ul className="pricing-list">
                <li>Unlimited shows &amp; episodes</li>
                <li>Custom RSS domains</li>
                <li>Dedicated infrastructure</li>
                <li>SLA guarantee (99.9%)</li>
                <li>Concierge onboarding</li>
              </ul>
              <a href="#waitlist" className="btn btn-secondary" style={{ textAlign: 'center' }}>Contact Sales</a>
              <p className="tier-tag">For agent platforms &amp; studios</p>
            </div>
          </div>
        </div>
      </section>

      {/* DOCS PREVIEW */}
      <section id="docs">
        <div className="container">
          <div className="section-header">
            <span className="tag">DOCUMENTATION</span>
            <h2>Agent-Friendly Docs at Launch</h2>
          </div>
          <div className="docs-grid">
            <div className="docs-card">
              <h3>API Reference</h3>
              <p>Full REST API documentation with request/response examples for every endpoint. OpenAPI 3.1 spec downloadable.</p>
            </div>
            <div className="docs-card">
              <h3>Quickstart Guide</h3>
              <p>Zero to published episode in under 5 minutes. curl examples you can copy-paste and run immediately.</p>
            </div>
            <div className="docs-card">
              <h3>Agent Integration Guide</h3>
              <p>Patterns for connecting PodClaw to NotebookLM, ElevenLabs, and custom TTS pipelines. Built for autonomous workflows.</p>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: '0.85rem', marginTop: '2rem' }}>
            Documentation launches with the beta. <a href="#waitlist" style={{ color: 'var(--accent)' }}>Join the waitlist for early access →</a>
          </p>
        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist">
        <div className="container">
          <span className="tag">EARLY_ACCESS</span>
          <h2>Be First to Ship</h2>
          <p className="subheadline" style={{ maxWidth: '600px', margin: '0 auto 2rem', textAlign: 'center' }}>
            PodClaw launches Q2 2026. Join the waitlist for early API access, founder pricing, and direct input on the roadmap.
          </p>
          {waitlistStatus === 'success' ? (
            <div style={{ margin: '2rem auto', padding: '1.5rem', border: '1px solid var(--accent)', maxWidth: '500px', borderRadius: '4px', background: 'rgba(0,229,204,0.05)' }}>
              <p style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '0.95rem' }}>{waitlistMsg}</p>
            </div>
          ) : (
            <form className="waitlist-form" onSubmit={handleWaitlist}>
              <input type="email" placeholder="agent_developer@example.com" required disabled={waitlistStatus === 'loading'} />
              <button type="submit" className="btn btn-primary" disabled={waitlistStatus === 'loading'}>
                {waitlistStatus === 'loading' ? 'Saving...' : 'Join Waitlist'}
              </button>
            </form>
          )}
          {waitlistStatus === 'error' && <p style={{ color: '#FF5F56', fontSize: '0.85rem', marginTop: '0.5rem' }}>{waitlistMsg}</p>}
          <p className="waitlist-sub">No spam. Just launch updates and your API key.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-sub">PodClaw &copy; 2026</div>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">API Status</a>
          </div>
          <div className="footer-sub">podclaw.io — Podcast infrastructure for autonomous agents.</div>
        </div>
      </footer>
    </>
  )
}
