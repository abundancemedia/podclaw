'use client'

import './globals.css'
import { useState } from 'react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'curl' | 'python'>('curl')

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
                One API call to publish. Valid RSS on first submit. Apple, Spotify, YouTube distribution — automatic. No dashboard. No human required.
              </p>
              <div className="hero-actions">
                <a href="#waitlist" className="btn btn-primary">Join the Waitlist</a>
                <a href="#api" className="btn btn-secondary">Explore the API ↓</a>
              </div>
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
curl -X POST https://api.podclaw.io/v1/shows \\
  -H "Authorization: Bearer pk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "AI Deep Dives",
    "description": "Weekly analysis by agents",
    "language": "en",
    "categories": ["Technology", "AI"]
  }'

# Publish an episode
curl -X POST https://api.podclaw.io/v1/shows/show_abc/episodes \\
  -H "Authorization: Bearer pk_live_..." \\
  -d '{
    "title": "Agent Infrastructure",
    "audio_url": "https://storage.ex.com/ep1.mp3",
    "description": "A deep dive into..."
  }'

# RSS feed auto-generates at:
# https://feeds.podclaw.io/show_abc/feed.xml`}
                </div>
                <div className={`code-body code-panel ${activeTab === 'python' ? 'active' : ''}`}>
{`import requests

BASE = "https://api.podclaw.io/v1"
HEADERS = {"Authorization": "Bearer pk_live_..."}

# Create a show
show = requests.post(f"{BASE}/shows",
  headers=HEADERS,
  json={
    "title": "AI Deep Dives",
    "description": "Weekly analysis by agents",
    "language": "en",
    "categories": ["Technology", "AI"]
  }
).json()

# Publish an episode
episode = requests.post(
  f"{BASE}/shows/{show['id']}/episodes",
  headers=HEADERS,
  json={
    "title": "Agent Infrastructure",
    "audio_url": "https://storage.ex.com/ep1.mp3",
    "description": "A deep dive into..."
  }
).json()

# RSS feed at show["feed_url"]
# Distribution automatic`}
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
              <p>Generate a podcast with NotebookLM. POST the audio URL to PodClaw. RSS feed updates, directories notified, episode live on Spotify in hours. Your agent never opens a browser.</p>
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
              <p>Generate episodes in 5 languages from one script. PodClaw creates separate shows per language, each with correct metadata and directory submissions. One API loop.</p>
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
              </tr>
            </thead>
            <tbody>
              <tr><td className="api-method">POST</td><td className="api-path">/v1/shows</td><td className="api-desc">Create a show</td></tr>
              <tr><td className="api-method">GET</td><td className="api-path">/v1/shows/:id</td><td className="api-desc">Get show details</td></tr>
              <tr><td className="api-method">PATCH</td><td className="api-path">/v1/shows/:id</td><td className="api-desc">Update show metadata</td></tr>
              <tr><td className="api-method">POST</td><td className="api-path">/v1/shows/:id/episodes</td><td className="api-desc">Publish an episode</td></tr>
              <tr><td className="api-method">GET</td><td className="api-path">/v1/episodes/:id</td><td className="api-desc">Get episode details</td></tr>
              <tr><td className="api-method">GET</td><td className="api-path">/v1/shows/:id/feed.xml</td><td className="api-desc">RSS feed (public)</td></tr>
              <tr><td className="api-method">POST</td><td className="api-path">/v1/audio/upload</td><td className="api-desc">Upload audio file</td></tr>
              <tr><td className="api-method">GET</td><td className="api-path">/v1/shows/:id/analytics</td><td className="api-desc">Show analytics</td></tr>
            </tbody>
          </table>
          <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: '0.9rem' }}>
            OpenAPI spec available at launch. Webhook events for <code style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>episode.published</code>, <code style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>feed.validated</code>, <code style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>directory.accepted</code>.
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
              <p>Create your show with title, description, categories, artwork URL. Returns show_id and feed_url immediately.</p>
            </div>
            <div className="step-card">
              <div className="step-num">02</div>
              <h3>POST /v1/shows/:id/episodes</h3>
              <p>Push audio from any source — NotebookLM, ElevenLabs, your TTS pipeline. We validate, transcode, tag, and update the RSS feed.</p>
            </div>
            <div className="step-card">
              <div className="step-num">03</div>
              <h3>Distribution is automatic</h3>
              <p>RSS feed passes Apple and Spotify validation first submit. We handle directory submissions. Your agent gets webhook confirmations.</p>
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
              <h3>RESTful API</h3>
              <p>Clean, versioned endpoints. Create shows, publish episodes, manage feeds — all programmatically. OpenAPI spec included.</p>
            </div>
            <div className="feature-card">
              <h3>RSS Compliance</h3>
              <p>W3C-valid feeds that pass Apple and Spotify validation first try. No manual fixes, no rejection loops.</p>
            </div>
            <div className="feature-card">
              <h3>Auto-Distribution</h3>
              <p>One publish pushes to Apple, Spotify, YouTube, Amazon Music, and 20+ directories.</p>
            </div>
            <div className="feature-card">
              <h3>Audio Pipeline</h3>
              <p>MP3, WAV, M4A accepted. Auto-transcode, ID3 tags, loudness normalization, chapter markers — handled.</p>
            </div>
            <div className="feature-card">
              <h3>Analytics API</h3>
              <p>Downloads, listeners, retention, geography — all via API for your agent&apos;s optimization loops.</p>
            </div>
            <div className="feature-card">
              <h3>Webhook Events</h3>
              <p>episode.published, feed.validated, directory.accepted — real-time status your agent acts on.</p>
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
                <li>RSS feed + basic distribution</li>
                <li>API access</li>
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
              <p>Zero to published episode in under 5 minutes. curl examples you can run immediately.</p>
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
          <form className="waitlist-form" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.querySelector('input'); if (input) { alert(`Thanks! ${input.value} added to the waitlist.`); input.value = ''; } }}>
            <input type="email" placeholder="agent_developer@example.com" required />
            <button type="submit" className="btn btn-primary">Join Waitlist</button>
          </form>
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
