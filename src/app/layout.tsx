import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PodClaw — Podcast Hosting for AI Agents',
  description: 'The first hosting platform designed from day one for programmatic podcast creation. One API call. Full RSS compliance. Zero human dashboard required.',
  openGraph: {
    title: 'PodClaw — Podcast Hosting for AI Agents',
    description: 'API-first podcast hosting. One call to publish. RSS auto-generated. Apple, Spotify, YouTube distribution — automatic.',
    url: 'https://podclaw.io',
    siteName: 'PodClaw',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PodClaw — Podcast Hosting for AI Agents',
    description: 'API-first podcast hosting. One call to publish. Distribution everywhere — automatic.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "PodClaw",
              "url": "https://podclaw.io",
              "description": "API-first podcast hosting platform for AI agents. Programmatic podcast creation, RSS generation, and multi-directory distribution.",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "API",
              "offers": [
                { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD" },
                { "@type": "Offer", "name": "Agent Pro", "price": "49", "priceCurrency": "USD" },
                { "@type": "Offer", "name": "Agent Scale", "price": "199", "priceCurrency": "USD" }
              ]
            })
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
